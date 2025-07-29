import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { readProjectTasks, writeTask } from '../../../../lib/project-tasks/hierarchical-storage';
import { saveNote } from '@/lib/project-notes-utils';

const notificationsFilePath = path.join(process.cwd(), 'data', 'notifications', 'freelancers.json');

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, action, comment, freelancerId, taskTitle } = await request.json();

    if (!projectId || !taskId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Read project tasks from hierarchical storage
    const projectTasks = await readProjectTasks(projectId);
    const task = projectTasks.find(t => t.taskId === taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Create updated task object
    const updatedTask = { ...task };

    // Update task based on action
    switch (action) {
      case 'complete':
        // Commissioner approves the task
        updatedTask.completed = true;
        updatedTask.status = 'Approved';
        updatedTask.rejected = false;
        updatedTask.approvedDate = new Date().toISOString();
        break;
      case 'reject':
        // Commissioner rejects the task - freelancer needs to work on it again
        updatedTask.rejected = true;
        updatedTask.completed = false;
        updatedTask.status = 'Ongoing'; // Back to ongoing so freelancer can work on it
        updatedTask.feedbackCount = (updatedTask.feedbackCount || 0) + 1;
        updatedTask.rejectedDate = new Date().toISOString();
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Save updated task to hierarchical storage
    await writeTask(updatedTask);

    // Add comment to project notes if provided
    if (comment && comment.trim()) {
      try {
        // Save note to hierarchical structure
        const note = {
          date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
          feedback: comment.trim()
        };

        await saveNote(projectId, taskId, taskTitle || updatedTask.title, note);
      } catch (notesError) {
        console.error('Error updating project notes:', notesError);
        // Don't fail the main operation if notes update fails
      }
    }

    // Create notification for freelancer
    if (freelancerId) {
      try {
        const notificationsFile = await readFile(notificationsFilePath, 'utf-8');
        const notificationsData = JSON.parse(notificationsFile);

        // Find or create freelancer notifications entry
        let freelancerNotifications = notificationsData.find((f: any) => f.freelancerId === freelancerId);
        if (!freelancerNotifications) {
          freelancerNotifications = {
            freelancerId,
            notifications: []
          };
          notificationsData.push(freelancerNotifications);
        }

        // Create notification based on action
        const notificationId = `task-${action}-${taskId}-${Date.now()}`;
        let notification;

        if (action === 'complete') {
          notification = {
            id: notificationId,
            type: 'task_completed',
            title: 'Task marked as completed',
            message: `"${taskTitle || task.title}" has been approved`,
            timestamp: new Date().toISOString(),
            isRead: false,
            project: {
              id: projectId,
              title: projects[projectIndex].title
            }
          };
        } else if (action === 'reject') {
          notification = {
            id: notificationId,
            type: 'task_rejected',
            title: 'Task needs revision',
            message: `"${taskTitle || task.title}" was rejected and needs to be revised`,
            timestamp: new Date().toISOString(),
            isRead: false,
            project: {
              id: projectId,
              title: projects[projectIndex].title
            }
          };

          // Add separate notification for comment if provided
          if (comment && comment.trim()) {
            const commentNotificationId = `comment-${taskId}-${Date.now()}`;
            const commentNotification = {
              id: commentNotificationId,
              type: 'task_comment',
              title: 'New comment on task',
              message: `Commissioner left a comment on "${taskTitle || task.title}" - click to view`,
              timestamp: new Date().toISOString(),
              isRead: false,
              project: {
                id: projectId,
                title: projects[projectIndex].title
              }
            };
            freelancerNotifications.notifications.unshift(commentNotification);
          }
        }

        if (notification) {
          freelancerNotifications.notifications.unshift(notification);
        }

        // Save updated notifications
        await writeFile(notificationsFilePath, JSON.stringify(notificationsData, null, 2));
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the main operation if notification creation fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: action === 'complete' ? 'Task approved successfully' : 'Task rejected successfully'
    });

  } catch (error) {
    console.error('Error reviewing task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
