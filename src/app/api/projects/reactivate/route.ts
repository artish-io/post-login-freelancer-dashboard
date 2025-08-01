import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { updateProject, readProject } from '@/lib/projects-utils';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';

// Commissioner-initiated reactivation
export async function POST(request: NextRequest) {
  try {
    const { projectId, commissionerId, projectTitle } = await request.json();

    if (!projectId || !commissionerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details to find freelancer
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project status to ongoing
    await updateProject(projectId, { status: 'ongoing' });

    // Create notification event for freelancer
    const event = {
      id: `project_reactivate_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_reactivated',
      notificationType: NOTIFICATION_TYPES.PROJECT_STARTED,
      actorId: commissionerId,
      targetId: project.freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        message: `${project.commissionerName || 'Commissioner'} has re-activated ${projectTitle}. Work can now resume!`
      },
      context: {
        projectId
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Project reactivated successfully',
      projectId,
      status: 'ongoing'
    });

  } catch (error) {
    console.error('Error reactivating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
