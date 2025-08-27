/**
 * Completion-Based Invoicing Notification Handler
 *
 * 🔒 COMPLETION-SPECIFIC: Handles completion events separate from milestone notifications
 * 🛡️ PROTECTED: Does not modify existing milestone notification handlers
 */

import { CompletionEvent, CompletionEventHandlers, validateCompletionEvent } from '@/lib/events/completion-events';
import { promises as fs } from 'fs';
import path from 'path';

// ✅ SAFE: Use existing notification infrastructure
export async function handleCompletionNotification(event: CompletionEvent): Promise<{
  success: boolean;
  notificationId?: string;
  errors?: string[];
}> {
  try {
    // Validate event structure
    const validation = validateCompletionEvent(event);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // ✅ SAFE: Enrich context with actual user and organization data
    const enrichedContext = await enrichCompletionContext(event);
    const enrichedEvent = {
      ...event,
      context: enrichedContext
    };

    // ✅ SAFE: Log event using existing infrastructure (DISABLED - causes duplicate notifications)
    // await logCompletionEvent(enrichedEvent);

    // 🔒 COMPLETION-SPECIFIC: Handle event with completion-specific logic
    const handler = CompletionEventHandlers[enrichedEvent.type];
    if (handler) {
      await handler(enrichedEvent);
    } else {
      console.warn(`No handler found for completion event type: ${enrichedEvent.type}`);
    }

    // ✅ SAFE: Integrate with existing notification system if available
    const notificationId = await integrateWithExistingNotificationSystem(enrichedEvent);

    return {
      success: true,
      notificationId
    };
    
  } catch (error) {
    console.error('Completion notification handling failed:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// 🔒 COMPLETION-SPECIFIC: Event logging (DEPRECATED - now uses hierarchical storage)
async function logCompletionEvent(event: CompletionEvent) {
  // This function is deprecated - events are now logged through the hierarchical storage system
  // in the integrateWithExistingNotificationSystem function below
  console.log(`[COMPLETION-EVENT-LOG] Event logging deprecated - using hierarchical storage for: ${event.type}`);

  // Still use the existing event logger for compatibility
  try {
    const { eventLogger } = await import('@/lib/events/event-logger');
    await eventLogger.logEvent({
      type: event.type,
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      metadata: event.context,
      timestamp: event.timestamp,
      subsystem: 'completion_invoicing'
    });
  } catch (e) {
    console.warn('Could not integrate with existing event logger:', e);
  }
}

// ✅ SAFE: Integration with existing notification system
async function integrateWithExistingNotificationSystem(event: CompletionEvent): Promise<string | undefined> {
  try {
    // Use the proper notification storage service
    const { NotificationStorage } = await import('@/lib/notifications/notification-storage');

    const notificationId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Map completion notification types to completion-specific notification types
    const notificationTypeMap: Record<string, number> = {
      'completion.project_activated': 150, // COMPLETION_PROJECT_ACTIVATED
      'completion.upfront_payment': 151, // COMPLETION_UPFRONT_PAYMENT
      'completion.task_approved': 152, // COMPLETION_TASK_APPROVED
      'completion.invoice_received': 153, // COMPLETION_INVOICE_RECEIVED
      'completion.invoice_paid': 154, // COMPLETION_INVOICE_PAID
      'completion.commissioner_payment': 45, // Custom completion payment type (not in old system)
      'completion.project_completed': 155, // COMPLETION_PROJECT_COMPLETED
      'completion.final_payment': 156, // COMPLETION_FINAL_PAYMENT
      'completion.rating_prompt': 157 // COMPLETION_RATING_PROMPT
    };

    const notificationEvent = {
      id: notificationId,
      type: event.type,
      notificationType: notificationTypeMap[event.type] || 45,
      actorId: event.actorId,
      targetId: event.targetId,
      entityType: 3, // INVOICE entity type for most completion notifications
      entityId: event.context?.invoiceNumber || event.projectId || `completion_${event.type}_${Date.now()}`,
      projectId: event.projectId,
      message: generateNotificationMessage(event),
      context: event.context,
      metadata: event.context, // Include context as metadata for compatibility
      timestamp: event.timestamp || new Date().toISOString(),
      subsystem: 'completion_invoicing'
    };

    // Use the proper notification storage method
    await NotificationStorage.addEventWithPersistentDedup(notificationEvent);

    return notificationId;
    
  } catch (error) {
    console.warn('Could not integrate with existing notification system:', error);
    return undefined;
  }
}

// 🔒 COMPLETION-SPECIFIC: Context enrichment helper
async function enrichCompletionContext(event: CompletionEvent): Promise<CompletionEvent['context']> {
  try {
    const { UnifiedStorageService, getAllOrganizations } = await import('@/lib/storage/unified-storage-service');

    // Get actor (commissioner) data
    const actor = await UnifiedStorageService.getUserById(event.actorId);
    let orgName = 'Organization';

    if (actor?.organizationId) {
      const organizations = await getAllOrganizations();
      const organization = organizations.find((org: any) => org.id === actor.organizationId);
      if (organization) {
        orgName = organization.name;
      }
    } else if (actor?.name) {
      // If no organization, use actor name as fallback
      orgName = actor.name;
    }

    // Get target (freelancer) data
    const target = await UnifiedStorageService.getUserById(event.targetId);
    const freelancerName = target?.name || 'Freelancer';
    const commissionerName = actor?.name || 'Commissioner';

    // Return enriched context
    return {
      ...event.context,
      orgName,
      freelancerName,
      commissionerName
    };
  } catch (error) {
    console.warn('Failed to enrich completion context:', error);
    // Return original context with fallback values
    return {
      ...event.context,
      orgName: event.context.orgName || 'Organization',
      freelancerName: event.context.freelancerName || 'Freelancer',
      commissionerName: event.context.commissionerName || 'Commissioner'
    };
  }
}

// 🔒 COMPLETION-SPECIFIC: Message generation
function generateNotificationMessage(event: CompletionEvent): string {
  const projectTitle = event.context.projectTitle || 'Project';
  const amount = event.context.amount || 0;
  const upfrontAmount = event.context.upfrontAmount || 0;
  const finalAmount = event.context.finalAmount || 0;
  const taskTitle = event.context.taskTitle || 'Task';
  const invoiceNumber = event.context.invoiceNumber || '';
  const orgName = event.context.orgName || 'Organization';
  const freelancerName = event.context.freelancerName || 'Freelancer';
  const commissionerName = event.context.commissionerName || 'Commissioner';
  const totalTasks = event.context.totalTasks || 4;
  const finalPercent = event.context.finalPercent || 88;

  switch (event.type) {
    case 'completion.project_activated':
      // Format due date properly if available
      let dueDateText = 'the deadline';
      if (event.context?.dueDate) {
        try {
          const date = new Date(event.context.dueDate);
          dueDateText = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateText = event.context.dueDate;
        }
      }
      return `${commissionerName} accepted your application for ${projectTitle}. This project is now active and includes ${totalTasks} milestones due by ${dueDateText}`;

    case 'completion.upfront_payment':
      // Use organization name for payer as specified by user
      return `${orgName} has paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${event.context.remainingBudget || 0} left. Click here to view invoice details`;

    case 'completion.task_approved':
      return `${commissionerName} has approved your submission for "${taskTitle}" in ${projectTitle}. Task approved and milestone completed. Click here to see its project tracker.`;

    case 'completion.invoice_received':
      return `${freelancerName} sent you a $${amount} invoice for ${taskTitle}. Click here to review.`;

    case 'completion.invoice_paid':
      // Format for freelancer receiving payment
      const taskTitleForPayment = event.context.taskTitle || taskTitle;
      const remainingBudgetForFreelancer = event.context.remainingBudget || 0;
      if (remainingBudgetForFreelancer > 0) {
        return `${orgName} has paid you $${amount} for your recent ${projectTitle} task submission. This project has a remaining budget of $${remainingBudgetForFreelancer}. Click here to view invoice details.`;
      } else {
        return `${orgName} paid you $${amount} for ${taskTitleForPayment || invoiceNumber}. Click here to view details.`;
      }

    case 'completion.commissioner_payment':
      // Format for commissioner payment confirmation
      const remainingBudget = event.context.remainingBudget || 0;
      const taskTitleForCommissioner = event.context.taskTitle || taskTitle;
      if (remainingBudget > 0) {
        return `You just paid ${freelancerName} $${amount} for submitting ${taskTitleForCommissioner} for ${projectTitle}. Remaining budget: $${remainingBudget}. Click here to see transaction activity.`;
      } else {
        return `You paid ${freelancerName} $${amount} for ${taskTitleForCommissioner || invoiceNumber}. Click here to view transaction details.`;
      }

    case 'completion.project_completed':
      // Let the main API route handle message generation for context-aware messages
      return null;

    case 'completion.final_payment':
      return `${orgName} has paid you $${finalAmount} for ${projectTitle} final payment (remaining ${finalPercent}% of budget). Click here to view invoice details.`;

    case 'completion.rating_prompt':
      return `Rate your experience with ${commissionerName}. All tasks for ${projectTitle} have been approved. Click here to rate your collaboration.`;

    default:
      return `Completion event: ${event.type}`;
  }
}

// 🔒 COMPLETION-SPECIFIC: Notification retrieval (DEPRECATED)
export async function getCompletionNotifications(userId: number, options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  projectId?: string;
}): Promise<{
  notifications: any[];
  total: number;
  unreadCount: number;
}> {
  // This function is deprecated - notifications are now retrieved through the unified notifications-v2 API
  // which reads from the hierarchical storage system
  console.warn('[DEPRECATED] getCompletionNotifications - use notifications-v2 API instead');
  return { notifications: [], total: 0, unreadCount: 0 };
}

// 🔒 COMPLETION-SPECIFIC: Mark notifications as read (DEPRECATED)
export async function markCompletionNotificationsAsRead(
  userId: number,
  notificationIds: string[]
): Promise<{ success: boolean; updatedCount: number }> {
  // This function is deprecated - notifications are now marked as read through the unified notifications-v2 API
  // which updates the hierarchical storage system
  console.warn('[DEPRECATED] markCompletionNotificationsAsRead - use notifications-v2 API instead');
  return { success: true, updatedCount: 0 };
}
