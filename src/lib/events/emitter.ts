import { EventData, EventType, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger'
import { NotificationStorage } from '@/lib/notifications/notification-storage'

/**
 * Emits a generic event by appending it to NotificationStorage.
 * Automatically generates an id and timestamp.
 * Uses proper types for EventData structure.
 */
export function emitEvent(event: Omit<EventData, 'id' | 'timestamp'>) {
  const newEvent: EventData = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  // Use the proper addEvent method from NotificationStorage
  NotificationStorage.addEvent(newEvent);
}

/**
 * Emits an 'invoice_paid' event.
 * Uses proper EventData structure with correct types.
 */
export function emitInvoicePaid(
  actorId: string | number,
  targetId: string | number,
  projectId: string | number,
  invoiceNumber: string,
  amount: number,
  projectTitle?: string
) {
  const actorNum = Number(actorId);
  const targetNum = Number(targetId);
  const projectIdNum = Number(projectId);

  emitEvent({
    type: 'invoice_paid' as EventType,
    notificationType: NOTIFICATION_TYPES.INVOICE_PAID,
    actorId: actorNum,
    targetId: targetNum,
    entityType: ENTITY_TYPES.INVOICE,
    entityId: invoiceNumber,
    context: {
      projectId: projectIdNum,
      invoiceNumber,
    },
    metadata: {
      amount,
      projectTitle,
    },
  });
}

/**
 * Emits a 'task_approved' event.
 * Uses proper EventData structure with correct types.
 */
export function emitTaskApproved(
  actorId: string | number,
  targetId: string | number,
  projectId: string | number,
  taskId: string | number,
  taskTitle?: string
) {
  const actorNum = Number(actorId);
  const targetNum = Number(targetId);
  const projectIdNum = Number(projectId);

  emitEvent({
    type: 'task_approved' as EventType,
    notificationType: NOTIFICATION_TYPES.TASK_APPROVED,
    actorId: actorNum,
    targetId: targetNum,
    entityType: ENTITY_TYPES.TASK,
    entityId: Number(taskId),
    context: {
      projectId: projectIdNum,
      taskId: Number(taskId),
    },
    metadata: {
      taskTitle,
    },
  });
}
