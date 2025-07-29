

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { eventLogger } from '../../../../lib/events/event-logger';
import { readTask, writeTask, readProjectTasks } from '../../../../lib/project-tasks/hierarchical-storage';

const projectsFilePath = path.join(process.cwd(), 'data/projects.json');
const usersFilePath = path.join(process.cwd(), 'data/users.json');

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, action, freelancerId, commissionerId } = await request.json();

    if (!projectId || !taskId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load project and user data
    const [projectsData, usersData] = await Promise.all([
      readFile(projectsFilePath, 'utf-8'),
      readFile(usersFilePath, 'utf-8')
    ]);

    const projectsInfo = JSON.parse(projectsData);
    const users = JSON.parse(usersData);

    // Get project info
    const projectInfo = projectsInfo.find((p: any) => p.projectId === projectId);
    if (!projectInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Read all tasks for this project to find the specific task
    const projectTasks = await readProjectTasks(projectId);
    const task = projectTasks.find(t => t.taskId === taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get user IDs from project info if not provided
    const actualFreelancerId = freelancerId || projectInfo?.freelancerId;
    const actualCommissionerId = commissionerId || projectInfo?.commissionerId;

    let eventType: string | null = null;
    let targetUserId: number | null = null;

    // Create updated task object
    const updatedTask = { ...task };

    switch (action) {
      case 'submit':
        // First submission: mark as completed and in review, but don't increment version yet
        updatedTask.completed = true;
        updatedTask.status = 'In review';
        updatedTask.submittedDate = new Date().toISOString();
        // Version stays the same (1) for first submission
        if (!updatedTask.version) updatedTask.version = 1;
        eventType = 'task_submitted';
        targetUserId = actualCommissionerId;
        break;
      case 'resubmit':
        // Resubmission after rejection: increment version and mark as in review
        updatedTask.rejected = false;
        updatedTask.completed = true;
        updatedTask.status = 'In review';
        updatedTask.submittedDate = new Date().toISOString();
        updatedTask.version = (updatedTask.version || 1) + 1;
        eventType = 'task_submitted';
        targetUserId = actualCommissionerId;
        break;
      case 'complete':
        // Commissioner approves the task
        updatedTask.completed = true;
        updatedTask.status = 'Approved';
        updatedTask.rejected = false;
        updatedTask.approvedDate = new Date().toISOString();
        eventType = 'task_approved';
        targetUserId = actualFreelancerId;
        break;
      case 'reject':
        // Commissioner rejects the task - freelancer needs to work on it again
        updatedTask.rejected = true;
        updatedTask.completed = false;
        updatedTask.status = 'Ongoing'; // Back to ongoing so freelancer can work on it
        updatedTask.rejectedDate = new Date().toISOString();
        updatedTask.feedbackCount = (updatedTask.feedbackCount || 0) + 1;
        eventType = 'task_rejected';
        targetUserId = actualFreelancerId;
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Write the updated task back to hierarchical storage
    await writeTask(updatedTask);

    // Log event for notification system
    if (eventType && targetUserId) {
      try {
        await eventLogger.logEvent({
          id: `${eventType}_${taskId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: eventType as any,
          notificationType: eventType === 'task_submitted' ? 10 : eventType === 'task_approved' ? 11 : 12, // NOTIFICATION_TYPES
          actorId: action === 'complete' || action === 'reject' ? actualCommissionerId : actualFreelancerId,
          targetId: targetUserId,
          entityType: 1, // ENTITY_TYPES.TASK
          entityId: taskId,
          metadata: {
            taskTitle: task.title,
            projectTitle: projects[projectIndex].title,
            version: task.version || 1,
            action: action
          },
          context: {
            projectId: projectId,
            taskId: taskId
          }
        });
      } catch (eventError) {
        console.error('Failed to log event:', eventError);
        // Don't fail the main operation if event logging fails
      }
    }

    // Auto-generate invoice for completion-based projects when task is approved
    if (action === 'complete' && projectInfo?.invoicingMethod === 'completion') {
      try {
        const invoiceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/invoices/auto-generate-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            projectId,
            freelancerId: actualFreelancerId,
            commissionerId: actualCommissionerId,
            taskTitle: task.title,
            projectTitle: projects[projectIndex].title
          })
        });

        if (invoiceResponse.ok) {
          const invoiceResult = await invoiceResponse.json();
          console.log('Auto-generated completion invoice:', invoiceResult);
        }
      } catch (invoiceError) {
        console.error('Failed to auto-generate completion invoice:', invoiceError);
        // Don't fail the main operation if invoice generation fails
      }
    }

    return NextResponse.json({
      success: true,
      updatedTask: task,
      action: action,
      eventLogged: !!eventType
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}