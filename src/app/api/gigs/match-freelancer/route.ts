import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { ProjectService } from '@/app/api/projects/services/project-service';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { UnifiedTaskService } from '@/lib/services/unified-task-service';
import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logProjectTransition, Subsystems } from '@/lib/log/transitions';

// Using hierarchical storage for gigs and project tasks
const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');
const ORGANIZATIONS_PATH = path.join(process.cwd(), 'data/organizations.json');
const USERS_PATH = path.join(process.cwd(), 'data/users.json');

async function handleGigMatching(req: Request) {
  try {
    // 🔒 Auth - get session and validate (commissioner only can match freelancers)
    const { userId: actorId } = await requireSession(req);

    const { applicationId, gigId, freelancerId } = await req.json();
    assert(applicationId && gigId && freelancerId, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: applicationId, gigId, freelancerId');

    // Read all necessary data files
    const [applicationsData, organizationsData, usersData] = await Promise.all([
      readFile(APPLICATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(ORGANIZATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(USERS_PATH, 'utf-8').then(data => JSON.parse(data))
    ]);

    // Find the gig and application
    const gig = await readGig(gigId);
    const application = applicationsData.find((a: any) => a.id === applicationId);

    assert(gig, ErrorCodes.NOT_FOUND, 404, 'Gig not found');
    assert(application, ErrorCodes.NOT_FOUND, 404, 'Application not found');

    // 🔒 Ensure session user is the commissioner who owns this gig
    const organization = organizationsData.find((org: any) => org.id === gig!.organizationId);
    assert(organization, ErrorCodes.NOT_FOUND, 404, 'Organization not found');
    assertOwnership(actorId, organization.contactPersonId, 'gig');

    // Additional validation guards
    assert(gig!.title && gig!.description, ErrorCodes.INVALID_INPUT, 400, 'Gig missing required fields (title, description)');
    assert(gig!.status === 'Available', ErrorCodes.OPERATION_NOT_ALLOWED, 409, 'Gig is no longer available');

    // Find contact person (manager) for the organization
    const manager = usersData.find((user: any) => user.id === organization.contactPersonId);
    assert(manager, ErrorCodes.NOT_FOUND, 404, 'Manager not found');

    // 🔒 Use ProjectService for secure gig acceptance
    let acceptResult;
    try {
      acceptResult = ProjectService.acceptGig({
        gig: gig! as any,
        freelancerId: Number(freelancerId),
        commissionerId: actorId,
      });
    } catch (serviceError: any) {
      throw Object.assign(new Error(serviceError.message || 'Cannot accept gig'), {
        code: ErrorCodes.OPERATION_NOT_ALLOWED,
        status: 400
      });
    }

    // Update gig status using the service result
    await updateGig(gigId, acceptResult.gigUpdate);

    // Update application status to accepted
    const updatedApplications = applicationsData.map((a: any) =>
      a.id === applicationId ? { ...a, status: 'accepted' } : a
    );

    // Save project using unified storage
    await UnifiedStorageService.saveProject({
      ...acceptResult.project,
      status: 'ongoing',
      invoicingMethod: acceptResult.project.invoicingMethod || 'completion',
      createdAt: acceptResult.project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Save tasks using unified storage with proper project creation date
    for (const task of acceptResult.tasks) {
      await UnifiedStorageService.saveTask({
        taskId: task.id,
        projectId: task.projectId,
        projectTitle: acceptResult.project.title,
        organizationId: acceptResult.project.organizationId || 0,
        projectTypeTags: acceptResult.project.tags || [],
        title: task.title,
        description: task.description || '',
        status: 'Ongoing',
        completed: false,
        order: task.order || 1,
        link: '',
        dueDate: task.dueDate,
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        createdDate: acceptResult.project.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }

    // Save application status update
    await writeFile(APPLICATIONS_PATH, JSON.stringify(updatedApplications, null, 2));

    // Log project creation
    logProjectTransition(
      acceptResult.project.projectId,
      undefined,
      'ongoing',
      actorId,
      Subsystems.GIGS_MATCH,
      {
        gigId: gigId,
        freelancerId: Number(freelancerId),
        applicationId: applicationId,
      }
    );

    // Create project activation notification for freelancer
    try {
      await eventLogger.logEvent({
        id: `project_activated_${acceptResult.project.projectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_activated',
        notificationType: NOTIFICATION_TYPES.PROJECT_ACTIVATED,
        actorId: actorId, // Commissioner who accepted
        targetId: Number(freelancerId), // Freelancer who gets notified
        entityType: ENTITY_TYPES.PROJECT,
        entityId: acceptResult.project.projectId,
        metadata: {
          projectTitle: acceptResult.project.title,
          gigTitle: gig!.title,
          taskCount: acceptResult.tasks.length,
          commissionerName: manager.name,
          organizationName: organization.name
        },
        context: {
          projectId: acceptResult.project.projectId,
          gigId: gigId,
          applicationId: applicationId
        }
      });

      console.log(`✅ Successfully sent project activation notification for project ${acceptResult.project.projectId}`);
    } catch (eventError) {
      console.error('Failed to log project activation event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    return NextResponse.json(
      ok({
        entities: {
          project: {
            projectId: acceptResult.project.projectId,
            title: acceptResult.project.title,
            status: acceptResult.project.status,
            freelancerId: acceptResult.project.freelancerId,
            commissionerId: acceptResult.project.commissionerId,
          },
          tasks: acceptResult.tasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            projectId: task.projectId,
          })),
        },
        message: 'Successfully matched with freelancer and created project',
        notificationsQueued: true,
      })
    );

  } catch (error) {
    console.error('Error matching with freelancer:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to match freelancer', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleGigMatching);
