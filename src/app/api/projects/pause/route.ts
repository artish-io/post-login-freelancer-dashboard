import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getProjectById, updateProject } from '@/app/api/payments/repos/projects-repo';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import { requireSession, assert, assertProjectAccess } from '@/lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logProjectTransition, Subsystems } from '@/lib/log/transitions';
import fs from 'fs';
import path from 'path';

// Commissioner-initiated pause
async function handleProjectPause(request: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { projectId, projectTitle } = await request.json();
    assert(projectId && projectTitle, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: projectId, projectTitle');

    // Get project details and validate commissioner access
    const project = await getProjectById(Number(projectId));
    assert(project, ErrorCodes.PROJECT_NOT_FOUND, 404, 'Project not found');

    // 🔒 Ensure session user is the project commissioner
    assertProjectAccess(actorId, project!, 'commissioner');

    // Update project status to paused
    const updateSuccess = await updateProject(Number(projectId), { status: 'paused' });
    assert(updateSuccess, ErrorCodes.INTERNAL_ERROR, 500, 'Failed to update project status');

    // Log the transition
    logProjectTransition(
      Number(projectId),
      project!.status,
      'paused',
      actorId,
      Subsystems.PROJECTS_UPDATE,
      {
        reason: 'commissioner_initiated',
        projectTitle: projectTitle,
      }
    );

    // Create notification event for freelancer
    const event = {
      id: `project_pause_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_paused',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSED,
      actorId: actorId,
      targetId: project!.freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        message: `Commissioner has paused ${projectTitle}. But not to worry, you will receive an update when they unpause it for work to continue!`
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
            projectId: Number(projectId),
            title: projectTitle,
            status: 'paused',
            freelancerId: project!.freelancerId,
            commissionerId: project!.commissionerId,
          },
        },
        message: 'Project paused successfully',
        notificationsQueued: true,
      })
    );

  } catch (error) {
    console.error('Error pausing project:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to pause project', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleProjectPause);

// Freelancer pause request
export async function PUT(request: NextRequest) {
  try {
    const { projectId, freelancerId, projectTitle, reason } = await request.json();

    if (!projectId || !freelancerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details to find commissioner
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get remaining milestone count
    const { readAllTasks } = await import('@/app/api/payments/repos/tasks-repo');
    const allTasks = await readAllTasks();
    const projectTasks = allTasks.filter((task: any) => task.projectId === projectId);
    const remainingTasks = projectTasks.filter((task: any) => !task.completed).length || 0;

    // Get freelancer name
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const freelancer = usersData.find((user: any) => user.id === freelancerId);
    const freelancerName = freelancer?.name || 'Freelancer';

    // Create pause request event for commissioner
    const event = {
      id: `project_pause_request_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_pause_requested',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_REQUESTED,
      actorId: freelancerId,
      targetId: project.commissionerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        pauseReason: reason || 'Freelancer requested project pause',
        freelancerName,
        remainingTasks,
        requestStatus: 'pending'
      },
      context: {
        projectId,
        freelancerId,
        requestId: `pause_req_${projectId}_${Date.now()}`
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Pause request sent successfully',
      projectId,
      requestId: event.context.requestId,
      remainingTasks
    });

  } catch (error) {
    console.error('Error requesting project pause:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
