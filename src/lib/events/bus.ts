

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

// Helper: normalize projectId to string
function normalizeProjectId(projectId: string | number | undefined | null): string {
  const s = String(projectId ?? '').trim();
  if (!s) throw new Error(`Invalid project ID: ${projectId}`);
  return s;
}

// Helper: tolerant invoice amount resolver
async function resolveInvoiceAmount(invoiceNumber: string): Promise<number> {
  try {
    const { getInvoiceByNumber } = await import('../invoice-storage');
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) return 0;
    const direct = (invoice as any).totalAmount ?? (invoice as any).amount ?? (invoice as any).total ?? (invoice as any).grandTotal;
    if (typeof direct === 'number' && direct > 0) return direct;
    // Try summing milestones/line items
    const items: any[] = (invoice as any).milestones || (invoice as any).items || [];
    const sum = items.reduce((acc, it) => {
      const val = (it?.total ?? it?.amount ?? it?.rate ?? 0);
      return acc + (typeof val === 'number' ? val : Number(val) || 0);
    }, 0);
    return sum > 0 ? sum : 0;
  } catch {
    return 0;
  }
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
      // Safety isolation guard - never throw past this point
      if (process.env.PAYMENT_NOTIFS_DISABLED === 'true') {
        console.log('[payment-notifs] Disabled via PAYMENT_NOTIFS_DISABLED flag');
        return;
      }

      // Try new gateway first (feature-flagged)
      const useNewGateway = process.env.NOTIFS_SINGLE_EMITTER === 'true';

      if (useNewGateway) {
        try {
          const { enrichPaymentData } = await import('../notifications/payment-enrichment');
          const { emitMilestonePaymentNotifications, shouldDisableGenericPaymentNotifications } = await import('../notifications/payment-notification-gateway');

          // Enrich payment data at emit-time
          const enrichedData = await enrichPaymentData({
            actorId: p.actorId,
            targetId: p.targetId,
            projectId: p.projectId,
            invoiceNumber: p.invoiceNumber,
            amount: p.amount,
            projectTitle: p.projectTitle
          });

          if (enrichedData) {
            // Emit through new gateway
            await emitMilestonePaymentNotifications(enrichedData);

            // Skip legacy/generic emitters if flag is set
            if (shouldDisableGenericPaymentNotifications()) {
              console.log('[payment-notifs] Gateway emission complete, skipping legacy');
              return;
            }
          } else {
            console.warn('[payment-notifs] Enrichment failed, falling back to legacy');
          }
        } catch (gatewayError) {
          console.warn('[payment-notifs] Gateway failed, falling back to legacy:', gatewayError);
        }
      }

      // Legacy implementation (preserved for rollback safety)
      const { eventLogger } = await import('../events/event-logger');
      const { UnifiedStorageService } = await import('../storage/unified-storage-service');
      const { NotificationStorage } = await import('../notifications/notification-storage');

      // Normalize inputs (PHASE 0)
      const projectIdStr = normalizeProjectId(p.projectId as any);
      const invoiceNumber = String(p.invoiceNumber || '').trim();

      // Helper: eventKey + duplicate finder (PHASE 1)
      const makeKey = (type: string, audience: 'commissioner' | 'freelancer') => `${type}:${audience}:${projectIdStr}:${invoiceNumber}`;
      const findExisting = (type: string) => {
        const recent = NotificationStorage.getRecentEvents(1000);
        return recent.find((e: any) => (
          e.type === type && (
            e.metadata?.eventKey === `${type}:${'commissioner'}:${projectIdStr}:${invoiceNumber}` ||
            e.metadata?.eventKey === `${type}:${'freelancer'}:${projectIdStr}:${invoiceNumber}` ||
            (String(e.metadata?.invoiceNumber || e.context?.invoiceNumber || '').trim() === invoiceNumber &&
             String(e.metadata?.projectId || e.context?.projectId || '').trim() === projectIdStr)
          )
        ));
      };
      const betterCommissioner = (ev: any) => !!(Number(ev?.metadata?.amount) > 0 && ev?.metadata?.freelancerName && ev.metadata.freelancerName !== 'Freelancer');
      const betterFreelancer = (ev: any) => !!(Number(ev?.metadata?.amount) > 0 && (ev?.metadata?.organizationName || ev?.metadata?.orgName));

      // Load project + parties (PHASE 2/3)
      const project = await UnifiedStorageService.getProjectById(projectIdStr);
      const commissioner = await UnifiedStorageService.getUserById(p.actorId as any);

      if (project && commissioner) {
        // Organization name (tolerant)
        let organizationName = '';
        if (project.organizationId) {
          try {
            const org = await UnifiedStorageService.getOrganizationById(project.organizationId);
            organizationName = String(org?.name || '').trim();
          } catch (orgError) {
            console.warn('[events.bus] Could not fetch organization:', orgError);
          }
        }

        // Amount resolver (PHASE 3)
        let invoiceAmount = Number(p.amount) || 0;
        if (!(invoiceAmount > 0) && invoiceNumber) {
          invoiceAmount = await resolveInvoiceAmount(invoiceNumber);
        }

        // Freelancer (for commissioner branch only)
        const freelancer = await UnifiedStorageService.getUserById(p.targetId as any);
        const freelancerName: string | null = freelancer?.name || null;

        // Budgets
        const totalBudget = Number(project.totalBudget) || 0;
        const currentPaidToDate = Number(project.paidToDate) || 0;
        const remainingBudget = Math.max(0, totalBudget - currentPaidToDate);

        // Build base metadata
        const taskTitle = p.projectTitle || project.title || 'Task';
        const projectTitle = project.title || p.projectTitle || 'Project';

        let emittedCommissioner = false;
        let emittedFreelancer = false;

        // FREELANCER BRANCH (payment_received) — independent (PHASE 2)
        const freelancerKey = makeKey('milestone_payment_received', 'freelancer');
        const existingFreelancer = findExisting('milestone_payment_received');
        const freelancerGuardOk = organizationName && invoiceAmount > 0;
        if (!freelancerGuardOk) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[skip-guard]', freelancerKey, { missingFields: { organizationName, invoiceAmount } });
          }
        } else if (existingFreelancer && betterFreelancer(existingFreelancer)) {
          if (process.env.NODE_ENV !== 'production') console.log('[skip-duplicate]', freelancerKey);
        } else {
          const payload = {
            id: `milestone_payment_${projectIdStr}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'milestone_payment_received',
            notificationType: 42,
            actorId: Number(p.actorId),
            targetId: Number(p.targetId),
            entityType: 10, // MILESTONE
            entityId: `${projectIdStr}_${taskTitle}`,
            metadata: {
              milestoneTitle: taskTitle,
              amount: invoiceAmount,
              organizationName,
              invoiceNumber,
              projectBudget: totalBudget,
              projectTitle,
              remainingBudget,
              eventKey: freelancerKey,
              audience: 'freelancer'
            },
            context: { projectId: projectIdStr, milestoneTitle: taskTitle, invoiceNumber }
          } as const;
          if (process.env.NODE_ENV !== 'production') console.log('[emit]', freelancerKey, { audience: 'freelancer', amount: invoiceAmount, nameUsed: organizationName });
          await eventLogger.logEvent(payload as any);
          emittedFreelancer = true;
        }

        // COMMISSIONER BRANCH (payment_sent) — independent (PHASE 2)
        const commissionerKey = makeKey('milestone_payment_sent', 'commissioner');
        const existingCommissioner = findExisting('milestone_payment_sent');
        const commissionerGuardOk = !!(freelancerName && invoiceAmount > 0);
        if (!commissionerGuardOk) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[skip-guard]', commissionerKey, { missingFields: { freelancerName, invoiceAmount } });
          }
        } else if (existingCommissioner && betterCommissioner(existingCommissioner)) {
          if (process.env.NODE_ENV !== 'production') console.log('[skip-duplicate]', commissionerKey);
        } else {
          const payload = {
            id: `milestone_payment_sent_${projectIdStr}_${invoiceNumber}`,
            timestamp: new Date().toISOString(),
            type: 'milestone_payment_sent',
            notificationType: 43,
            actorId: Number(p.actorId),
            targetId: Number(p.actorId),
            entityType: 5, // MILESTONE
            entityId: `${projectIdStr}_${invoiceNumber}`,
            metadata: {
              taskTitle,
              projectTitle,
              projectId: projectIdStr,
              freelancerName,
              amount: invoiceAmount,
              invoiceNumber,
              remainingBudget,
              projectBudget: totalBudget,
              eventKey: commissionerKey,
              audience: 'commissioner'
            },
            context: { projectId: projectIdStr, invoiceNumber }
          } as const;
          if (process.env.NODE_ENV !== 'production') console.log('[emit]', commissionerKey, { audience: 'commissioner', amount: invoiceAmount, nameUsed: freelancerName });
          await eventLogger.logEvent(payload as any);
          emittedCommissioner = true;
        }

        // PHASE 4: Gate generic/fallback emitter (feature-flagged)
        const shouldSkipGeneric = process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT === 'true' &&
                                  process.env.NOTIFS_SINGLE_EMITTER === 'true';

        if (!shouldSkipGeneric && !emittedCommissioner && !emittedFreelancer) {
          // Only fallback if nothing enriched was (or could be) emitted
          emitInvoicePaid(p.actorId, p.targetId, projectIdStr, invoiceNumber, invoiceAmount || p.amount, p.projectTitle);
        } else if (shouldSkipGeneric) {
          console.log('[payment-notifs] Generic payment notifications disabled via feature flag');
        }
      } else {
        console.warn('[events.bus] ⚠️ Could not find project or commissioner data for milestone payment notification');
        const shouldSkipGeneric = process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT === 'true' &&
                                  process.env.NOTIFS_SINGLE_EMITTER === 'true';
        if (!shouldSkipGeneric) {
          emitInvoicePaid(p.actorId, p.targetId, projectIdStr, invoiceNumber, p.amount, p.projectTitle);
        }
      }
    } catch (e) {
      console.warn('[events.bus] payment notifs failed, approvals unaffected:', e);
      // Intentionally swallow to avoid impacting task approval flow
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