/**
 * Centralized event emission functions with deterministic idempotency keys
 * This ensures consistent event emission across the application and prevents duplicates
 */

import { emit as emitBus } from './bus';
import { NotificationStorage } from '../notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from './event-logger';

/**
 * Generate deterministic idempotency key for events
 */
function generateIdempotencyKey(eventType: string, ...identifiers: (string | number)[]): string {
  return `${eventType}:${identifiers.join(':')}`;
}

/**
 * Emit milestone payment event with idempotency
 */
export async function emitMilestonePayment(params: {
  commissionerId: number;
  freelancerId: number;
  projectId: string | number;
  invoiceNumber: string;
  amount: number;
  projectTitle?: string;
}): Promise<void> {
  const idempotencyKey = generateIdempotencyKey('invoice.paid', params.invoiceNumber);
  
  try {
    // Emit bus event for real-time notifications
    await emitBus('invoice.paid', {
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      projectId: params.projectId,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      projectTitle: params.projectTitle,
      idempotencyKey
    });

    console.log(`🔔 Emitted milestone payment event: ${idempotencyKey}`);
  } catch (error) {
    console.error(`Failed to emit milestone payment event ${idempotencyKey}:`, error);
    throw error;
  }
}

/**
 * Emit task approval event with idempotency
 */
export async function emitTaskApproved(params: {
  commissionerId: number;
  freelancerId: number;
  projectId: string | number;
  taskId: string | number;
  taskTitle?: string;
  milestoneId?: string | number;
}): Promise<void> {
  const idempotencyKey = generateIdempotencyKey(
    'task.approved', 
    params.projectId, 
    params.taskId
  );
  
  try {
    // Create task approval notification
    const taskApprovalEvent = {
      id: idempotencyKey,
      timestamp: new Date().toISOString(),
      type: 'task_approved' as const,
      notificationType: NOTIFICATION_TYPES.TASK_APPROVED,
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      entityType: ENTITY_TYPES.TASK,
      entityId: Number(params.taskId),
      metadata: {
        taskId: Number(params.taskId),
        taskTitle: params.taskTitle || 'Task',
        projectTitle: undefined, // Will be enriched by notification system
        idempotencyKey
      },
      context: {
        projectId: Number(params.projectId),
        taskId: Number(params.taskId),
        milestoneId: params.milestoneId
      }
    };

    // Store notification
    NotificationStorage.addEvent(taskApprovalEvent);

    // Emit bus event for additional processing
    await emitBus('task.approved', {
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      projectId: params.projectId,
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      idempotencyKey
    });

    console.log(`✅ Emitted task approval event: ${idempotencyKey}`);
  } catch (error) {
    console.error(`Failed to emit task approval event ${idempotencyKey}:`, error);
    throw error;
  }
}

/**
 * Emit project completion event with idempotency
 */
export async function emitProjectComplete(params: {
  projectId: string | number;
  freelancerId: number;
  commissionerId: number;
  projectTitle?: string;
  finalTaskTitle?: string;
}): Promise<void> {
  const idempotencyKey = generateIdempotencyKey('project.complete', params.projectId);
  
  try {
    // Create project completion notification events
    const timestamp = new Date().toISOString();

    // Freelancer notification
    const freelancerEvent = {
      id: `${idempotencyKey}_freelancer`,
      timestamp,
      type: 'project_completed' as const,
      notificationType: NOTIFICATION_TYPES.PROJECT_COMPLETED,
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: Number(params.projectId),
      metadata: {
        projectTitle: params.projectTitle || 'Project',
        finalTaskTitle: params.finalTaskTitle,
        idempotencyKey
      },
      context: {
        projectId: Number(params.projectId)
      }
    };

    // Commissioner notification
    const commissionerEvent = {
      id: `${idempotencyKey}_commissioner`,
      timestamp,
      type: 'project_completed' as const,
      notificationType: NOTIFICATION_TYPES.PROJECT_COMPLETED,
      actorId: params.freelancerId,
      targetId: params.commissionerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: Number(params.projectId),
      metadata: {
        projectTitle: params.projectTitle || 'Project',
        finalTaskTitle: params.finalTaskTitle,
        idempotencyKey
      },
      context: {
        projectId: Number(params.projectId)
      }
    };

    // Store notifications
    NotificationStorage.addEvent(freelancerEvent);
    NotificationStorage.addEvent(commissionerEvent);

    // Emit bus event for additional processing
    await emitBus('project.complete', {
      projectId: params.projectId,
      freelancerId: params.freelancerId,
      commissionerId: params.commissionerId,
      projectTitle: params.projectTitle,
      idempotencyKey
    });

    console.log(`🎉 Emitted project completion event: ${idempotencyKey}`);
  } catch (error) {
    console.error(`Failed to emit project completion event ${idempotencyKey}:`, error);
    throw error;
  }
}

/**
 * Emit task reopened event (for rollback scenarios)
 */
export async function emitTaskReopened(params: {
  commissionerId: number;
  freelancerId: number;
  projectId: string | number;
  taskId: string | number;
  taskTitle?: string;
  reason?: string;
}): Promise<void> {
  const idempotencyKey = generateIdempotencyKey(
    'task.reopened', 
    params.projectId, 
    params.taskId,
    Date.now() // Include timestamp to allow multiple reopens
  );
  
  try {
    // Create task reopened notification
    const taskReopenedEvent = {
      id: idempotencyKey,
      timestamp: new Date().toISOString(),
      type: 'task_reopened' as const,
      notificationType: NOTIFICATION_TYPES.TASK_REJECTED, // Reuse existing type
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      entityType: ENTITY_TYPES.TASK,
      entityId: Number(params.taskId),
      metadata: {
        taskId: Number(params.taskId),
        taskTitle: params.taskTitle || 'Task',
        reason: params.reason || 'Task reopened for revision',
        idempotencyKey
      },
      context: {
        projectId: Number(params.projectId),
        taskId: Number(params.taskId)
      }
    };

    // Store notification
    NotificationStorage.addEvent(taskReopenedEvent);

    // Emit bus event
    await emitBus('task.reopened', {
      actorId: params.commissionerId,
      targetId: params.freelancerId,
      projectId: params.projectId,
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      reason: params.reason,
      idempotencyKey
    });

    console.log(`🔄 Emitted task reopened event: ${idempotencyKey}`);
  } catch (error) {
    console.error(`Failed to emit task reopened event ${idempotencyKey}:`, error);
    throw error;
  }
}

/**
 * Check if an event with the given idempotency key has already been processed
 */
export async function isEventProcessed(idempotencyKey: string): Promise<boolean> {
  try {
    // Check recent events for the idempotency key
    const events = NotificationStorage.getRecentEvents(1000); // Check last 1000 events
    return events.some(event => 
      event.metadata?.idempotencyKey === idempotencyKey ||
      event.id === idempotencyKey
    );
  } catch (error) {
    console.warn(`Failed to check event idempotency for ${idempotencyKey}:`, error);
    return false; // Assume not processed if check fails
  }
}

/**
 * Emit event with idempotency check
 */
export async function emitWithIdempotency<T>(
  idempotencyKey: string,
  emitFunction: () => Promise<T>
): Promise<T | null> {
  if (await isEventProcessed(idempotencyKey)) {
    console.log(`⏭️ Skipping already processed event: ${idempotencyKey}`);
    return null;
  }

  return await emitFunction();
}
