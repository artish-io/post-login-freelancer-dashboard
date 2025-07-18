import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');
const notesFilePath = path.join(process.cwd(), 'data', 'project-notes.json');
const notificationsFilePath = path.join(process.cwd(), 'data', 'notifications', 'freelancers.json');

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, action, comment, freelancerId, taskTitle } = await request.json();

    if (!projectId || !taskId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Read project tasks
    const tasksFile = await readFile(tasksFilePath, 'utf-8');
    const projects = JSON.parse(tasksFile);

    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taskIndex = projects[projectIndex].tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = projects[projectIndex].tasks[taskIndex];

    // Update task based on action
    switch (action) {
      case 'complete':
        // Commissioner approves the task
        task.completed = true;
        task.status = 'Approved';
        task.rejected = false;
        break;
      case 'reject':
        // Commissioner rejects the task - freelancer needs to work on it again
        task.rejected = true;
        task.completed = false;
        task.status = 'Ongoing'; // Back to ongoing so freelancer can work on it
        task.feedbackCount = (task.feedbackCount || 0) + 1;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Save updated tasks
    await writeFile(tasksFilePath, JSON.stringify(projects, null, 2));

    // Add comment to project notes if provided
    if (comment && comment.trim()) {
      try {
        const notesFile = await readFile(notesFilePath, 'utf-8');
        const notesData = JSON.parse(notesFile);

        // Find existing task notes entry or create new one
        let taskNotesEntry = notesData.find((entry: any) =>
          entry.projectId === projectId && entry.taskId === taskId
        );

        if (taskNotesEntry) {
          // Add to existing notes array
          taskNotesEntry.notes.push({
            date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
            feedback: comment.trim()
          });
        } else {
          // Create new task notes entry
          const newTaskNotesEntry = {
            projectId,
            taskId,
            taskTitle: taskTitle || task.title,
            notes: [
              {
                date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
                feedback: comment.trim()
              }
            ]
          };
          notesData.push(newTaskNotesEntry);
        }

        // Save updated notes
        await writeFile(notesFilePath, JSON.stringify(notesData, null, 2));
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
