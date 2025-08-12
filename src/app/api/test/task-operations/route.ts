import { NextRequest, NextResponse } from 'next/server';
import { UnifiedTaskService } from '../../../../lib/services/unified-task-service';
import { UnifiedStorageService } from '../../../../lib/storage/unified-storage-service';

/**
 * TEST ENDPOINT: Task operations (bypasses authentication for testing)
 * This endpoint is identical to /api/project-tasks/submit but without authentication
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing and should be removed in production
 */

export async function POST(request: NextRequest) {
  try {
    const { taskId, action, referenceUrl, feedback } = await request.json();

    console.log('🧪 TEST: Processing task operation:', { taskId, action });

    // Validate required fields
    if (!taskId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: taskId, action'
      }, { status: 400 });
    }

    // Validate action type
    const validActions = ['submit', 'approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        error: `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    // Get task and project for context
    console.log(`🔍 Searching for task ${taskId}...`);
    const task = await UnifiedStorageService.getTaskById(Number(taskId));
    if (!task) {
      console.log(`❌ Task ${taskId} not found in storage`);

      // Try to find the task file directly to debug the issue
      try {
        const { findExistingTaskFile } = await import('@/lib/project-tasks/hierarchical-storage');
        const taskFilePath = await findExistingTaskFile(0, Number(taskId)); // Search all projects
        console.log(`🔍 Direct file search result: ${taskFilePath}`);
      } catch (debugError) {
        console.log(`🔍 Debug search failed: ${debugError}`);
      }

      return NextResponse.json({
        success: false,
        error: `Task ${taskId} not found`
      }, { status: 404 });
    }
    console.log(`✅ Found task ${taskId}: ${task.title}`);

    const project = await UnifiedStorageService.getProjectById(task.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: `Project ${task.projectId} not found`
      }, { status: 404 });
    }

    let result;
    let eventType: string | null = null;

    // Use a test user ID (freelancer for submit, commissioner for approve/reject)
    const actorId = action === 'submit' ? project.freelancerId : project.commissionerId;

    switch (action) {
      case 'submit':
        result = await UnifiedTaskService.submitTask(Number(taskId), actorId!, {
          referenceUrl: referenceUrl || `https://example.com/work/${taskId}`
        });
        eventType = 'task_submitted';
        break;

      case 'approve':
        result = await UnifiedTaskService.approveTask(Number(taskId), actorId!);
        eventType = 'task_approved';
        break;

      case 'reject':
        result = await UnifiedTaskService.rejectTask(Number(taskId), actorId!, feedback || 'Task rejected for testing');
        eventType = 'task_rejected';
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`✅ TEST: Task ${action} successful:`, {
      taskId: result.task.taskId,
      status: result.task.status,
      completed: result.task.completed,
      invoiceGenerated: result.invoiceGenerated
    });

    // Return success response
    return NextResponse.json({
      success: true,
      entities: {
        task: {
          id: result.task.taskId,
          title: result.task.title,
          status: result.task.status,
          completed: result.task.completed,
          version: result.task.version,
          projectId: result.task.projectId,
        },
      },
      message: result.message,
      notificationsQueued: result.shouldNotify,
      invoiceGenerated: result.invoiceGenerated || false,
      invoiceId: result.invoiceId || null
    });

  } catch (error) {
    console.error('❌ TEST: Error in task operation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process task operation',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
