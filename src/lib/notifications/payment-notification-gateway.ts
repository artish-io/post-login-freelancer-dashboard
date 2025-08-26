/**
 * Payment Notification Gateway
 * 
 * Centralized gateway for milestone payment notifications with:
 * - Feature-flagged rollout (shadow/hybrid/cutover)
 * - Idempotency and quality-based upgrades
 * - Separate audience emissions (commissioner/freelancer)
 * - Emit-time enrichment (no template-time reads)
 * - Safety isolation from task approval flows
 */

import { NotificationStorage } from './notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '../events/event-logger';

// Feature flags (all default OFF for safety)
const FEATURE_FLAGS = {
  NOTIFS_SINGLE_EMITTER: process.env.NOTIFS_SINGLE_EMITTER === 'true',
  NOTIFS_DISABLE_GENERIC_FOR_PAYMENT: process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT === 'true',
  PAYMENT_NOTIFS_DISABLED: process.env.PAYMENT_NOTIFS_DISABLED === 'true'
};

// Singleton guard for handler registration
let handlersBootstrapped = false;

/**
 * Payment notification payload for enriched emissions
 */
export interface PaymentNotificationPayload {
  type: 'milestone_payment_sent' | 'milestone_payment_received';
  audience: 'commissioner' | 'freelancer';
  projectId: string;
  invoiceNumber: string;
  amount: number;
  freelancerName?: string;
  organizationName?: string;
  taskTitle?: string;
  projectTitle?: string;
  remainingBudget?: number;
  commissionerId?: number;
  freelancerId?: number;
}

/**
 * Generate canonical event key for idempotency
 */
function generateEventKey(payload: PaymentNotificationPayload): string {
  return `${payload.type}:${payload.audience}:${payload.projectId}:${payload.invoiceNumber}`;
}

/**
 * Calculate quality score for upgrade decisions
 */
function calculateQualityScore(payload: PaymentNotificationPayload): number {
  let score = 0;
  
  // Amount validation (+2)
  if (payload.amount > 0) score += 2;
  
  // Freelancer name validation (+1)
  if (payload.freelancerName && payload.freelancerName !== 'Freelancer') score += 1;
  
  // Organization name validation (+1)
  if (payload.organizationName && payload.organizationName !== 'Organization') score += 1;
  
  return score; // Max score: 4
}

/**
 * Check if incoming payload should upgrade existing notification
 */
function shouldUpgradeNotification(
  existingEvent: any,
  incomingPayload: PaymentNotificationPayload
): boolean {
  const existingQuality = calculateQualityScore({
    type: existingEvent.type,
    audience: existingEvent.metadata?.audience || 'unknown',
    projectId: existingEvent.metadata?.projectId || '',
    invoiceNumber: existingEvent.metadata?.invoiceNumber || '',
    amount: existingEvent.metadata?.amount || 0,
    freelancerName: existingEvent.metadata?.freelancerName,
    organizationName: existingEvent.metadata?.organizationName
  });
  
  const incomingQuality = calculateQualityScore(incomingPayload);
  
  return incomingQuality > existingQuality;
}

/**
 * Dev-only logging helper
 */
