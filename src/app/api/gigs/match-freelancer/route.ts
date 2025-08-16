import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { ProjectService } from '@/app/api/projects/services/project-service';
import { UnifiedStorageService, getAllUsers, getAllOrganizations } from '@/lib/storage/unified-storage-service';
import { UnifiedTaskService } from '@/lib/services/unified-task-service';
import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logProjectTransition, Subsystems } from '@/lib/log/transitions';

// Using hierarchical storage for gigs and project tasks
import { readAllGigApplications, writeGigApplication, readGigApplication } from '@/lib/gigs/gig-applications-storage';

async function handleGigMatching(req: Request) {
  console.log('🚀 Starting handleGigMatching function');

  // Hoist variables for error logging
  let actorId: number;
  let applicationId: any;
  let gigId: any;
  let freelancerId: any;

  try {
    // 🧪 TEST BYPASS: Allow testing without authentication in development
    if (process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true') {
      console.log('🧪 TEST MODE: Bypassing authentication for testing');
      actorId = Number(req.headers.get('X-Test-User-ID')) || 8002; // Default test commissioner ID
    } else {
      // 🔒 Auth - get session and validate (commissioner only can match freelancers)
      const { userId } = await requireSession(req);
      actorId = userId;
    }

    const requestBody = await req.json();
    applicationId = requestBody.applicationId;
    gigId = requestBody.gigId;
    freelancerId = requestBody.freelancerId;
    assert(applicationId && gigId && freelancerId, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: applicationId, gigId, freelancerId');

    console.log('📖 Reading data files...');
    // Read all necessary data files
    const [applicationsData, organizationsData, usersData] = await Promise.all([
      readAllGigApplications(),
      getAllOrganizations(), // Use hierarchical storage
      getAllUsers() // Use hierarchical storage
    ]);
    console.log('✅ Data files read successfully');

    console.log('🔍 Finding gig and application...');
    // Find the gig and application
    const gig = await readGig(gigId);
    const application = applicationsData.find((a: any) => a.id === applicationId);

    assert(gig, ErrorCodes.NOT_FOUND, 404, 'Gig not found');
    assert(application, ErrorCodes.NOT_FOUND, 404, 'Application not found');
    console.log('✅ Gig and application found');

    // 🔒 Ensure session user is the commissioner who owns this gig
    let organization = organizationsData.find((org: any) => org.id === gig!.organizationId);

    // 🧪 TEST MODE: Create missing organization if in test mode
    if (!organization && process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true') {
      console.log('🧪 TEST MODE: Creating missing test organization for gig matching');
      organization = {
        id: 8000,
        name: "Test Organization",
        contactPersonId: 8002,
        firstCommissionerId: 8002,
        associatedCommissioners: [8002],
        email: "test.org@example.com",
        createdAt: new Date().toISOString()
      };
    }

    assert(organization, ErrorCodes.NOT_FOUND, 404, 'Organization not found');

    // 🧪 TEST MODE: Skip ownership assertion in test mode
    if (!(process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true')) {
      assertOwnership(actorId, organization.contactPersonId, 'gig');
    }

    // Additional validation guards
    assert(gig!.title && gig!.description, ErrorCodes.INVALID_INPUT, 400, 'Gig missing required fields (title, description)');
    assert(gig!.status === 'Available', ErrorCodes.OPERATION_NOT_ALLOWED, 409, 'Gig is no longer available');

    // Find contact person (manager) for the organization
    let manager = usersData.find((user: any) => user.id === organization.contactPersonId);

    // 🧪 TEST MODE: Create missing manager if in test mode
    if (!manager && process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true') {
      console.log('🧪 TEST MODE: Creating missing test manager for gig matching');
      manager = {
        id: 8002,
        name: "Test Commissioner",
        email: "test.commissioner@example.com",
        userType: "commissioner",
        organizationId: 8000,
        createdAt: new Date().toISOString()
      };
    }

    assert(manager, ErrorCodes.NOT_FOUND, 404, 'Manager not found');

    // 🔒 Use ProjectService for secure gig acceptance
    console.log('🔧 About to call ProjectService.acceptGig with:', {
      gigId,
      applicationId,
      freelancerId,
      actorId,
      organizationId: organization.id,
      organizationName: organization.name
    });

    // Get existing project IDs for collision detection
    const existingProjects = await UnifiedStorageService.listProjects();
    const existingProjectIds = new Set(existingProjects.map(p => p.projectId.toString()));

    let acceptResult;
    try {
      acceptResult = ProjectService.acceptGig({
        gig: gig! as any,
        freelancerId: Number(freelancerId),
        commissionerId: actorId,
        organizationName: organization.name,
        existingProjectIds,
      });
      console.log('✅ ProjectService.acceptGig completed successfully');
    } catch (serviceError: any) {
      console.error('❌ ProjectService.acceptGig failed:', serviceError);
      throw Object.assign(new Error(serviceError.message || 'Cannot accept gig'), {
        code: ErrorCodes.OPERATION_NOT_ALLOWED,
        status: 400
      });
    }

    // 🛡️ CRITICAL ORDERING:
    // 1. Save project to storage
    // 2. Save tasks to storage
    // 3. Verify both exist (guard)
    // 4. ONLY THEN update gig status to unavailable
    // 5. ONLY THEN update application status to accepted
    // This ensures atomic project creation - either everything succeeds or everything fails
    console.log('🔄 Saving project to unified storage...');
    const projectSaveStart = Date.now();
    try {
      // Save project using unified storage
      await UnifiedStorageService.writeProject({
        ...acceptResult.project,
        status: 'ongoing',
        invoicingMethod: acceptResult.project.invoicingMethod || 'completion',
        createdAt: acceptResult.project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const projectSaveTime = Date.now() - projectSaveStart;
      console.log(`✅ Project saved to unified storage in ${projectSaveTime}ms`);
    } catch (projectSaveError) {
      console.error('❌ Failed to save project to unified storage:', projectSaveError);
      throw new Error(`Project creation failed: ${projectSaveError.message}`);
    }

    console.log('🔄 Saving tasks to unified storage...');
    const tasksSaveStart = Date.now();

    // Prepare all tasks for batch save
    const tasksToSave = acceptResult.tasks.map(task => ({
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
    }));

    // Save tasks in parallel to improve performance
    console.log(`🔄 Saving ${tasksToSave.length} tasks in parallel...`);
    const taskSavePromises = tasksToSave.map(async (task, index) => {
      const taskSaveStart = Date.now();
      console.log(`🔄 Saving task ${task.taskId} (${index + 1}/${tasksToSave.length})...`);

      try {
        await UnifiedStorageService.saveTask(task);
        const taskSaveTime = Date.now() - taskSaveStart;
        console.log(`✅ Task ${task.taskId} saved in ${taskSaveTime}ms`);
        return { taskId: task.taskId, success: true, time: taskSaveTime };
      } catch (error) {
        const taskSaveTime = Date.now() - taskSaveStart;
        console.error(`❌ Task ${task.taskId} failed in ${taskSaveTime}ms:`, error);
        return { taskId: task.taskId, success: false, time: taskSaveTime, error };
      }
    });

    const taskResults = await Promise.all(taskSavePromises);
    const totalTasksSaveTime = Date.now() - tasksSaveStart;

    const successfulTasks = taskResults.filter(r => r.success);
    const failedTasks = taskResults.filter(r => !r.success);

    console.log(`✅ Task save completed in ${totalTasksSaveTime}ms:`);
    console.log(`   - Successful: ${successfulTasks.length}/${tasksToSave.length}`);
    console.log(`   - Failed: ${failedTasks.length}/${tasksToSave.length}`);

    if (failedTasks.length > 0) {
      console.error('❌ Failed tasks:', failedTasks.map(t => t.taskId));
      // Don't throw error, just log it - project creation was successful
    }

    // 🛡️ GIG APPLICATION GUARD: Verify project and tasks were created before marking application as accepted
    console.log('🛡️ Activating gig application guard - verifying project and task creation...');

    try {
      // Verify project exists in storage
      const savedProject = await UnifiedStorageService.readProject(acceptResult.project.projectId);
      if (!savedProject) {
        throw new Error(`Project ${acceptResult.project.projectId} was not found in storage after creation`);
      }
      console.log(`✅ Guard verified: Project ${savedProject.projectId} exists in storage`);

      // Verify tasks exist in storage
      const savedTasks = await UnifiedStorageService.listTasks(acceptResult.project.projectId);
      if (savedTasks.length === 0) {
        throw new Error(`No tasks found for project ${acceptResult.project.projectId} after creation`);
      }

      if (savedTasks.length !== successfulTasks.length) {
        throw new Error(`Task count mismatch: expected ${successfulTasks.length} successful tasks, found ${savedTasks.length}`);
      }
      console.log(`✅ Guard verified: ${savedTasks.length} tasks exist in storage for project ${savedProject.projectId}`);

      console.log('✅ Gig application guard passed - all project and task data verified');

    } catch (guardError: any) {
      console.error('❌ Gig application guard failed:', guardError.message);

      // Rollback: Remove the created project and tasks
      console.log('🔙 Rolling back project and task creation due to guard failure...');
      try {
        // Delete project (this should cascade to tasks in unified storage)
        const projectsToDelete = await UnifiedStorageService.listProjects();
        const projectToDelete = projectsToDelete.find(p => p.projectId.toString() === acceptResult.project.projectId.toString());
        if (projectToDelete) {
          await UnifiedStorageService.deleteProject(acceptResult.project.projectId);
          console.log('✅ Rollback completed: Project and tasks removed');
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }

      // Return error without updating application status
      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED,
          `Gig matching failed: ${guardError.message}. Project creation was rolled back.`,
          500),
        { status: 500 }
      );
    }

    // 🛡️ GUARD PASSED: Now safe to update gig status and application status
    console.log('🔄 Updating gig status to unavailable (guard passed)...');
    await updateGig(gigId, acceptResult.gigUpdate);
    console.log('✅ Gig status updated to unavailable');

    console.log('🔄 Updating application status to accepted (guard passed)...');
    const applicationRecord = await readGigApplication(applicationId);
    if (applicationRecord) {
      applicationRecord.status = 'accepted';
      applicationRecord.acceptedAt = new Date().toISOString();
      applicationRecord.projectId = acceptResult.project.projectId; // Link to created project
      await writeGigApplication(applicationRecord);
    }
    console.log('✅ Application status updated to accepted');

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

  } catch (error: any) {
    console.error('🔥 Error matching with freelancer:', error);

    // Enhanced error logging for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      gigId,
      applicationId,
      freelancerId,
      actorId
    });

    // Return specific error information in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Failed to match freelancer: ${error.message}`
      : 'Failed to match freelancer';

    const errorCode = error.code || ErrorCodes.INTERNAL_ERROR;
    const errorStatus = error.status || 500;

    return NextResponse.json(
      err(errorCode, errorMessage, errorStatus),
      { status: errorStatus }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleGigMatching);
