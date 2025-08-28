/**
 * Completion-Based Invoicing Event Types and Handlers
 *
 * 🔒 COMPLETION-SPECIFIC: Event type definitions separate from milestone events
 * 🛡️ PROTECTED: Does not modify existing milestone event types
 */

import { promises as fs } from 'fs';
import path from 'path';

// 🔒 COMPLETION-SPECIFIC: Event type definitions (9 types total)
export type CompletionEventType =
  | 'completion.project_activated'      // Project acceptance
  | 'completion.upfront_payment'        // 12% upfront payment
  | 'completion.task_approved'          // Individual task approval
  | 'completion.invoice_received'       // Manual invoice from freelancer
  | 'completion.invoice_paid'           // Manual invoice payment (freelancer notification)
  | 'completion.commissioner_payment'   // Commissioner payment confirmation
  | 'completion.project_completed'      // All tasks completed
  | 'completion.final_payment'          // 88% final payment
  | 'completion.rating_prompt';         // Rating request

export interface CompletionEvent {
  type: CompletionEventType;
  actorId: number;
  targetId: number;
  projectId: string;
  context: {
    upfrontAmount?: number;
    invoiceNumber?: string;
    amount?: number;
    finalAmount?: number;
    taskId?: string;
    taskTitle?: string;
    projectTitle?: string;
    remainingBudget?: number;
    commissionerName?: string;
    freelancerName?: string;
    orgName?: string;
    finalPercent?: number;
  };
  timestamp?: string;
}

export interface CompletionNotification {
  id: string;
  type: CompletionEventType;
  actorId: number;
  targetId: number;
  projectId: string;
  message: string;
  context: CompletionEvent['context'];
  read: boolean;
  createdAt: string;
}

