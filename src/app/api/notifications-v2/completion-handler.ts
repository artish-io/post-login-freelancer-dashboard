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
      id: `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event.type,
      notificationType: 50, // Completion event type
      actorId: event.actorId,
      targetId: event.targetId,
      entityType: 1, // Project entity type
      entityId: String((event.context as any).projectId || 'unknown'),
      metadata: event.context,
      timestamp: event.timestamp || new Date().toISOString(),
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
      'completion.rating_prompt': 157, // COMPLETION_RATING_PROMPT

      // Gig request specific completion notifications
      'completion.gig-request-upfront': 158, // GIG_REQUEST_UPFRONT_PAYMENT
      'completion.gig-request-upfront-commissioner': 161, // GIG_REQUEST_UPFRONT_PAYMENT_COMMISSIONER
      'completion.gig-request-project_activated': 159, // GIG_REQUEST_PROJECT_ACTIVATED
      'milestone.gig-request-project_activated': 160, // MILESTONE_GIG_REQUEST_PROJECT_ACTIVATED
      'completion.gig-request-commissioner-accepted': 162 // GIG_REQUEST_COMMISSIONER_ACCEPTED
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
      context: {
        projectId: event.projectId,  // ← ADD: Ensure project ID is set
        ...event.context
      },
      metadata: {
        projectId: event.projectId,  // ← ADD: Also in metadata for compatibility
        ...event.context
      },
      timestamp: event.timestamp || new Date().toISOString(),
      subsystem: 'completion_invoicing'
    };

    // 🔔 ATOMIC CONSOLE LOG: Track completion notification storage
    console.log('🔔 COMPLETION NOTIFICATION STORAGE:', {
      notificationId,
      type: event.type,
      actorId: event.actorId,
      targetId: event.targetId,
      isCommissionerNotification: event.actorId === event.targetId,
      projectId: event.projectId,
      timestamp: new Date().toISOString()
    });

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

    // Get project data to find both commissioner and freelancer
    const project = await UnifiedStorageService.getProjectById(event.projectId);
    if (!project) {
      throw new Error(`Project ${event.projectId} not found`);
    }

    // Get commissioner data
    const commissioner = await UnifiedStorageService.getUserById(project.commissionerId);
    let orgName = 'Organization';

    if (commissioner?.organizationId) {
      const organizations = await getAllOrganizations();
      const organization = organizations.find((org: any) => org.id === commissioner.organizationId);
      if (organization) {
        orgName = organization.name;
      }
    } else if (commissioner?.name) {
      // If no organization, use commissioner name as fallback
      orgName = commissioner.name;
    }

    // Get freelancer data from project
    const freelancer = await UnifiedStorageService.getUserById(project.freelancerId);
    const freelancerName = freelancer?.name || 'Freelancer';
    const commissionerName = commissioner?.name || 'Commissioner';

    console.log(`[COMPLETION-ENRICHMENT] Project ${event.projectId}: Commissioner=${commissionerName}, Freelancer=${freelancerName}, Org=${orgName}`);

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
  const context = event.context as any;
  const orgName = context.orgName || 'Organization';
  const freelancerName = context.freelancerName || 'Freelancer';
  const commissionerName = context.commissionerName || 'Commissioner';
  const totalTasks = context.totalTasks || 4;
  const finalPercent = context.finalPercent || 88;

  // Determine if this is a commissioner notification (self-targeted)
  const isCommissionerNotification = event.actorId === event.targetId;

  switch (event.type) {
    case 'completion.project_activated':
      // This notification is only for freelancers - commissioners don't get project activation notifications
      // Format due date properly if available
      let dueDateText = 'the deadline';
      if (context?.dueDate) {
        try {
          const date = new Date(context.dueDate);
          dueDateText = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateText = context.dueDate;
        }
      }

      // Freelancer message: "[commissioner] accepted your application"
      return `${commissionerName} accepted your application for ${projectTitle}. This project is now active and includes ${totalTasks} milestones due by ${dueDateText}`;

    case 'completion.upfront_payment':
      if (isCommissionerNotification) {
        // V2 Commissioner message: "[org name] paid [freelancer] [invoice value]" + "You just paid [freelancer name] [invoice value] upfront [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to view invoice details"
        const remainingBudget = event.context.remainingBudget || 0;
        return `You just paid ${freelancerName} $${upfrontAmount} upfront ${projectTitle}. Remaining budget: $${remainingBudget}. Click here to view invoice details`;
      } else {
        // Freelancer message: "[org] has paid upfront"
        return `${orgName} has paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${event.context.remainingBudget || 0} left. Click here to view invoice details`;
      }

    case 'completion.task_approved':
      // This notification is only for freelancers - commissioners don't get task approval notifications
      // Freelancer message: "[commissioner] has approved your task"
      return `${commissionerName} has approved your submission for "${taskTitle}" in ${projectTitle}. Task approved and milestone completed. Click here to see its project tracker.`;

    case 'completion.invoice_received':
      // V2 Commissioner message: "[freelancer name] sent you an invoice for [invoice value] for [x number] approved tasks, of your active project, [project title]"
      // Note: For completion projects, it's typically 1 task per invoice
      const approvedTasksCount = 1; // Completion projects send individual task invoices
      return `${freelancerName} sent you an invoice for $${amount} for ${approvedTasksCount} approved task, of your active project, ${projectTitle}.`;

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
      // V2 Commissioner message: "You just paid [freelancer name] [invoice value] for your ongoing project, [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to see transaction activity"
      const remainingBudget = event.context.remainingBudget || 0;
      return `You just paid ${freelancerName} $${amount} for your ongoing project, ${projectTitle}. Remaining budget: $${remainingBudget}. Click here to see transaction activity`;

    case 'completion.project_completed':
      if (isCommissionerNotification) {
        // V2 Commissioner message: "You have approved all tasks for [project title]. This project is now complete"
        return `You have approved all tasks for ${projectTitle}. This project is now complete`;
      } else {
        // Freelancer message: "[commissioner] has approved all tasks"
        return `Project completed - ${commissionerName} has approved all tasks for ${projectTitle}. This project is now complete.`;
      }

    case 'completion.final_payment':
      if (isCommissionerNotification) {
        // V2 Commissioner message: "You just paid [freelancer name] a final payment of [invoice value] for your now completed project, [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to see invoice details"
        const remainingBudgetFinal = event.context.remainingBudget || 0;
        return `You just paid ${freelancerName} a final payment of $${finalAmount} for your now completed project, ${projectTitle}. Remaining budget: $${remainingBudgetFinal}. Click here to see invoice details`;
      } else {
        // Freelancer message: "[org] has paid final payment"
        return `${orgName} has paid you $${finalAmount} for ${projectTitle} final payment (remaining ${finalPercent}% of budget). Click here to view invoice details.`;
      }

    case 'completion.rating_prompt':
      if (isCommissionerNotification) {
        // Commissioner message: "Rate your experience with [freelancer]"
        return `Rate your experience with ${freelancerName}. All tasks for ${projectTitle} have been completed. Click here to rate your collaboration.`;
      } else {
        // Freelancer message: "Rate your experience with [commissioner]"
        return `Rate your experience with ${commissionerName}. All tasks for ${projectTitle} have been approved. Click here to rate your collaboration.`;
      }

    // Gig request specific notifications
    case 'completion.gig-request-upfront':
      // Only for freelancers - upfront payment from gig request acceptance
      return `${orgName} has paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${event.context.remainingBudget || 0} left. Click here to view invoice details`;

    case 'completion.gig-request-upfront-commissioner':
      // Only for commissioners - upfront payment confirmation from gig request acceptance
      return `You just paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${event.context.remainingBudget || 0} left. Click here to view invoice details`;

    case 'completion.gig-request-project_activated':
      // Only for freelancers - completion-based project activation from gig request
      const totalTasksGigCompletion = event.context.totalTasks || 1;
      let dueDateTextGigCompletion = 'the deadline';
      if (context?.dueDate) {
        try {
          const date = new Date(context.dueDate);
          dueDateTextGigCompletion = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateTextGigCompletion = context.dueDate;
        }
      }
      return `This project is now active, managed by ${commissionerName} and includes ${totalTasksGigCompletion} milestone${totalTasksGigCompletion !== 1 ? 's' : ''} due by ${dueDateTextGigCompletion}`;

    case 'milestone.gig-request-project_activated':
      // Only for freelancers - milestone-based project activation from gig request
      const totalTasksGigMilestone = event.context.totalTasks || 1;
      let dueDateTextGigMilestone = 'the deadline';
      if (context?.dueDate) {
        try {
          const date = new Date(context.dueDate);
          dueDateTextGigMilestone = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateTextGigMilestone = context.dueDate;
        }
      }
      return `This project is now active, managed by ${commissionerName} and includes ${totalTasksGigMilestone} milestone${totalTasksGigMilestone !== 1 ? 's' : ''} due by ${dueDateTextGigMilestone}`;

    case 'completion.gig-request-commissioner-accepted':
      // Only for commissioners - freelancer accepted their gig request
      const totalTasksCommissioner = event.context.totalTasks || 1;
      return `Your ${projectTitle} gig request is now an active project with ${totalTasksCommissioner} milestone${totalTasksCommissioner !== 1 ? 's' : ''}`;

    // Proposal specific completion notifications
    case 'completion.proposal-commissioner-accepted':
      // Only for freelancers - commissioner accepted their proposal
      const totalTasksProposal = event.context.totalTasks || 1;
      let dueDateTextProposal = 'the deadline';
      if (context?.dueDate) {
        try {
          const date = new Date(context.dueDate);
          dueDateTextProposal = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateTextProposal = context.dueDate;
        }
      }
      return `${commissionerName} accepted your proposal for ${projectTitle}. This project is now active and includes ${totalTasksProposal} task${totalTasksProposal !== 1 ? 's' : ''} due by ${dueDateTextProposal}`;

    case 'completion.proposal-upfront-commissioner':
      // Only for commissioners - upfront payment confirmation for proposal
      const upfrontAmountCommissioner = event.context.upfrontAmount || 0;
      return `Upfront payment of $${upfrontAmountCommissioner.toLocaleString()} has been processed for ${projectTitle}`;

    case 'completion.proposal-project_activated':
      // Only for commissioners - proposal project activation
      const totalTasksCommissionerProposal = event.context.totalTasks || 1;
      return `Your ${projectTitle} proposal is now an active project with ${totalTasksCommissionerProposal} task${totalTasksCommissionerProposal !== 1 ? 's' : ''}`;

    case 'completion.proposal-upfront':
      // Only for freelancers - upfront payment received for proposal
      const upfrontAmountFreelancer = event.context.upfrontAmount || 0;
      return `You received an upfront payment of $${upfrontAmountFreelancer.toLocaleString()} for ${projectTitle}`;

    case 'milestone.proposal-accepted':
      // Only for freelancers - milestone proposal accepted
      const totalMilestonesProposal = event.context.totalTasks || 1;
      let dueDateTextMilestoneProposal = 'the deadline';
      if (context?.dueDate) {
        try {
          const date = new Date(context.dueDate);
          dueDateTextMilestoneProposal = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateTextMilestoneProposal = context.dueDate;
        }
      }
      return `${commissionerName} accepted your proposal for ${projectTitle}. This project is now active and includes ${totalMilestonesProposal} milestone${totalMilestonesProposal !== 1 ? 's' : ''} due by ${dueDateTextMilestoneProposal}`;

    case 'milestone.proposal-project_activated':
      // Only for commissioners - milestone proposal project activation
      const totalMilestonesCommissionerProposal = event.context.totalTasks || 1;
      return `Your ${projectTitle} proposal is now an active project with ${totalMilestonesCommissionerProposal} milestone${totalMilestonesCommissionerProposal !== 1 ? 's' : ''}`;

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
