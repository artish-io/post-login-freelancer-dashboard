import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { readProjectTasks, writeTask } from '@/lib/project-tasks/hierarchical-storage';
import { saveNote } from '@/lib/project-notes-utils';
import { readProject } from '@/lib/projects-utils';
import { logTaskApproved, logTaskRejected } from '@/lib/events/event-logger';

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

    // Get project information and user data for notifications
    let projectInfo = null;
    let usersData = [];
    let commissionerId = null;
    let commissionerName = 'Unknown Commissioner';
    let freelancerName = 'Unknown Freelancer';

    try {
      // Read project info
      projectInfo = await readProject(projectId);

      // Read users data to get names
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      const usersFile = await readFile(usersPath, 'utf-8');
      usersData = JSON.parse(usersFile);

      // Get commissioner ID from project data
      if (projectInfo) {
        commissionerId = projectInfo.commissionerId;
      }

      // Get user names
      const commissioner = usersData.find((u: any) => u.id === commissionerId);
      const freelancer = usersData.find((u: any) => u.id === freelancerId);

      if (commissioner) {
        commissionerName = commissioner.name;
      }
      if (freelancer) {
        freelancerName = freelancer.name;
      }
    } catch (error) {
      console.error('Error reading project/user info:', error);
    }

    // Log event using the new event logging system
    if (freelancerId && commissionerId) {
      try {
        if (action === 'complete') {
          await logTaskApproved(
            commissionerId,
            freelancerId,
            taskId,
            taskTitle || task.title,
            projectId
          );
        } else if (action === 'reject') {
          await logTaskRejected(
            commissionerId,
            freelancerId,
            taskId,
            taskTitle || task.title,
            projectId,
            comment && comment.trim() ? comment.trim() : undefined
          );
        }
      } catch (eventError) {
        console.error('Error logging event:', eventError);
        // Don't fail the main operation if event logging fails
      }
    } else {
      console.warn('Missing freelancerId or commissionerId for event logging:', { freelancerId, commissionerId });
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
