/**
 * Payment Notifications Observability & Healthcheck
 * 
 * Dev-only logging and healthcheck functionality as specified in sections 10 and 10A
 * of the implementation guide. Provides read-only monitoring of handler registration
 * and system state without side effects.
 */

import { getFeatureFlagStates, arePaymentHandlersBootstrapped } from './payment-notification-gateway';

/**
 * Healthcheck response interface
 */
export interface PaymentNotificationsHealthcheck {
  timestamp: string;
  environment: string;
  featureFlags: {
    NOTIFS_SINGLE_EMITTER: boolean;
    NOTIFS_DISABLE_GENERIC_FOR_PAYMENT: boolean;
    PAYMENT_NOTIFS_DISABLED: boolean;
  };
  handlers: {
    paymentNotifHandlersRegisteredCount: number;
    approvalHandlersRegisteredCount: number;
    paymentHandlersBootstrapped: boolean;
  };
  system: {
    nodeEnv: string;
    isProduction: boolean;
    loggingEnabled: boolean;
  };
  rolloutStage: 'disabled' | 'shadow' | 'hybrid' | 'cutover';
}

/**
 * Count registered handlers in the event bus (read-only)
 */
function countRegisteredHandlers(): {
  paymentNotifHandlersCount: number;
  approvalHandlersCount: number;
} {
  try {
    // This is a read-only inspection of the bus registry
    // We need to access the internal registry safely
    const busModule = require('../events/bus');
    
    // Access the internal registry if available (implementation-dependent)
    const registry = (busModule as any).registry || new Map();
    
    let paymentNotifHandlersCount = 0;
    let approvalHandlersCount = 0;
    
    // Count handlers by event type
    for (const [eventName, handlers] of registry) {
      if (eventName.includes('invoice_paid') || eventName.includes('invoice.paid')) {
        paymentNotifHandlersCount += (handlers as Set<any>).size;
      }
      if (eventName.includes('task_approved') || eventName.includes('task.approved')) {
        approvalHandlersCount += (handlers as Set<any>).size;
      }
    }
    
    return { paymentNotifHandlersCount, approvalHandlersCount };
  } catch (error) {
    // If we can't access the registry, return safe defaults
    return { paymentNotifHandlersCount: 0, approvalHandlersCount: 0 };
  }
}

/**
 * Determine current rollout stage based on feature flags
 */
function determineRolloutStage(flags: Record<string, boolean>): PaymentNotificationsHealthcheck['rolloutStage'] {
  if (flags.PAYMENT_NOTIFS_DISABLED) {
    return 'disabled';
  }
  
  if (!flags.NOTIFS_SINGLE_EMITTER) {
    return 'disabled';
  }
  
  if (flags.NOTIFS_SINGLE_EMITTER && !flags.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT) {
    return 'shadow';
  }
  
  if (flags.NOTIFS_SINGLE_EMITTER && flags.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT) {
    return 'hybrid';
  }
  
  // In practice, 'cutover' would be the same as 'hybrid' but with additional
  // confidence flags or after a certain time period
  return 'cutover';
}

/**
 * Get comprehensive healthcheck information (dev-only)
 */
export function getPaymentNotificationsHealthcheck(): PaymentNotificationsHealthcheck {
  const flags = getFeatureFlagStates();
  const handlerCounts = countRegisteredHandlers();
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    featureFlags: flags,
    handlers: {
      paymentNotifHandlersRegisteredCount: handlerCounts.paymentNotifHandlersCount,
      approvalHandlersRegisteredCount: handlerCounts.approvalHandlersCount,
      paymentHandlersBootstrapped: arePaymentHandlersBootstrapped()
    },
    system: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      isProduction,
      loggingEnabled: !isProduction
    },
    rolloutStage: determineRolloutStage(flags)
  };
}

/**
 * Log healthcheck information (dev-only)
 */
export function logPaymentNotificationsHealth(): void {
  if (process.env.NODE_ENV === 'production') {
    return; // No logging in production
  }
  
  const health = getPaymentNotificationsHealthcheck();
  
  console.log('🏥 Payment Notifications Healthcheck:');
  console.log(`   Stage: ${health.rolloutStage}`);
  console.log(`   Feature Flags:`, health.featureFlags);
  console.log(`   Handlers: Payment=${health.handlers.paymentNotifHandlersRegisteredCount}, Approval=${health.handlers.approvalHandlersRegisteredCount}`);
  console.log(`   Bootstrap: ${health.handlers.paymentHandlersBootstrapped ? '✅' : '❌'}`);
}

/**
 * Validate system state and return warnings (dev-only)
 */
export function validatePaymentNotificationsState(): {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
} {
  const health = getPaymentNotificationsHealthcheck();
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for common issues
  if (health.rolloutStage === 'disabled' && health.featureFlags.NOTIFS_SINGLE_EMITTER) {
    warnings.push('Single emitter enabled but system appears disabled');
  }
  
  if (health.handlers.paymentNotifHandlersRegisteredCount === 0) {
    warnings.push('No payment notification handlers registered');
  }
  
  if (health.handlers.paymentNotifHandlersRegisteredCount > 1) {
    warnings.push('Multiple payment notification handlers registered (possible duplicate registration)');
  }
  
  if (!health.handlers.paymentHandlersBootstrapped && health.featureFlags.NOTIFS_SINGLE_EMITTER) {
    errors.push('Payment handlers not bootstrapped but single emitter is enabled');
  }
  
  if (health.rolloutStage === 'shadow' && health.featureFlags.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT) {
    warnings.push('In shadow mode but generic notifications are disabled');
  }
  
  return {
    isHealthy: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Create a simple healthcheck endpoint response
 */
export function createHealthcheckResponse(): {
  status: 'healthy' | 'warning' | 'error';
  stage: string;
  timestamp: string;
  details?: any;
} {
  const health = getPaymentNotificationsHealthcheck();
  const validation = validatePaymentNotificationsState();
  
  let status: 'healthy' | 'warning' | 'error' = 'healthy';
  
  if (validation.errors.length > 0) {
    status = 'error';
  } else if (validation.warnings.length > 0) {
    status = 'warning';
  }
  
  const response: any = {
    status,
    stage: health.rolloutStage,
    timestamp: health.timestamp
  };
  
  // Include details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.details = {
      ...health,
      validation
    };
  }
  
  return response;
}

/**
 * Dev-only function to simulate different rollout stages for testing
 */
export function simulateRolloutStage(stage: 'disabled' | 'shadow' | 'hybrid' | 'cutover'): void {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Cannot simulate rollout stages in production');
    return;
  }
  
  console.log(`🎭 Simulating rollout stage: ${stage}`);
  
  switch (stage) {
    case 'disabled':
      process.env.NOTIFS_SINGLE_EMITTER = 'false';
      process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT = 'false';
      break;
    case 'shadow':
      process.env.NOTIFS_SINGLE_EMITTER = 'true';
      process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT = 'false';
      break;
    case 'hybrid':
    case 'cutover':
      process.env.NOTIFS_SINGLE_EMITTER = 'true';
      process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT = 'true';
      break;
  }
  
  logPaymentNotificationsHealth();
}

/**
 * Emergency function to disable all payment notifications (dev-only)
 */
export function emergencyDisablePaymentNotifications(): void {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Emergency disable should be done via environment variables in production');
    return;
  }
  
  console.log('🚨 Emergency: Disabling all payment notifications');
  process.env.PAYMENT_NOTIFS_DISABLED = 'true';
  
  logPaymentNotificationsHealth();
}
