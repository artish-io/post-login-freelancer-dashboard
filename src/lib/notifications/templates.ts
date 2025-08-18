/**
 * Centralized notification templates for consistent messaging and linking
 * This ensures all notification copy and navigation links are managed in one place
 */

import { EventData } from '../events/event-logger';

export interface NotificationTemplate {
  title: string;
  message: string;
  link: string;
  icon?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TemplateContext {
  actorName: string;
  targetName?: string;
  projectTitle?: string;
  taskTitle?: string;
  amount?: number;
  organizationName?: string;
  commissionerName?: string;
  freelancerName?: string;
  remainingMilestones?: number;
  projectId?: number;
  taskId?: number;
  invoiceNumber?: string;
}

/**
 * Milestone-specific notification templates
 */
export const MILESTONE_TEMPLATES = {
  TASK_APPROVED: (context: TemplateContext): NotificationTemplate => ({
    title: `Task approved by ${context.actorName}`,
    message: `${context.actorName} has approved your submission of "${context.taskTitle}" for ${context.projectTitle || 'this project'}. This project has ${context.remainingMilestones || 0} milestone${(context.remainingMilestones || 0) !== 1 ? 's' : ''} left. Click here to see its project tracker.`,
    link: `/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/task-awaiting-review.png',
    priority: 'medium'
  }),

  TASK_APPROVED_FINAL: (context: TemplateContext): NotificationTemplate => ({
    title: `Final task approved by ${context.actorName}`,
    message: `${context.actorName} has approved your final submission of "${context.taskTitle}" for ${context.projectTitle || 'this project'}. The project is now complete! Click here to see the project tracker.`,
    link: `/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/task-awaiting-review.png',
    priority: 'high'
  }),

  MILESTONE_PAYMENT_RECEIVED: (context: TemplateContext): NotificationTemplate => ({
    title: `Payment received from ${context.organizationName || context.actorName}`,
    message: `You received $${context.amount} from ${context.organizationName || context.actorName} for completing a milestone in ${context.projectTitle || 'your project'}. Click here to see your wallet.`,
    link: `/freelancer-dashboard/wallet`,
    icon: '/icons/new-payment.png',
    priority: 'high'
  }),

  MILESTONE_PAYMENT_SENT: (context: TemplateContext): NotificationTemplate => ({
    title: `Payment sent to ${context.freelancerName || 'freelancer'}`,
    message: `You just paid ${context.freelancerName || 'the freelancer'} $${context.amount} for completing a milestone in ${context.projectTitle || 'the project'}. Click here to see transaction activity.`,
    link: `/commissioner-dashboard/payments`,
    icon: '/icons/new-payment.png',
    priority: 'medium'
  }),

  RATING_PROMPT_FREELANCER: (context: TemplateContext): NotificationTemplate => ({
    title: `Rate your collaboration with ${context.commissionerName}`,
    message: `All tasks for ${context.projectTitle} have been approved. Click here to rate your collaboration with ${context.commissionerName}.`,
    link: `/freelancer-dashboard/projects-and-invoices/projects?status=completed`,
    icon: '/icons/rating-prompt.png',
    priority: 'high'
  }),

  RATING_PROMPT_COMMISSIONER: (context: TemplateContext): NotificationTemplate => ({
    title: `Rate your collaboration with ${context.freelancerName}`,
    message: `All tasks for ${context.projectTitle} have been completed. Click here to rate your collaboration with ${context.freelancerName}.`,
    link: `/commissioner-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/rating-prompt.png',
    priority: 'high'
  }),

  PROJECT_COMPLETED: (context: TemplateContext): NotificationTemplate => ({
    title: `Project "${context.projectTitle}" completed`,
    message: `Congratulations! The project "${context.projectTitle}" has been successfully completed. All milestones have been approved and payments processed.`,
    link: `/freelancer-dashboard/projects-and-invoices/projects?status=completed`,
    icon: '/icons/project-complete.png',
    priority: 'high'
  }),

  TASK_REOPENED: (context: TemplateContext): NotificationTemplate => ({
    title: `Task "${context.taskTitle}" reopened`,
    message: `${context.actorName} has reopened the task "${context.taskTitle}" for ${context.projectTitle || 'this project'}. Please review the feedback and resubmit.`,
    link: `/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/task-rejected.png',
    priority: 'high'
  })
};

/**
 * General notification templates (non-milestone specific)
 */
export const GENERAL_TEMPLATES = {
  TASK_SUBMITTED: (context: TemplateContext): NotificationTemplate => ({
    title: `New task submission from ${context.actorName}`,
    message: `"${context.taskTitle}" is awaiting your review`,
    link: `/commissioner-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/task-submission.png',
    priority: 'medium'
  }),

  TASK_REJECTED: (context: TemplateContext): NotificationTemplate => ({
    title: `Task rejected by ${context.actorName}`,
    message: `${context.actorName} rejected "${context.taskTitle}". Revisions are required. View notes and resume progress`,
    link: `/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`,
    icon: '/icons/task-rejected.png',
    priority: 'high'
  }),

  INVOICE_CREATED: (context: TemplateContext): NotificationTemplate => ({
    title: `New invoice generated`,
    message: `Invoice ${context.invoiceNumber} has been automatically generated for your completed milestone. Click here to view details.`,
    link: `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${context.invoiceNumber}`,
    icon: '/icons/invoice-created.png',
    priority: 'medium'
  })
};

/**
 * Get notification template based on event type and context
 */
export function getNotificationTemplate(
  eventType: string,
  context: TemplateContext,
  isMilestoneProject: boolean = false,
  isFinalTask: boolean = false
): NotificationTemplate {
  // Handle milestone-specific templates
  if (isMilestoneProject) {
    switch (eventType) {
      case 'task_approved':
        return isFinalTask 
          ? MILESTONE_TEMPLATES.TASK_APPROVED_FINAL(context)
          : MILESTONE_TEMPLATES.TASK_APPROVED(context);
      
      case 'milestone_payment_received':
        return MILESTONE_TEMPLATES.MILESTONE_PAYMENT_RECEIVED(context);
      
      case 'milestone_payment_sent':
        return MILESTONE_TEMPLATES.MILESTONE_PAYMENT_SENT(context);
      
      case 'rating_prompt_freelancer':
        return MILESTONE_TEMPLATES.RATING_PROMPT_FREELANCER(context);
      
      case 'rating_prompt_commissioner':
        return MILESTONE_TEMPLATES.RATING_PROMPT_COMMISSIONER(context);
      
      case 'project_completed':
        return MILESTONE_TEMPLATES.PROJECT_COMPLETED(context);
      
      case 'task_reopened':
        return MILESTONE_TEMPLATES.TASK_REOPENED(context);
    }
  }

  // Handle general templates
  switch (eventType) {
    case 'task_submitted':
      return GENERAL_TEMPLATES.TASK_SUBMITTED(context);
    
    case 'task_rejected':
    case 'task_rejected_with_comment':
      return GENERAL_TEMPLATES.TASK_REJECTED(context);
    
    case 'invoice_created':
      return GENERAL_TEMPLATES.INVOICE_CREATED(context);
    
    default:
      // Fallback template
      return {
        title: `New ${eventType.replace('_', ' ')} notification`,
        message: `You have a new ${eventType.replace('_', ' ')} notification. Click to view details.`,
        link: '#',
        priority: 'medium'
      };
  }
}

/**
 * Generate notification content from event data
 */
export async function generateNotificationFromTemplate(
  event: EventData,
  actorName: string,
  projectData?: any,
  taskData?: any
): Promise<NotificationTemplate> {
  // Build context from event data
  const context: TemplateContext = {
    actorName,
    projectTitle: event.metadata.projectTitle || projectData?.title,
    taskTitle: event.metadata.taskTitle || taskData?.title,
    amount: event.metadata.amount,
    organizationName: event.metadata.organizationName,
    commissionerName: event.metadata.commissionerName,
    freelancerName: event.metadata.freelancerName,
    remainingMilestones: event.metadata.remainingMilestones,
    projectId: event.context?.projectId,
    taskId: event.context?.taskId,
    invoiceNumber: event.metadata.invoiceNumber
  };

  // Determine if this is a milestone project
  const isMilestoneProject = projectData?.invoicingMethod === 'milestone';
  
  // Determine if this is a final task (for milestone projects)
  const isFinalTask = event.metadata.isFinalTask || false;

  return getNotificationTemplate(event.type, context, isMilestoneProject, isFinalTask);
}

/**
 * Validate notification template
 */
export function validateTemplate(template: NotificationTemplate): boolean {
  return !!(
    template.title &&
    template.message &&
    template.link &&
    template.title.length > 0 &&
    template.message.length > 0 &&
    template.link.length > 0
  );
}

/**
 * Get all available template types
 */
export function getAvailableTemplateTypes(): string[] {
  return [
    ...Object.keys(MILESTONE_TEMPLATES),
    ...Object.keys(GENERAL_TEMPLATES)
  ];
}
