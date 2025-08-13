import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';

// Approve pause request
export async function POST(request: NextRequest) {
  try {
    const { projectId, commissionerId, freelancerId, projectTitle, requestId, notificationId } = await request.json();

    if (!projectId || !commissionerId || !freelancerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this pause request has already been responded to
    if (notificationId) {
      const existingAction = NotificationStorage.isActioned(notificationId, commissionerId);
      if (existingAction) {
        return NextResponse.json({
          error: 'This pause request has already been responded to',
          action: existingAction
        }, { status: 409 });
      }
    }

    // Update project status to paused using unified storage
    const project = await UnifiedStorageService.readProject(projectId);
    if (project) {
      await UnifiedStorageService.writeProject({
        ...project,
        status: 'paused',
        updatedAt: new Date().toISOString()
      });
    }

    // Create approval notification for freelancer
    const event = {
      id: `project_pause_approved_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_pause_accepted',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_ACCEPTED,
      actorId: commissionerId,
      targetId: freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        requestId,
        message: `Your request to pause the ${projectTitle} project has been approved`
      },
      context: {
        projectId,
        requestId
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Pause request approved successfully',
      projectId,
      status: 'paused'
    });

  } catch (error) {
    console.error('Error approving pause request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Refuse pause request
export async function PUT(request: NextRequest) {
  try {
    const { projectId, commissionerId, freelancerId, projectTitle, requestId, reason, notificationId } = await request.json();

    if (!projectId || !commissionerId || !freelancerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this pause request has already been responded to
    if (notificationId) {
      const existingAction = NotificationStorage.isActioned(notificationId, commissionerId);
      if (existingAction) {
        return NextResponse.json({
          error: 'This pause request has already been responded to',
          action: existingAction
        }, { status: 409 });
      }
    }

    // Create refusal notification for freelancer
    const event = {
      id: `project_pause_refused_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_pause_refused',
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_REFUSED,
      actorId: commissionerId,
      targetId: freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        requestId,
        refusalReason: reason || 'Commissioner declined the pause request',
        message: `Your request to pause the ${projectTitle} project has been declined`
      },
      context: {
        projectId,
        requestId
      }
    };

    // Store the event
    NotificationStorage.addEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Pause request refused successfully',
      projectId
    });

  } catch (error) {
    console.error('Error refusing pause request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