// 🔒 COMPLETION-SPECIFIC: Event handlers
export const CompletionEventHandlers = {
  'completion.project_activated': async (event: CompletionEvent) => {
    // Project acceptance notifications (separate from payment)
    // Business logic only - notification creation handled by completion-handler
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const freelancerName = event.context.freelancerName || 'Freelancer';
    const totalTasks = (event.context as any).totalTasks || 4;

    console.log(`[COMPLETION] Project activation notification processed: ${projectTitle} (${commissionerName} -> ${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.upfront_payment': async (event: CompletionEvent) => {
    // Upfront payment notifications (separate from project activation)
    // Business logic only - notification creation handled by completion-handler
    const projectTitle = event.context.projectTitle || 'Project';
    const upfrontAmount = event.context.upfrontAmount || 0;
    const remainingBudget = event.context.remainingBudget || 0;
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    console.log(`[COMPLETION] Upfront payment notification processed: $${upfrontAmount} for ${projectTitle} (${orgName} -> ${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },
  
  'completion.invoice_received': async (event: CompletionEvent) => {
    // Dual notifications for invoice creation - both freelancer and commissioner get notified
    // Business logic only - notification creation handled by completion-handler
    const taskTitle = event.context.taskTitle || 'Task';
    const amount = event.context.amount || 0;
    const freelancerName = event.context.freelancerName || 'Freelancer';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const invoiceNumber = event.context.invoiceNumber || '';

    console.log(`[COMPLETION] Invoice received notification processed: ${invoiceNumber} - $${amount} for ${taskTitle}`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },
  
  'completion.invoice_paid': async (event: CompletionEvent) => {
    // Dual notifications for invoice payment - both freelancer and commissioner get notified
    // Business logic only - notification creation handled by completion-handler
    const amount = event.context.amount || 0;
    const invoiceNumber = event.context.invoiceNumber || '';
    const taskTitle = event.context.taskTitle || 'task';
    const projectTitle = event.context.projectTitle || 'project';
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    console.log(`[COMPLETION] Invoice paid notification processed: ${invoiceNumber} - $${amount} for ${projectTitle} (${orgName} -> ${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.commissioner_payment': async (event: CompletionEvent) => {
    // Commissioner payment confirmation notification - ARTISH style
    // Business logic only - notification creation handled by completion-handler
    const amount = event.context.amount || 0;
    const invoiceNumber = event.context.invoiceNumber || '';
    const taskTitle = event.context.taskTitle || 'task';
    const projectTitle = event.context.projectTitle || 'project';
    const freelancerName = event.context.freelancerName || 'Freelancer';
    const remainingBudget = event.context.remainingBudget || 0;

    console.log(`[COMPLETION] Commissioner payment notification processed: ${invoiceNumber} - $${amount} for ${projectTitle}`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.project_completed': async (event: CompletionEvent) => {
    // Notify both parties about project completion (separate from payment) - ARTISH style
    // Business logic only - notification creation handled by completion-handler
    const projectTitle = event.context.projectTitle || 'Project';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    console.log(`[COMPLETION] Project completed notification processed: ${projectTitle} (${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.final_payment': async (event: CompletionEvent) => {
    // Notify both parties about final payment (separate from project completion) - ARTISH style
    // Business logic only - notification creation handled by completion-handler
    const projectTitle = event.context.projectTitle || 'Project';
    const finalAmount = event.context.finalAmount || 0;
    const finalPercent = event.context.finalPercent || 88;
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    console.log(`[COMPLETION] Final payment notification processed: $${finalAmount} for ${projectTitle} (${orgName} -> ${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.task_approved': async (event: CompletionEvent) => {
    // Notify both parties about task approval (not tied to invoice) - ARTISH style
    // Business logic only - notification creation handled by completion-handler
    const taskTitle = event.context.taskTitle || 'Task';
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';

    console.log(`[COMPLETION] Task approved notification processed: "${taskTitle}" in ${projectTitle} (${commissionerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  },

  'completion.rating_prompt': async (event: CompletionEvent) => {
    // Notify both parties to rate each other after project completion - ARTISH style
    // Business logic only - notification creation handled by completion-handler
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    console.log(`[COMPLETION] Rating prompt notification processed: ${projectTitle} (${commissionerName} <-> ${freelancerName})`);
    // Note: Actual notification creation happens in completion-handler.ts integrateWithExistingNotificationSystem
  }
};

// 🔒 COMPLETION-SPECIFIC: Notification creation helper
async function createCompletionNotification(params: {
  type: CompletionEventType;
  actorId: number;
  targetId: number;
  projectId: string;
  message: string | null;
  context: CompletionEvent['context'];
  userType: 'freelancer' | 'commissioner';
}) {
  try {
    const notification: CompletionNotification = {
      id: generateNotificationId(),
      type: params.type,
      actorId: params.actorId,
      targetId: params.targetId,
      projectId: params.projectId,
      message: params.message || '', // Can be null for dynamic generation
      context: params.context,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    // Save notification using existing infrastructure
    await saveCompletionNotification(notification);
    
    // Log event for audit trail
    console.log(`Completion notification created: ${params.type} for user ${params.targetId}`);
    
  } catch (error) {
    console.error('Failed to create completion notification:', error);
    // Don't throw - notifications shouldn't break payment flows
  }
}

// 🔒 COMPLETION-SPECIFIC: Notification storage helper (DEPRECATED)
async function saveCompletionNotification(notification: CompletionNotification) {
  // This function is deprecated - notifications are now saved through the hierarchical storage system
  // via the completion-handler's integrateWithExistingNotificationSystem function
  console.warn('[DEPRECATED] saveCompletionNotification - using hierarchical storage instead');
}

// 🔒 COMPLETION-SPECIFIC: Utility functions
function generateNotificationId(): string {
  return `comp_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCompletionNotificationMessage(event: CompletionEvent): string {
  const handlers = CompletionEventHandlers[event.type];
  if (!handlers) {
    return `Completion event: ${event.type}`;
  }

  // Generate ARTISH-style message based on event type
  const projectTitle = event.context.projectTitle || 'Project';
  const orgName = event.context.orgName || 'Organization';
  const freelancerName = event.context.freelancerName || 'Freelancer';
  const commissionerName = event.context.commissionerName || 'Commissioner';
  const totalTasks = (event.context as any).totalTasks || 4;

  switch (event.type) {
    case 'completion.project_activated':
      // Let the main API route handle message generation for context-aware messages
      return '';
    case 'completion.upfront_payment':
      return `${orgName} has paid $${event.context.upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${event.context.remainingBudget} left. Click here to view invoice details`;
    case 'completion.task_approved':
      return `${commissionerName} has approved your submission for "${event.context.taskTitle}" in ${projectTitle}. Task approved and milestone completed. Click here to see its project tracker.`;
    case 'completion.invoice_received':
      return `${freelancerName} sent you a $${event.context.amount} invoice for ${event.context.taskTitle}. Click here to review.`;
    case 'completion.invoice_paid':
      return `${orgName} paid you $${event.context.amount} for ${event.context.invoiceNumber}. Click here to view details.`;
    case 'completion.project_completed':
      return `All tasks for ${projectTitle} have been completed and approved. Project is now complete.`;
    case 'completion.final_payment':
      return `${orgName} has paid you $${event.context.finalAmount} for ${projectTitle} final payment (remaining ${event.context.finalPercent || 88}% of budget). Click here to view invoice details.`;
    case 'completion.rating_prompt':
      return `Rate your experience with ${commissionerName}. All tasks for ${projectTitle} have been approved. Click here to rate your collaboration.`;
    default:
      return `Completion event: ${event.type}`;
  }
}

// 🔒 COMPLETION-SPECIFIC: Event validation
export function validateCompletionEvent(event: CompletionEvent): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!event.type || !Object.keys(CompletionEventHandlers).includes(event.type)) {
    errors.push('Invalid or missing event type');
  }
  
  if (!event.actorId || typeof event.actorId !== 'number') {
    errors.push('Invalid or missing actorId');
  }
  
  if (!event.targetId || typeof event.targetId !== 'number') {
    errors.push('Invalid or missing targetId');
  }
  
  if (!event.projectId || typeof event.projectId !== 'string') {
    errors.push('Invalid or missing projectId');
  }
  
  if (!event.context || typeof event.context !== 'object') {
    errors.push('Invalid or missing context');
  }
  
  // Type-specific validations
  switch (event.type) {
    case 'completion.project_activated':
      if (!event.context.projectTitle) {
        errors.push('Project activation requires project title');
      }
      break;
    case 'completion.upfront_payment':
      if (!event.context.upfrontAmount || event.context.upfrontAmount <= 0) {
        errors.push('Upfront payment requires valid amount');
      }
      break;
    case 'completion.task_approved':
      if (!event.context.taskTitle) {
        errors.push('Task approval requires task title');
      }
      break;
    case 'completion.invoice_received':
    case 'completion.invoice_paid':
    case 'completion.commissioner_payment':
      if (!event.context.invoiceNumber) {
        errors.push('Invoice events require invoice number');
      }
      if (!event.context.amount || event.context.amount <= 0) {
        errors.push('Invoice events require valid amount');
      }
      break;
    case 'completion.project_completed':
      if (!event.context.projectTitle) {
        errors.push('Project completion requires project title');
      }
      break;
    case 'completion.final_payment':
      if (!event.context.finalAmount || event.context.finalAmount < 0) {
        errors.push('Final payment requires valid amount');
      }
      break;
    case 'completion.rating_prompt':
      if (!event.context.projectTitle) {
        errors.push('Rating prompt requires project title');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
