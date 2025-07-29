import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { logTaskSubmitted } from '../../../../lib/events/event-logger';
import { readProjectTasks, writeTask } from '../../../../lib/project-tasks/hierarchical-storage';

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

    // Read project tasks from hierarchical storage
    const projectTasks = await readProjectTasks(projectId);
    const task = projectTasks.find(t => t.taskId === taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task status
    const updatedTask = {
      ...task,
      status: 'Submitted',
      link: link || task.link,
      version: version || (task.version + 1),
      submittedDate: new Date().toISOString()
    };

    // Save updated task to hierarchical storage
    await writeTask(updatedTask);

    // 🎯 LOG THE EVENT - This is the key integration point!
    await logTaskSubmitted(
      freelancerId,
      taskId,
      projectId,
      taskTitle,
      projectTitle || task.projectTitle
    );

    return NextResponse.json({
      success: true,
      message: 'Task submitted successfully',
      task: updatedTask
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
