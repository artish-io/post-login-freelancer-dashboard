import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const PROJECT_TASKS_PATH = path.join(process.cwd(), 'data/project-tasks.json');
const EVENTS_LOG_PATH = path.join(process.cwd(), 'data/notifications/notifications-log.json');

export async function POST(request: Request) {
  try {
    const { taskId, projectId, commissionerId } = await request.json();

    if (!taskId || !projectId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load project tasks and events
    const [projectTasksData, eventsData] = await Promise.all([
      fs.readFile(PROJECT_TASKS_PATH, 'utf-8'),
      fs.readFile(EVENTS_LOG_PATH, 'utf-8')
    ]);

    const projectTasks = JSON.parse(projectTasksData);
    const events = JSON.parse(eventsData);

    // Find and update the task
    const projectIndex = projectTasks.findIndex((pt: any) => pt.projectId === projectId);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taskIndex = projectTasks[projectIndex].tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = projectTasks[projectIndex].tasks[taskIndex];

    // Update task status
    projectTasks[projectIndex].tasks[taskIndex] = {
      ...task,
      status: 'Approved',
      completed: true,
      approvedAt: new Date().toISOString()
    };

    // Save updated project tasks
    await fs.writeFile(PROJECT_TASKS_PATH, JSON.stringify(projectTasks, null, 2));

    // Create task approval event
    const approvalEvent = {
      id: `evt_${Date.now()}_task_approved`,
      timestamp: new Date().toISOString(),
      type: 'task_approved',
      notificationType: 2,
      actorId: commissionerId,
      targetId: projectTasks[projectIndex].tasks[taskIndex].freelancerId || 31, // Default to user 31
      entityType: 1,
      entityId: taskId,
      metadata: {
        taskTitle: task.title,
        projectTitle: projectTasks[projectIndex].title,
        version: task.version || 1
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
