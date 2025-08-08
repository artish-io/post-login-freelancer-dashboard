// src/lib/events/bootstrap.ts
// Event bus handler registration for server-side initialization
// Call this once on server startup to register all event handlers

import { registerInvoicePaidToNotifications, registerTaskApprovedToNotifications, registerTaskApprovedToMilestoneInvoices } from '@/lib/events/bus';

let isBootstrapped = false;

/**
 * Register all event bus handlers
 * This should be called once on server startup
 */
export function bootstrapEventHandlers(): void {
  if (isBootstrapped) {
    console.log('[events.bootstrap] Already bootstrapped, skipping');
    return;
  }

  try {
    console.log('[events.bootstrap] Registering event handlers...');
    
    // Register invoice paid notifications
    registerInvoicePaidToNotifications();
    console.log('[events.bootstrap] ✅ Invoice paid notifications registered');
    
    // Register task approved notifications
    registerTaskApprovedToNotifications();
    console.log('[events.bootstrap] ✅ Task approved notifications registered');

    // Register task approved to milestone invoice auto-generation
    registerTaskApprovedToMilestoneInvoices();
    console.log('[events.bootstrap] ✅ Task approved to milestone invoice auto-generation registered');

    isBootstrapped = true;
    console.log('[events.bootstrap] 🎉 All event handlers registered successfully');
  } catch (error) {
    console.error('[events.bootstrap] ❌ Failed to register event handlers:', error);
    throw error;
  }
}

/**
 * Check if event handlers have been bootstrapped
 */
export function isEventSystemBootstrapped(): boolean {
  return isBootstrapped;
}

/**
 * Reset bootstrap state (for testing)
 */
export function resetBootstrap(): void {
  isBootstrapped = false;
}
