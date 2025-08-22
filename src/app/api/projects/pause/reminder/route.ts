import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { EventType, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';
import fs from 'fs';
import path from 'path';

// Store reminder tracking data
const reminderTrackingPath = path.join(process.cwd(), 'data', 'pause-reminders.json');

function getReminderData() {
  try {
    if (fs.existsSync(reminderTrackingPath)) {
      return JSON.parse(fs.readFileSync(reminderTrackingPath, 'utf-8'));
    }
    return {};
  } catch (error) {
    console.error('Error reading reminder data:', error);
    return {};
  }
}

function saveReminderData(data: any) {
  try {
    fs.writeFileSync(reminderTrackingPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving reminder data:', error);
  }
}

// Send pause reminder
export async function POST(request: NextRequest) {
  try {
    const { projectId, freelancerId, projectTitle, requestId } = await request.json();

    if (!projectId || !freelancerId || !projectTitle || !requestId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get reminder tracking data
    const reminderData = getReminderData();
    const key = `${projectId}_${requestId}`;
    
    if (!reminderData[key]) {
      reminderData[key] = {
        projectId,
        requestId,
        reminders: [],
        createdAt: new Date().toISOString()
      };
    }

    const projectReminders = reminderData[key];
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Count reminders in the last 48 hours
    const recentReminders = projectReminders.reminders.filter((reminder: any) => 
      new Date(reminder.timestamp) > fortyEightHoursAgo
    );

    if (recentReminders.length >= 3) {
      // Auto-pause the project after 3rd reminder using unified storage
      const pauseProject = await UnifiedStorageService.readProject(projectId);
      if (!pauseProject) {
        return NextResponse.json({ error: 'Project not found for auto-pause' }, { status: 404 });
      }

      await UnifiedStorageService.writeProject({
        ...pauseProject,
        status: 'paused',
        updatedAt: new Date().toISOString()
      });

      // Create auto-pause notification for freelancer
      if (typeof pauseProject.commissionerId !== 'number') {
        return NextResponse.json({ error: 'Invalid commissionerId for auto-pause' }, { status: 400 });
      }

      const autoPauseEvent = {
        id: `project_auto_pause_${projectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_paused' as EventType,
        notificationType: NOTIFICATION_TYPES.PROJECT_PAUSED,
        actorId: pauseProject.commissionerId, // System acts as commissioner
        targetId: freelancerId,
        entityType: ENTITY_TYPES.PROJECT,
        entityId: projectId.toString(),
        metadata: {
          projectTitle,
          message: `${pauseProject.commissionerName || 'Commissioner'} has paused ${projectTitle}. But not to worry, you will receive an update when they unpause it for work to continue!`,
          autoPaused: true
        },
        context: {
          projectId,
          requestId
        }
      };

      NotificationStorage.addEvent(autoPauseEvent);

      // Mark reminders as completed
      projectReminders.status = 'auto_paused';
      saveReminderData(reminderData);

      return NextResponse.json({
        success: true,
        message: 'Project auto-paused after 3 reminders',
        projectId,
        status: 'paused',
        autoPaused: true
      });
    }

    // Add new reminder
    projectReminders.reminders.push({
      timestamp: now.toISOString(),
      count: recentReminders.length + 1
    });

    saveReminderData(reminderData);

    // Create reminder notification for commissioner
    if (typeof project.commissionerId !== 'number') {
      return NextResponse.json({ error: 'Invalid commissionerId for reminder' }, { status: 400 });
    }

    const reminderEvent = {
      id: `project_pause_reminder_${projectId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'project_pause_reminder' as EventType,
      notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_REMINDER,
      actorId: freelancerId,
      targetId: project.commissionerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        requestId,
        reminderCount: recentReminders.length + 1,
        message: `Reminder: ${project.freelancerName || 'Freelancer'} is still waiting for a response to their pause request for ${projectTitle}`
      },
      context: {
        projectId,
        requestId,
        freelancerId
      }
    };

    NotificationStorage.addEvent(reminderEvent);

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
      projectId,
      reminderCount: recentReminders.length + 1,
      remainingReminders: 3 - (recentReminders.length + 1)
    });

  } catch (error) {
    console.error('Error sending pause reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Withdraw pause request
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const requestId = searchParams.get('requestId');

    if (!projectId || !requestId) {
      return NextResponse.json({ error: 'Missing projectId or requestId' }, { status: 400 });
    }

    // Remove from reminder tracking
    const reminderData = getReminderData();
    const key = `${projectId}_${requestId}`;
    
    if (reminderData[key]) {
      reminderData[key].status = 'withdrawn';
      saveReminderData(reminderData);
    }

    return NextResponse.json({
      success: true,
      message: 'Pause request withdrawn successfully',
      projectId,
      requestId
    });

  } catch (error) {
    console.error('Error withdrawing pause request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
