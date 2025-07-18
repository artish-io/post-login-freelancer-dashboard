import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { logTaskSubmitted } from '../../../../lib/events/event-logger';
import fs from 'fs';
import path from 'path';

/**
 * Example API endpoint showing how to integrate event logging
 * This would be called when a freelancer submits a task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, projectId, freelancerId, taskTitle, projectTitle, link, version } = body;

    // Validate required fields
    if (!taskId || !projectId || !freelancerId || !taskTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update task status in project-tasks.json
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));
    
    const projectTaskIndex = projectTasks.findIndex((pt: any) => pt.projectId === projectId);
    if (projectTaskIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const taskIndex = projectTasks[projectTaskIndex].tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task status
    projectTasks[projectTaskIndex].tasks[taskIndex] = {
      ...projectTasks[projectTaskIndex].tasks[taskIndex],
      status: 'Submitted',
      link: link || projectTasks[projectTaskIndex].tasks[taskIndex].link,
      version: version || (projectTasks[projectTaskIndex].tasks[taskIndex].version + 1),
      submittedAt: new Date().toISOString()
    };

    // Save updated project tasks
    fs.writeFileSync(projectTasksPath, JSON.stringify(projectTasks, null, 2));

    // 🎯 LOG THE EVENT - This is the key integration point!
    await logTaskSubmitted(
      freelancerId,
      taskId,
      projectId,
      taskTitle,
      projectTitle || projectTasks[projectTaskIndex].title
    );

    return NextResponse.json({
      success: true,
      message: 'Task submitted successfully',
      task: projectTasks[projectTaskIndex].tasks[taskIndex]
    });

  } catch (error) {
    console.error('Error submitting task:', error);
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    );
  }
}

/**
 * Example of how to log other events in your application:
 * 
 * // When a task is approved
 * await logTaskApproved(commissionerId, taskId, projectId, taskTitle, projectTitle);
 * 
 * // When an invoice is sent
 * await logInvoiceSent(freelancerId, commissionerId, invoiceId, projectId, invoiceNumber, projectTitle, amount);
 * 
 * // When a gig application is submitted
 * await logGigApplication(freelancerId, gigId, gigTitle, gigOwnerId);
 * 
 * // When a storefront purchase is made
 * await logStorefrontPurchase(buyerId, sellerId, productId, productTitle, amount);
 * 
 * // When a message is sent
 * await logMessageSent(senderId, recipientId, messageId, messagePreview, threadId);
 */
