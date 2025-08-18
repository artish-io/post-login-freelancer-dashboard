

// src/lib/events/bus.ts
// Minimal in-memory event bus for server-side orchestration.
// Use this to decouple route-side writes from notification/logging side effects.

import { emitInvoicePaid, emitTaskApproved } from '@/lib/events/emitter';

export type EventHandler<P = any> = (payload: P) => any | Promise<any>;

// Internal registry
const registry: Map<string, Set<EventHandler>> = new Map();

function norm(name: string): string {
  // normalize dots/uppercase to an underscore,lcase convention
  return String(name || '').trim().toLowerCase().replaceAll('.', '_');
}

/**
 * Register an event handler for a given event.
 */
export function on<P = any>(eventName: string, handler: EventHandler<P>): void {
  const key = norm(eventName);
  const set = registry.get(key) ?? new Set();
  set.add(handler as EventHandler);
  registry.set(key, set);
}

/**
 * Remove a handler (or all handlers for an event if none provided).
 */
export function off(eventName: string, handler?: EventHandler): void {
  const key = norm(eventName);
  if (!registry.has(key)) return;
  if (!handler) {
    registry.delete(key);
    return;
  }
  const set = registry.get(key)!;
  set.delete(handler);
  if (set.size === 0) registry.delete(key);
}

/**
 * Retry wrapper for bus events with jitter and structured logging
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  eventType?: string,
  key?: string
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Add jitter between 500ms and 1500ms
      const jitter = 500 + Math.floor(Math.random() * 1000);
      // Structured error logging with code, eventType, key if available
      const errCode = (error as any)?.code || 'UNKNOWN_ERROR';
      const eventTypeStr = eventType || 'unknown_event';
      const keyStr = key || 'unknown_key';
      console.warn(`[bus] Attempt ${attempt} failed for eventType=${eventTypeStr} key=${keyStr} code=${errCode}, retrying in ${jitter}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Emit an event. Returns an array of handler results; errors are caught and logged per handler.
 */
export async function emit<P = any>(eventName: string, payload: P): Promise<any[]> {
  const key = norm(eventName);
  const set = registry.get(key);
  if (!set || set.size === 0) return [];

  const tasks: Promise<any>[] = [];
  for (const handler of Array.from(set)) {
    try {
      const result = handler(payload);
      tasks.push(Promise.resolve(result));
    } catch (err) {
      console.warn(`[events.bus] handler threw synchronously for ${key}:`, err);
    }
  }

  const results: any[] = [];
  for (const t of tasks) {
    try {
      // Use retry wrapper for critical event handlers
      const result = await withRetry(
        () => t,
        3, // maxRetries
        1000, // delay
        eventName, // eventType
        key // key
      );
      results.push(result);
    } catch (err) {
      console.warn(`[events.bus] handler rejected after retries for ${key}:`, err);
      results.push(undefined);
    }
  }
  return results;
}

/**
 * Clear all handlers (primarily for tests / hot-reload hygiene).
 */
export function clearAll(): void {
  registry.clear();
}

