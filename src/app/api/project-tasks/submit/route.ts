

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { eventLogger } from '../../../../lib/events/event-logger';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');
const projectsFilePath = path.join(process.cwd(), 'data/projects.json');
const usersFilePath = path.join(process.cwd(), 'data/users.json');

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, action, freelancerId, commissionerId } = await request.json();

    if (!projectId || !taskId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load all required data
    const [projectTasksData, projectsData, usersData] = await Promise.all([
      readFile(tasksFilePath, 'utf-8'),
      readFile(projectsFilePath, 'utf-8'),
      readFile(usersFilePath, 'utf-8')
    ]);

    const projects = JSON.parse(projectTasksData);
    const projectsInfo = JSON.parse(projectsData);
    const users = JSON.parse(usersData);

    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taskIndex = projects[projectIndex].tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = projects[projectIndex].tasks[taskIndex];
    const projectInfo = projectsInfo.find((p: any) => p.projectId === projectId);

    // Get user IDs from project info if not provided
    const actualFreelancerId = freelancerId || projectInfo?.freelancerId;
    const actualCommissionerId = commissionerId || projectInfo?.commissionerId;

    let eventType: string | null = null;
    let targetUserId: number | null = null;

    switch (action) {
      case 'submit':
        // First submission: mark as completed and in review, but don't increment version yet
        task.completed = true;
        task.status = 'In review';
        task.submittedDate = new Date().toISOString();
        // Version stays the same (1) for first submission
        if (!task.version) task.version = 1;
        eventType = 'task_submitted';
        targetUserId = actualCommissionerId;
        break;
      case 'resubmit':
        // Resubmission after rejection: increment version and mark as in review
        task.rejected = false;
        task.completed = true;
        task.status = 'In review';
        task.submittedDate = new Date().toISOString();
        task.version = (task.version || 1) + 1;
        eventType = 'task_submitted';
        targetUserId = actualCommissionerId;
        break;
      case 'complete':
        // Commissioner approves the task
        task.completed = true;
        task.status = 'Approved';
        task.rejected = false;
        task.approvedDate = new Date().toISOString();
        eventType = 'task_approved';
        targetUserId = actualFreelancerId;
        break;
      case 'reject':
        // Commissioner rejects the task - freelancer needs to work on it again
        task.rejected = true;
        task.completed = false;
        task.status = 'Ongoing'; // Back to ongoing so freelancer can work on it
        task.rejectedDate = new Date().toISOString();
        task.feedbackCount = (task.feedbackCount || 0) + 1;
        eventType = 'task_rejected';
        targetUserId = actualFreelancerId;
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await writeFile(tasksFilePath, JSON.stringify(projects, null, 2));

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