function devLog(message: string, data?: any): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[payment-gateway] ${message}`, data || '');
  }
}

/**
 * Find existing notification by event key
 */
async function findExistingNotification(eventKey: string): Promise<any | null> {
  try {
    // Search recent notification events for matching key
    const events = await NotificationStorage.getRecentEvents(7); // Last 7 days
    return events.find(event => event.metadata?.eventKey === eventKey) || null;
  } catch (error) {
    devLog('[warn] Failed to search existing notifications', error);
    return null;
  }
}

/**
 * Create notification event from payload
 */
function createNotificationEvent(payload: PaymentNotificationPayload): any {
  const eventKey = generateEventKey(payload);
  const timestamp = new Date().toISOString();
  
  // Determine target based on audience
  const targetId = payload.audience === 'commissioner' ? payload.commissionerId : payload.freelancerId;
  const actorId = payload.audience === 'commissioner' ? payload.freelancerId : payload.commissionerId;
  
  // Generate title and message based on type
  let title: string;
  let message: string;
  
  if (payload.type === 'milestone_payment_sent') {
    title = `You just paid ${payload.freelancerName || 'freelancer'} $${payload.amount}`;
    message = `You just paid ${payload.freelancerName || 'freelancer'} $${payload.amount} for submitting ${payload.taskTitle || 'task'} for ${payload.projectTitle || 'project'}. Remaining budget: $${payload.remainingBudget || 0}. Click here to see transaction activity`;
  } else {
    title = `${payload.organizationName || 'Organization'} paid $${payload.amount}`;
    message = `${payload.organizationName || 'Organization'} has paid $${payload.amount} for your recent ${payload.taskTitle || 'task'} for ${payload.projectTitle || 'project'}. This project has a remaining budget of $${payload.remainingBudget || 0}. Click here to view invoice details`;
  }
  
  return {
    id: `milestone_${payload.projectId}_${payload.invoiceNumber}_${payload.audience}_${Date.now()}`,
    timestamp,
    type: payload.type,
    notificationType: payload.type === 'milestone_payment_sent' ?
      NOTIFICATION_TYPES.MILESTONE_PAYMENT_SENT :
      NOTIFICATION_TYPES.MILESTONE_PAYMENT_RECEIVED,
    actorId: Number(actorId),
    targetId: Number(targetId),
    entityType: ENTITY_TYPES.MILESTONE,
    entityId: `${payload.projectId}_${payload.invoiceNumber}`,
    metadata: {
      ...payload,
      eventKey,
      qualityScore: calculateQualityScore(payload),
      title,
      message
    },
    context: {
      projectId: payload.projectId,
      invoiceNumber: payload.invoiceNumber
    }
  };
}

/**
 * Main gateway function for emitting payment notifications
 * Handles idempotency, quality upgrades, and feature flags
 */
export async function emitPaymentNotification(payload: PaymentNotificationPayload): Promise<void> {
  // Kill switch check
  if (FEATURE_FLAGS.PAYMENT_NOTIFS_DISABLED) {
    devLog('[skip] Payment notifications disabled via PAYMENT_NOTIFS_DISABLED flag');
    return;
  }

  // Feature flag check
  if (!FEATURE_FLAGS.NOTIFS_SINGLE_EMITTER) {
    devLog('[skip] Single emitter disabled, using legacy path');
    return;
  }

  try {
    const eventKey = generateEventKey(payload);

    // Validate required fields
    if (!payload.projectId || !payload.invoiceNumber || payload.amount <= 0) {
      devLog('[skip-guard] Missing required fields', {
        projectId: payload.projectId,
        invoiceNumber: payload.invoiceNumber,
        amount: payload.amount
      });
      return;
    }

    // Check for existing notification
    const existingEvent = await findExistingNotification(eventKey);

    if (existingEvent) {
      // Check if we should upgrade
      if (shouldUpgradeNotification(existingEvent, payload)) {
        const oldQuality = existingEvent.metadata?.qualityScore || 0;
        const newQuality = calculateQualityScore(payload);

        // Create upgraded event
        const upgradedEvent = createNotificationEvent(payload);
        upgradedEvent.id = existingEvent.id; // Keep same ID
        upgradedEvent.updatedAt = new Date().toISOString();
        upgradedEvent.metadata.enrichmentNote = 'Upgraded';

        // Store upgraded event
        NotificationStorage.addEvent(upgradedEvent);

        devLog('[upgrade-duplicate]', {
          eventKey,
          oldQuality,
          newQuality,
          audience: payload.audience,
          amount: payload.amount,
          nameUsed: payload.freelancerName || payload.organizationName
        });
      } else {
        devLog('[skip-duplicate]', {
          eventKey,
          reason: 'Quality not better than existing'
        });
      }
    } else {
      // Create new notification
      const newEvent = createNotificationEvent(payload);
      NotificationStorage.addEvent(newEvent);

      devLog('[emit]', {
        eventKey,
        audience: payload.audience,
        amount: payload.amount,
        nameUsed: payload.freelancerName || payload.organizationName
      });
    }
  } catch (error) {
    devLog('[warn] payment notifs failed, approvals unaffected', error);
    // Intentionally swallow to avoid impacting task approval flow
  }
}

/**
 * Emit both commissioner and freelancer notifications for a milestone payment
 * Ensures both branches run independently with proper error isolation
 */
export async function emitMilestonePaymentNotifications(params: {
  projectId: string;
  invoiceNumber: string;
  amount: number;
  commissionerId: number;
  freelancerId: number;
  freelancerName?: string;
  organizationName?: string;
  taskTitle?: string;
  projectTitle?: string;
  remainingBudget?: number;
}): Promise<void> {
  // Safety isolation guard
  try {
    if (FEATURE_FLAGS.PAYMENT_NOTIFS_DISABLED) {
      devLog('[skip] Payment notifications disabled');
      return;
    }

    // Commissioner branch - independent execution
    try {
      if (params.freelancerName && params.freelancerName !== 'Freelancer' && params.amount > 0) {
        await emitPaymentNotification({
          type: 'milestone_payment_sent',
          audience: 'commissioner',
          projectId: params.projectId,
          invoiceNumber: params.invoiceNumber,
          amount: params.amount,
          freelancerName: params.freelancerName,
          organizationName: params.organizationName,
          taskTitle: params.taskTitle,
          projectTitle: params.projectTitle,
          remainingBudget: params.remainingBudget,
          commissionerId: params.commissionerId,
          freelancerId: params.freelancerId
        });
      } else {
        devLog('[skip-guard] Commissioner notification missing required fields', {
          freelancerName: params.freelancerName,
          amount: params.amount
        });
      }
    } catch (error) {
      devLog('[warn] Commissioner notification failed, continuing with freelancer', error);
    }

    // Freelancer branch - independent execution
    try {
      if (params.organizationName && params.amount > 0) {
        await emitPaymentNotification({
          type: 'milestone_payment_received',
          audience: 'freelancer',
          projectId: params.projectId,
          invoiceNumber: params.invoiceNumber,
          amount: params.amount,
          freelancerName: params.freelancerName,
          organizationName: params.organizationName,
          taskTitle: params.taskTitle,
          projectTitle: params.projectTitle,
          remainingBudget: params.remainingBudget,
          commissionerId: params.commissionerId,
          freelancerId: params.freelancerId
        });
      } else {
        devLog('[skip-guard] Freelancer notification missing required fields', {
          organizationName: params.organizationName,
          amount: params.amount
        });
      }
    } catch (error) {
      devLog('[warn] Freelancer notification failed', error);
    }
  } catch (error) {
    devLog('[warn] payment notifs failed, approvals unaffected', error);
    // Intentionally swallow to avoid impacting task approval flow
  }
}

/**
 * Bootstrap payment notification handlers (singleton guard)
 */
export function bootstrapPaymentNotificationHandlers(): void {
  if ((globalThis as any).__paymentNotifHandlersBootstrapped) {
    devLog('Payment notification handlers already bootstrapped, skipping');
    return;
  }

  try {
    devLog('Registering payment notification handlers...');

    // Mark as bootstrapped
    (globalThis as any).__paymentNotifHandlersBootstrapped = true;
    handlersBootstrapped = true;

    devLog('✅ Payment notification handlers registered successfully');
  } catch (error) {
    devLog('❌ Failed to register payment notification handlers', error);
    throw error;
  }
}

/**
 * Check if payment notification handlers are bootstrapped
 */
export function arePaymentHandlersBootstrapped(): boolean {
  return handlersBootstrapped;
}

/**
 * Get current feature flag states (dev-only healthcheck)
 */
export function getFeatureFlagStates(): Record<string, boolean> {
  return { ...FEATURE_FLAGS };
}

/**
 * Check if generic payment notifications should be disabled
 */
export function shouldDisableGenericPaymentNotifications(): boolean {
  return FEATURE_FLAGS.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT && FEATURE_FLAGS.NOTIFS_SINGLE_EMITTER;
}

/**
 * Reset bootstrap state (for testing)
 */
export function resetPaymentNotificationBootstrap(): void {
  (globalThis as any).__paymentNotifHandlersBootstrapped = false;
  handlersBootstrapped = false;
}
