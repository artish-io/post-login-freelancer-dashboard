import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readTask, writeTask, readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';

const EVENTS_LOG_PATH = path.join(process.cwd(), 'data/notifications/notifications-log.json');

export async function POST(request: Request) {
  try {
    const { taskId, projectId, commissionerId } = await request.json();

    if (!taskId || !projectId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load events and read the specific task
    const [eventsData, task] = await Promise.all([
      fs.readFile(EVENTS_LOG_PATH, 'utf-8'),
      readTask(projectId, taskId) // Use hierarchical storage to read the specific task
    ]);

    const events = JSON.parse(eventsData);

    // Check if task exists
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task status
    const updatedTask = {
      ...task,
      status: 'Approved',
      completed: true,
      approvedAt: new Date().toISOString()
    };

    // Write the updated task back to hierarchical storage
    await writeTask(projectId, taskId, updatedTask);

    // Create task approval event
    const approvalEvent = {
      id: `evt_${Date.now()}_task_approved`,
      timestamp: new Date().toISOString(),
      type: 'task_approved',
      notificationType: 2,
      actorId: commissionerId,
      targetId: updatedTask.freelancerId, // Use actual freelancer ID from task
      entityType: 1,
      entityId: taskId,
      metadata: {
        taskTitle: updatedTask.title,
        projectTitle: `Project ${projectId}`, // We don't have project title readily available
        version: updatedTask.version || 1
      },
      context: {
        projectId: projectId,
        taskId: taskId
      }
    };

    events.push(approvalEvent);
    await fs.writeFile(EVENTS_LOG_PATH, JSON.stringify(events, null, 2));

    // Trigger auto-invoice generation
    try {
      const invoiceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/invoices/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          projectId,
          action: 'task_approved'
        })
      });

      const invoiceResult = await invoiceResponse.json();
      console.log('Auto-invoice result:', invoiceResult);
    } catch (invoiceError) {
      console.error('Failed to auto-generate invoice:', invoiceError);
      // Don't fail the approval if invoice generation fails
    }

    return NextResponse.json({
      success: true,
      message: `Task "${task.title}" approved successfully`,
      task: projectTasks[projectIndex].tasks[taskIndex]
    });

  } catch (error) {
    console.error('Error approving task:', error);
    return NextResponse.json({ error: 'Failed to approve task' }, { status: 500 });
  }
}
