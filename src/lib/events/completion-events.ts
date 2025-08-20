/**
 * Completion-Based Invoicing Event Types and Handlers
 *
 * 🔒 COMPLETION-SPECIFIC: Event type definitions separate from milestone events
 * 🛡️ PROTECTED: Does not modify existing milestone event types
 */

import { promises as fs } from 'fs';
import path from 'path';

// 🔒 COMPLETION-SPECIFIC: Event type definitions (8 types total)
export type CompletionEventType =
  | 'completion.project_activated'      // Project acceptance
  | 'completion.upfront_payment'        // 12% upfront payment
  | 'completion.task_approved'          // Individual task approval
  | 'completion.invoice_received'       // Manual invoice from freelancer
  | 'completion.invoice_paid'           // Manual invoice payment
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
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const freelancerName = event.context.freelancerName || 'Freelancer';
    const totalTasks = event.context.totalTasks || 4;

    // Notification for freelancer (target) - ARTISH style
    await createCompletionNotification({
      type: 'completion.project_activated',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${commissionerName} accepted your application for ${projectTitle}. This project is now active and includes ${totalTasks} milestones due by the deadline`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor) - ARTISH style
    await createCompletionNotification({
      type: 'completion.project_activated',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You accepted ${freelancerName}'s application for ${projectTitle}. This project is now active and includes ${totalTasks} milestones due by the deadline`,
      context: event.context,
      userType: 'commissioner'
    });
  },

  'completion.upfront_payment': async (event: CompletionEvent) => {
    // Upfront payment notifications (separate from project activation)
    const projectTitle = event.context.projectTitle || 'Project';
    const upfrontAmount = event.context.upfrontAmount || 0;
    const remainingBudget = event.context.remainingBudget || 0;
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    // Notification for freelancer (target) - ARTISH style
    await createCompletionNotification({
      type: 'completion.upfront_payment',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${orgName} has paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${remainingBudget} left. Click here to view invoice details`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor) - ARTISH style
    await createCompletionNotification({
      type: 'completion.upfront_payment',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You sent ${freelancerName} an invoice for your recently activated ${projectTitle} project. This project has a budget of $${remainingBudget} left. Click here to view invoice details`,
      context: event.context,
      userType: 'commissioner'
    });
  },
  
  'completion.invoice_received': async (event: CompletionEvent) => {
    // Dual notifications for invoice creation - both freelancer and commissioner get notified
    const taskTitle = event.context.taskTitle || 'Task';
    const amount = event.context.amount || 0;
    const freelancerName = event.context.freelancerName || 'Freelancer';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const invoiceNumber = event.context.invoiceNumber || '';

    // Notification for commissioner (target) - receiving the invoice
    await createCompletionNotification({
      type: 'completion.invoice_received',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${freelancerName} sent you a $${amount} invoice for ${taskTitle}. Invoice #${invoiceNumber}. Click here to review.`,
      context: event.context,
      userType: 'commissioner'
    });

    // Notification for freelancer (actor) - confirming invoice was sent
    await createCompletionNotification({
      type: 'completion.invoice_received',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You sent ${commissionerName} a $${amount} invoice for ${taskTitle}. Invoice #${invoiceNumber}. Click here to view details.`,
      context: event.context,
      userType: 'freelancer'
    });
  },
  
  'completion.invoice_paid': async (event: CompletionEvent) => {
    // Dual notifications for invoice payment - both freelancer and commissioner get notified
    const amount = event.context.amount || 0;
    const invoiceNumber = event.context.invoiceNumber || '';
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    // Notification for freelancer (target) - receiving the payment
    await createCompletionNotification({
      type: 'completion.invoice_paid',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${orgName} paid you $${amount} for ${invoiceNumber}. Click here to view details.`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor) - confirming payment was sent
    await createCompletionNotification({
      type: 'completion.invoice_paid',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You paid ${freelancerName} $${amount} for ${invoiceNumber}. Click here to view transaction details.`,
      context: event.context,
      userType: 'commissioner'
    });
  },
  
  'completion.project_completed': async (event: CompletionEvent) => {
    // Notify both parties about project completion (separate from payment) - ARTISH style
    const projectTitle = event.context.projectTitle || 'Project';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    // Notification for freelancer (target)
    await createCompletionNotification({
      type: 'completion.project_completed',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `All tasks for ${projectTitle} have been completed and approved. Project is now complete.`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor)
    await createCompletionNotification({
      type: 'completion.project_completed',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You have approved all tasks for ${projectTitle}. Project is now complete.`,
      context: event.context,
      userType: 'commissioner'
    });
  },

  'completion.final_payment': async (event: CompletionEvent) => {
    // Notify both parties about final payment (separate from project completion) - ARTISH style
    const projectTitle = event.context.projectTitle || 'Project';
    const finalAmount = event.context.finalAmount || 0;
    const finalPercent = event.context.finalPercent || 88;
    const orgName = event.context.orgName || 'Organization';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    // Notification for freelancer (target)
    await createCompletionNotification({
      type: 'completion.final_payment',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${orgName} has paid you $${finalAmount} for ${projectTitle} final payment (remaining ${finalPercent}% of budget). Click here to view invoice details.`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor)
    await createCompletionNotification({
      type: 'completion.final_payment',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You just paid ${freelancerName} $${finalAmount} for completing ${projectTitle}. Remaining budget: $0. Click here to see transaction activity.`,
      context: event.context,
      userType: 'commissioner'
    });
  },

  'completion.task_approved': async (event: CompletionEvent) => {
    // Notify both parties about task approval (not tied to invoice) - ARTISH style
    const taskTitle = event.context.taskTitle || 'Task';
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';

    // Notification for freelancer (target)
    await createCompletionNotification({
      type: 'completion.task_approved',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `${commissionerName} has approved your submission for "${taskTitle}" in ${projectTitle}. Task approved and milestone completed. Click here to see its project tracker.`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor)
    await createCompletionNotification({
      type: 'completion.task_approved',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `You approved "${taskTitle}" in ${projectTitle}. Task approved and milestone completed. Click here to see project tracker.`,
      context: event.context,
      userType: 'commissioner'
    });
  },

  'completion.rating_prompt': async (event: CompletionEvent) => {
    // Notify both parties to rate each other after project completion - ARTISH style
    const projectTitle = event.context.projectTitle || 'Project';
    const commissionerName = event.context.commissionerName || 'Commissioner';
    const freelancerName = event.context.freelancerName || 'Freelancer';

    // Notification for freelancer (target)
    await createCompletionNotification({
      type: 'completion.rating_prompt',
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: `Rate your experience with ${commissionerName}. All tasks for ${projectTitle} have been approved. Click here to rate your collaboration.`,
      context: event.context,
      userType: 'freelancer'
    });

    // Notification for commissioner (actor)
    await createCompletionNotification({
      type: 'completion.rating_prompt',
      actorId: event.actorId,
      targetId: event.actorId, // Self-notification
      projectId: event.projectId,
      message: `Rate ${freelancerName}'s work. You have approved all task milestones for ${projectTitle}. Click here to rate their work on this project.`,
      context: event.context,
      userType: 'commissioner'
    });
  }
};

// 🔒 COMPLETION-SPECIFIC: Notification creation helper
async function createCompletionNotification(params: {
  type: CompletionEventType;
  actorId: number;
  targetId: number;
  projectId: string;
  message: string;
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
      message: params.message,
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

// 🔒 COMPLETION-SPECIFIC: Notification storage helper
async function saveCompletionNotification(notification: CompletionNotification) {
  try {
    
    // Store in completion-specific notifications file
    const notificationsPath = path.join(process.cwd(), 'data', 'completion-notifications.json');
    let notifications: CompletionNotification[] = [];
    
    try {
      const notificationsData = await fs.readFile(notificationsPath, 'utf8');
      notifications = JSON.parse(notificationsData);
    } catch (e) {
      // File doesn't exist, start with empty array
    }
    
    notifications.push(notification);
    
    await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));
    
    // Also integrate with existing notification system if available
    try {
      const { NotificationStorage } = await import('@/lib/notifications/notification-storage');
      await NotificationStorage.addEventWithPersistentDedup({
        ...notification,
        timestamp: notification.createdAt,
        subsystem: 'completion_invoicing'
      });
    } catch (e) {
      console.warn('Could not integrate with unified notification system:', e);
    }
    
  } catch (error) {
    console.error('Error saving completion notification:', error);
    throw error;
  }
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
  const totalTasks = event.context.totalTasks || 4;

  switch (event.type) {
    case 'completion.project_activated':
      return `${commissionerName} accepted your application for ${projectTitle}. This project is now active and includes ${totalTasks} milestones due by the deadline`;
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
