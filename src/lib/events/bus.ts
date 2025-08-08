

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
      results.push(await t);
    } catch (err) {
      console.warn(`[events.bus] handler rejected for ${key}:`, err);
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
      await emitInvoicePaid(p.actorId, p.targetId, p.projectId, p.invoiceNumber, p.amount, p.projectTitle);
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