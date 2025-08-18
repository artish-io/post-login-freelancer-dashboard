
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
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES, EventType } from '../../../../lib/events/event-logger';
import { requireSession, assert } from '../../../../lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '../../../../lib/http/envelope';
import { logTaskTransition, Subsystems } from '../../../../lib/log/transitions';
import {
  sendProjectCompletionRatingNotifications,
  getUserNamesForRating
} from '../../../../lib/notifications/rating-notifications';

async function handleTaskOperation(request: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(request);

    const { taskId, projectId, action, referenceUrl, feedback } = await request.json();

    assert(taskId && action, ErrorCodes.MISSING_REQUIRED_FIELD, 400, 'Missing required fields: taskId, action');

    // Validate action type
    const validActions = ['submit', 'approve', 'reject'];
    assert(validActions.includes(action), ErrorCodes.INVALID_INPUT, 400, `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);

    // Require projectId for submit and reject operations
    if ((action === 'submit' || action === 'reject') && !projectId) {
      return NextResponse.json(
        err(ErrorCodes.MISSING_REQUIRED_FIELD, 'projectId is required for submit and reject actions', 400),
        { status: 400 }
      );
    }

    let result;
    let eventType: EventType | null = null;

    switch (action) {
      case 'submit':
        result = await UnifiedTaskService.submitTask(Number(taskId), actorId, {
          projectId: projectId,
          referenceUrl
        });
        eventType = 'task_submitted';
        break;

      case 'approve':
        // For approve, we can still use the legacy method since it doesn't require projectId in the request
        // but we should migrate this to use composite lookup in the future
        const task = await UnifiedStorageService.getTaskById(Number(taskId));
        if (!task) {
          return NextResponse.json(
            err(ErrorCodes.NOT_FOUND, `Task ${taskId} not found`, 404),
            { status: 404 }
          );
        }
        const project = await UnifiedStorageService.getProjectById(task.projectId);

        // 🛡️ MILESTONE GUARD: For milestone-based projects, ensure invoice generation
        const isMilestoneProject = project!.invoicingMethod === 'milestone';
        const shouldGenerateInvoice = isMilestoneProject || project!.invoicingMethod === 'completion';

        const transactionParams = {
          taskId: Number(taskId),
          projectId: task!.projectId,
          freelancerId: project!.freelancerId!,
          commissionerId: project!.commissionerId!,
          taskTitle: task!.title,
          projectTitle: project!.title,
          generateInvoice: shouldGenerateInvoice,
          invoiceType: isMilestoneProject ? 'milestone' as const : 'completion' as const
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

        // 🛡️ MILESTONE GUARD: Verify invoice generation for milestone projects
        if (isMilestoneProject && !transactionResult.results.generate_invoice?.success) {
          return NextResponse.json({
            success: false,
            error: 'Task approval failed: Invoice generation required for milestone-based projects',
            details: 'Milestone-based projects require automatic invoice generation upon task approval',
            invoicingMethod: project!.invoicingMethod,
            transactionId: transactionResult.transactionId
          }, { status: 400 });
        }

        result = {
          success: true,
          task: transactionResult.results.update_task || task,
          shouldNotify: true,
          notificationTarget: project!.freelancerId,
          message: isMilestoneProject
            ? 'Task approved successfully with milestone invoice generated'
            : 'Task approved successfully with transaction integrity',
          invoiceGenerated: transactionResult.results.generate_invoice?.success || false,
          project: {
            invoicingMethod: project!.invoicingMethod,
            projectId: project!.projectId
          },
          // Add invoice details for notifications
          invoiceData: transactionResult.results.generate_invoice
        };
        eventType = 'task_approved';
        break;

      case 'reject':
        result = await UnifiedTaskService.rejectTask(Number(taskId), actorId, {
          projectId: projectId,
          feedback
        });
        eventType = 'task_rejected';
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Handle task service failures
    if (!result.success) {
      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, result.message, 400),
        { status: 400 }
      );
    }

    // Log the task transition
    if (result.success && eventType && result.task) {
      logTaskTransition(
        Number(taskId),
        'previous_status', // This would need to be tracked properly
        result.task.status,
        actorId,
        Subsystems.TASKS_SUBMIT,
        {
          projectId: result.task.projectId,
          taskTitle: result.task.title
        }
      );
    }

    // Log event for notifications
    if (result.success && result.shouldNotify && eventType && result.task) {
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
            taskId: Number(taskId),
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

        // 🔔 For milestone project task approvals, create additional payment notifications
        if (action === 'approve' && (result as any).project?.invoicingMethod === 'milestone') {
          console.log(`💰 Creating payment notifications for milestone project ${result.task.projectId}`);

          // Get project data for budget calculation and user names
          const projectData = await UnifiedStorageService.getProjectById(result.task.projectId);

          // Get invoice details and budget information
          const invoiceData = (result as any)?.invoiceData;
          const invoiceAmount = invoiceData?.amount || 0;
          const invoiceNumber = invoiceData?.invoiceNumber || null;

          // Get organization and user names for proper context
          const organization = projectData?.organizationId ? await UnifiedStorageService.getOrganizationById(projectData.organizationId) : null;
          const freelancer = await UnifiedStorageService.getUserById(result.task.freelancerId);
          const organizationName = organization?.name || 'Organization';
          const freelancerName = freelancer?.name || 'Freelancer';

          // Calculate remaining budget (total budget - total paid to date)
          const projectBudget = Number(projectData?.totalBudget || projectData?.budget) || 0;
          const paidToDate = Number(projectData?.paidToDate) || 0;
          const remainingBudget = Math.max(0, projectBudget - (paidToDate + Number(invoiceAmount)));

          // Create separate invoice value notification for freelancer
          await eventLogger.logEvent({
            id: `milestone_payment_received_${result.task.projectId}_${taskId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'milestone_payment_received',
            notificationType: NOTIFICATION_TYPES.MILESTONE_PAYMENT_RECEIVED,
            actorId: actorId, // Commissioner who approved
            targetId: result.task.freelancerId, // Freelancer receives payment
            entityType: ENTITY_TYPES.INVOICE,
            entityId: `${result.task.projectId}_${Number(taskId)}`,
            metadata: {
              taskTitle: result.task.title,
              projectTitle: result.task.projectTitle,
              projectId: result.task.projectId,
              taskId: Number(taskId),
              invoiceGenerated: result.invoiceGenerated || false,
              amount: invoiceAmount,
              invoiceNumber: invoiceNumber,
              organizationName: organizationName
            },
            context: {
              projectId: result.task.projectId,
              taskId: Number(taskId),
              invoiceNumber: invoiceNumber
            }
          });

          // Create separate payment notification for commissioner
          await eventLogger.logEvent({
            id: `milestone_payment_sent_${result.task.projectId}_${taskId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'milestone_payment_sent',
            notificationType: NOTIFICATION_TYPES.MILESTONE_PAYMENT_SENT,
            actorId: actorId, // Commissioner who approved
            targetId: actorId, // Commissioner receives their own payment notification
            entityType: ENTITY_TYPES.INVOICE,
            entityId: `${result.task.projectId}_${Number(taskId)}`,
            metadata: {
              taskTitle: result.task.title,
              projectTitle: result.task.projectTitle,
              projectId: result.task.projectId,
              taskId: Number(taskId),
              freelancerName: freelancerName,
              amount: invoiceAmount,
              invoiceNumber: invoiceNumber,
              remainingBudget: remainingBudget,
              projectBudget: projectBudget
            },
            context: {
              projectId: result.task.projectId,
              taskId: Number(taskId),
              invoiceNumber: invoiceNumber
            }
          });

          console.log(`✅ Payment notifications created for task ${taskId} approval`);
        }
      } catch (eventError) {
        console.error('Error logging event:', eventError);
        // Don't fail the main operation if event logging fails
      }
    }

    // Check for project completion and send rating notifications (only for task approvals)
    // Run this asynchronously to avoid blocking the response
    if (result.success && action === 'approve' && eventType === 'task_approved' && result.task) {
      const taskData = result.task; // Capture task data for async operation

      // Fire and forget - don't await this to improve response time
      setImmediate(async () => {
        try {
          // ✅ Check if this was the final task AFTER status update using fresh data
          const { detectProjectCompletion } = await import('../../../../lib/notifications/project-completion-detector');
          const completionStatus = await detectProjectCompletion(
            taskData.projectId,
            taskData.taskId
          );

          if (completionStatus.isComplete && completionStatus.isFinalTask) {
            // Get project and user data for rating notifications
            const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
            const project = await UnifiedStorageService.getProjectById(taskData.projectId);

            if (project) {
              // Verify this is actually a milestone-based project before sending rating notifications
              const isMilestoneProject = project.invoicingMethod === 'milestone';

              if (isMilestoneProject && project.freelancerId && project.commissionerId) {
                const userNames = await getUserNamesForRating(project.freelancerId, project.commissionerId);

                // For final tasks, the rating notifications should be combined with project completion
                // This matches the requirement: "project complete + commissioner rating prompt notification"
                await sendProjectCompletionRatingNotifications({
                  projectId: Number(project.projectId),
                  projectTitle: project.title || 'Untitled Project',
                  freelancerId: project.freelancerId,
                  freelancerName: userNames.freelancerName,
                  commissionerId: project.commissionerId,
                  commissionerName: userNames.commissionerName,
                  completedTaskTitle: taskData.title
                });

                console.log(`🎉 Final task approved - sent completion and rating notifications for milestone project ${taskData.projectId}`);
              } else {
                console.log(`ℹ️ Skipping rating notifications for non-milestone project ${taskData.projectId}`);
              }
            }
          }
        } catch (ratingError) {
          console.error('Error sending rating notifications:', ratingError);
          // This is fire-and-forget, so errors don't affect the main response
        }
      });
    }

    // Return success response
    if (!result.task) {
      return NextResponse.json(
        err(ErrorCodes.INTERNAL_ERROR, 'Task data not available in result', 500),
        { status: 500 }
      );
    }

    // Build response with additional metadata for milestone guard
    const responseData: any = {
      entities: {
        task: {
          id: result.task.taskId,
          title: result.task.title,
          status: result.task.status,
          completed: result.task.completed,
          version: result.task.version,
          projectId: result.task.projectId,
        }
      },
      message: result.message,
      notificationsQueued: result.shouldNotify
    };

    // Add project and invoice information for milestone guard
    if ('project' in result && result.project) {
      responseData.entities.project = result.project;
    }
    if ('invoiceGenerated' in result) {
      responseData.invoiceGenerated = result.invoiceGenerated;
      if (result.invoiceGenerated) {
        responseData.entities.invoice = { generated: true };
      }
    }

    return NextResponse.json(ok(responseData));

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