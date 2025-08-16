import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getProjectById } from '@/app/api/payments/repos/projects-repo';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { requireSession, assert, assertProjectAccess } from '@/lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logProjectTransition, Subsystems } from '@/lib/log/transitions';

// Commissioner-initiated reactivation
async function handleProjectReactivation(request: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { projectId, projectTitle } = await request.json();
    assert(projectId && projectTitle, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: projectId, projectTitle');

    // Get project details and validate commissioner access
    const project = await UnifiedStorageService.readProject(projectId);
    assert(project, ErrorCodes.PROJECT_NOT_FOUND, 404, 'Project not found');

    // 🔒 Ensure session user is the project commissioner
    assertProjectAccess(actorId, project!, 'commissioner');

    // Update project status to ongoing using unified storage
    const unifiedProject = project;
    assert(unifiedProject, ErrorCodes.PROJECT_NOT_FOUND, 404, 'Project not found in unified storage');

    await UnifiedStorageService.writeProject({
      ...unifiedProject,
      status: 'ongoing',
      updatedAt: new Date().toISOString()
    });

    // Log the transition
    logProjectTransition(
      projectId,
      project!.status,
      'ongoing',
      actorId,
      Subsystems.PROJECTS_UPDATE,
      {
        reason: 'commissioner_reactivated',
        projectTitle: projectTitle,
      }
    );

    // Create notification event for freelancer
    const event = {
      id: `project_reactivate_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_reactivated',
      notificationType: NOTIFICATION_TYPES.PROJECT_STARTED,
      actorId: actorId,
      targetId: project!.freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        message: `Commissioner has re-activated ${projectTitle}. Work can now resume!`
      },
      context: {
        projectId
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json(
      ok({
        entities: {
          project: {
            projectId: projectId,
            title: projectTitle,
            status: 'ongoing',
            freelancerId: project!.freelancerId,
            commissionerId: project!.commissionerId,
          },
        },
        message: 'Project reactivated successfully',
        notificationsQueued: true,
      })
    );

  } catch (error) {
    console.error('Error reactivating project:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to reactivate project', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleProjectReactivation);