// ---------------- Convenience wiring ----------------
// Provide a helper to forward invoice.paid events into the notification system.
// Call this once on server bootstrap (e.g., in your route module top-level or a layout/init file).
export function registerInvoicePaidToNotifications() {
  const EVENT = 'invoice.paid';
  const handler: EventHandler<{
    actorId: number | string;
    targetId: number | string;
    projectId: number | string;
    invoiceNumber: string;
    amount: number;
    projectTitle?: string;
  }> = async (p) => {
    try {
      // For milestone payments, we need to create milestone_payment_received notifications
      // Import the milestone payment logger
      const { logMilestonePaymentWithOrg } = await import('../events/event-logger');
      const { UnifiedStorageService } = await import('../storage/unified-storage-service');

      // Get project and commissioner info to create proper milestone notification
      const project = await UnifiedStorageService.getProjectById(p.projectId); // Keep as string
      const commissioner = await UnifiedStorageService.getUserById(Number(p.actorId));

      if (project && commissioner) {
        // Get the actual organization name from the project's organizationId
        let organizationName = 'Organization'; // fallback
        if (project.organizationId) {
          try {
            const organization = await UnifiedStorageService.getOrganizationById(project.organizationId);
            if (organization && organization.name) {
              organizationName = organization.name;
            }
          } catch (orgError) {
            console.warn('[events.bus] Could not fetch organization:', orgError);
          }
        }

        // Get the actual invoice amount instead of relying on event payload
        let invoiceAmount = Number(p.amount) || 0;
        if (p.invoiceNumber) {
          try {
            const { getInvoiceByNumber } = await import('../invoice-storage');
            const invoice = await getInvoiceByNumber(p.invoiceNumber);
            if (invoice && invoice.totalAmount) {
              invoiceAmount = Number(invoice.totalAmount);
            }
          } catch (invoiceError) {
            console.warn('[events.bus] Could not fetch invoice amount:', invoiceError);
          }
        }

        // Get freelancer info for commissioner notification
        const freelancer = await UnifiedStorageService.getUserById(Number(p.targetId));
        const freelancerName = freelancer?.name || 'Freelancer';

        // Calculate remaining budget (total budget - current paid amount - this payment)
        const totalBudget = Number(project.totalBudget) || 0;
        const currentPaidToDate = Number(project.paidToDate) || 0;
        const remainingBudget = Math.max(0, totalBudget - (currentPaidToDate + invoiceAmount));

        // Create milestone_payment_received notification for freelancer
        await logMilestonePaymentWithOrg(
          Number(p.actorId), // commissionerId
          Number(p.targetId), // freelancerId
          p.projectId, // Keep as string for proper project lookup
          p.projectTitle || project.title || 'Task', // milestoneTitle
          invoiceAmount, // Use actual invoice amount
          organizationName, // Use actual organization name
          p.invoiceNumber
        );
        console.log(`[events.bus] ✅ Created milestone_payment_received notification for freelancer ${p.targetId}`);

        // Create milestone_payment_sent notification for commissioner with remaining budget
        const eventLogger = await import('../events/event-logger');
        await eventLogger.eventLogger.logEvent({
          id: `milestone_payment_sent_${p.projectId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'milestone_payment_sent',
          notificationType: 43, // MILESTONE_PAYMENT_SENT
          actorId: Number(p.actorId),
          targetId: Number(p.actorId), // Commissioner receives this notification
          entityType: 5, // MILESTONE
          entityId: `${p.projectId}_${invoiceAmount}`,
          metadata: {
            taskTitle: p.projectTitle || project.title || 'Task',
            projectTitle: p.projectTitle || project.title,
            projectId: String(p.projectId), // Ensure string type
            taskId: Date.now(), // Use timestamp as taskId fallback
            freelancerName,
            amount: invoiceAmount,
            invoiceNumber: p.invoiceNumber,
            remainingBudget,
            projectBudget: totalBudget
          },
          context: {
            projectId: Number(p.projectId.toString().replace(/[^0-9]/g, '')) || 0, // Extract numeric part
            taskId: Date.now(),
            invoiceNumber: p.invoiceNumber
          }
        });
        console.log(`[events.bus] ✅ Created milestone_payment_sent notification for commissioner ${p.actorId}`);
      } else {
        console.warn('[events.bus] ⚠️ Could not find project or commissioner data for milestone payment notification');
        // Fallback to basic invoice paid notification
        emitInvoicePaid(p.actorId, p.targetId, p.projectId, p.invoiceNumber, p.amount, p.projectTitle);
      }
    } catch (e) {
      console.warn('[events.bus] emitInvoicePaid failed:', e);
    }
  };
  on(EVENT, handler);
  // Also register underscore variant for callers that already use that form
  on('invoice_paid', handler);
}

// Register task.approved events to notifications via the emitter.
// Call this once on server bootstrap (e.g., in your route module top-level or a layout/init file).
export function registerTaskApprovedToNotifications() {
  const EVENT = 'task.approved';
  const handler: EventHandler<{
    actorId: number | string;
    targetId: number | string;
    projectId: number | string;
    taskId: number | string;
    taskTitle?: string;
  }> = async (p) => {
    try {
      emitTaskApproved(
        p.actorId,
        p.targetId,
        p.projectId,
        p.taskId,
        p.taskTitle
      );
    } catch (e) {
      console.warn('[events.bus] emitTaskApproved failed:', e);
    }
  };

  // dot-case
  on(EVENT, handler);
  // underscore variant for callers using snake_case
  on('task_approved', handler);
}

// Register task.approved events to auto-generate milestone invoices
// This ensures milestone-based projects automatically create invoices when tasks are approved
export function registerTaskApprovedToMilestoneInvoices() {
  const EVENT = 'task.approved';
  const handler: EventHandler<{
    actorId: number | string;
    targetId: number | string;
    projectId: number | string;
    taskId: number | string;
    taskTitle?: string;
  }> = async (p) => {
    try {
      console.log(`[events.bus] Processing task.approved for milestone invoice generation: taskId=${p.taskId}, projectId=${p.projectId}`);

      // Call the auto-generate milestone invoice endpoint
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/invoices/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: p.taskId,
          projectId: p.projectId,
          action: 'task_approved'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[events.bus] ✅ Milestone invoice auto-generation result:`, result.message || result.error);
      } else {
        const error = await response.text();
        console.warn(`[events.bus] ⚠️ Milestone invoice auto-generation failed (${response.status}):`, error);
      }
    } catch (e) {
      console.warn('[events.bus] ❌ Milestone invoice auto-generation error:', e);
    }
  };

  // Register the handler for both naming conventions
  on(EVENT, handler);
  on('task_approved', handler);
}