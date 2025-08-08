
/**
 * Unified Task Operations Endpoint
 *
 * Handles task submission, approval, and rejection using the unified task service.
 * Replaces multiple inconsistent task endpoints with a single, standardized API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedTaskService } from '../../../../lib/services/unified-task-service';
import { UnifiedStorageService } from '../../../../lib/storage/unified-storage-service';
import { executeTaskApprovalTransaction } from '../../../../lib/transactions/transaction-service';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '../../../../lib/events/event-logger';
import { requireSession, assert } from '../../../../lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '../../../../lib/http/envelope';
import { logTaskTransition, Subsystems } from '../../../../lib/log/transitions';

async function handleTaskOperation(request: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { taskId, action, referenceUrl, feedback } = await request.json();
    assert(taskId && action, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: taskId, action');

    // Validate action type
    const validActions = ['submit', 'approve', 'reject'];
    assert(validActions.includes(action), ErrorCodes.INVALID_INPUT, 400, `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);

    let result;
    let eventType: string | null = null;

    switch (action) {
      case 'submit':
        result = await UnifiedTaskService.submitTask(Number(taskId), actorId, {
          referenceUrl
        });
        eventType = 'task_submitted';
        break;

      case 'approve':
        // Use transaction service for atomic task approval with invoice generation
        const task = await UnifiedStorageService.getTaskById(Number(taskId));
        const project = await UnifiedStorageService.getProjectById(task!.projectId);

        const transactionParams = {
          taskId: Number(taskId),
          projectId: task!.projectId,
          freelancerId: project!.freelancerId!,
          commissionerId: project!.commissionerId!,
          taskTitle: task!.title,
          projectTitle: project!.title,
          generateInvoice: project!.invoicingMethod === 'completion',
          invoiceType: 'completion' as const
        };

        const transactionResult = await executeTaskApprovalTransaction(transactionParams);

        if (!transactionResult.success) {
          return NextResponse.json({
            success: false,
            error: 'Task approval transaction failed',
            details: transactionResult.error,
            transactionId: transactionResult.transactionId
          }, { status: 500 });
        }

        result = {
          success: true,
          task: task,
          shouldNotify: true,
          notificationTarget: project!.freelancerId,
          message: 'Task approved successfully with transaction integrity',
          invoiceGenerated: transactionResult.results.generate_invoice?.success || false
        };
        eventType = 'task_approved';
        break;

      case 'reject':
        result = await UnifiedTaskService.rejectTask(Number(taskId), actorId, feedback);
        eventType = 'task_rejected';
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Log the task transition
    if (result.success && eventType) {
      logTaskTransition(
        Number(taskId),
        'previous_status', // This would need to be tracked properly
        result.task.status,
        actorId,
        Subsystems.TASKS_SUBMIT,
        {
          projectId: result.task.projectId,
          taskTitle: result.task.title,
          action: action
        }
      );
    }

    // Log event for notifications
    if (result.success && result.shouldNotify && eventType) {
      try {
        const notificationTypeMap: Record<string, number> = {
          'task_submitted': NOTIFICATION_TYPES.TASK_SUBMITTED,
          'task_approved': NOTIFICATION_TYPES.TASK_APPROVED,
          'task_rejected': NOTIFICATION_TYPES.TASK_REJECTED
        };

        await eventLogger.logEvent({
          id: `${eventType}_${taskId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: eventType,
          notificationType: notificationTypeMap[eventType],
          actorId: actorId,
          targetId: result.notificationTarget!,
          entityType: ENTITY_TYPES.TASK,
          entityId: Number(taskId),
          metadata: {
            taskTitle: result.task.title,
            projectTitle: result.task.projectTitle,
            action: action,
            invoiceGenerated: result.invoiceGenerated || false
          },
          context: {
            projectId: result.task.projectId,
            taskId: Number(taskId)
          }
        });
      } catch (eventError) {
        console.error('Error logging event:', eventError);
        // Don't fail the main operation if event logging fails
      }
    }

    // Return success response
    return NextResponse.json(
      ok({
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
        invoiceGenerated: result.invoiceGenerated || false
      })
    );

  } catch (error) {
    console.error('Error in task operation:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to process task operation', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleTaskOperation);