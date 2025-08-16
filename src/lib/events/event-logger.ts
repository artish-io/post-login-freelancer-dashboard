/**
 * Event-driven notification system
 * Tracks all platform activities and generates notifications
 */

import fs from 'fs';
import path from 'path';
import { NotificationStorage } from '../notifications/notification-storage';

// Notification Type Mapping - Number-based for efficiency
export const NOTIFICATION_TYPES = {
  // Task notifications (1-19) - Granular task actions
  TASK_SUBMITTED: 1,
  TASK_APPROVED: 2,
  TASK_REJECTED: 3,
  TASK_REJECTED_WITH_COMMENT: 4,
  TASK_COMPLETED: 5,
  TASK_ASSIGNED: 6,
  TASK_COMMENTED: 7,

  // Project notifications (20-39)
  PROJECT_CREATED: 20,
  PROJECT_STARTED: 21,
  PROJECT_ACTIVATED: 22,
  PROJECT_PAUSE_REQUESTED: 23,
  PROJECT_PAUSE_ACCEPTED: 24,
  PROJECT_PAUSE_REFUSED: 25,
  PROJECT_PAUSED: 26,
  PROJECT_PAUSE_REMINDER: 27,
  PROJECT_COMPLETED: 28,
  PROJECT_MILESTONE_REACHED: 29,

  // Invoice notifications (40-59) - Granular payment actions
  INVOICE_SENT: 40,
  INVOICE_PAID: 41,
  MILESTONE_PAYMENT_RECEIVED: 42,
  INVOICE_OVERDUE: 43,

  // Gig notifications (60-79)
  GIG_APPLICATION_RECEIVED: 60,
  GIG_REQUEST_SENT: 61,
  GIG_REQUEST_ACCEPTED: 62,
  GIG_MULTIPLE_APPLICATIONS: 63, // For grouping similar applications

  // Proposal notifications (80-99)
  PROPOSAL_SENT: 80,
  PROPOSAL_ACCEPTED: 81,
  PROPOSAL_REJECTED: 82,

  // Storefront notifications (100-119)
  PRODUCT_PURCHASED: 100,
  STOREFRONT_SALE: 101,
  PRODUCT_APPROVED: 102,
  PRODUCT_REJECTED: 103,

  // System notifications (120-139)
  SYSTEM_MAINTENANCE: 120,
  ACCOUNT_VERIFIED: 121,

  // Rating notifications (140-149)
  RATING_PROMPT_FREELANCER: 140,
  RATING_PROMPT_COMMISSIONER: 141
} as const;

// User type targeting for notifications
export const USER_TYPE_FILTERS = {
  COMMISSIONER_ONLY: ['task_submitted', 'gig_applied', 'invoice_sent', 'proposal_sent'],
  FREELANCER_ONLY: ['task_approved', 'task_rejected', 'task_rejected_with_comment', 'gig_request_sent', 'invoice_paid', 'milestone_payment_received', 'project_pause_accepted'],
  BOTH: ['project_created', 'project_started', 'project_pause_requested', 'product_approved', 'product_rejected']
} as const;

export interface EventData {
  id: string;
  timestamp: string;
  type: EventType;
  notificationType: number; // Maps to NOTIFICATION_TYPES
  actorId: number; // User who performed the action
  targetId?: number; // User who is affected (optional)
  entityType: number; // Number-based entity type
  entityId: number | string;
  metadata: Record<string, any>;
  context?: {
    projectId?: number;
    gigId?: number;
    organizationId?: number;
    messageThreadId?: string;
    invoiceId?: string;
    productId?: string;
    milestoneTitle?: string;
    rejectionComment?: string;
    taskId?: number;
    proposalId?: string;
    sellerId?: number;
    requestId?: string;
    invoiceNumber?: string;
  };
}

// Entity Type Mapping - Number-based for efficiency
export const ENTITY_TYPES = {
  TASK: 1,
  PROJECT: 2,
  GIG: 3,
  MESSAGE: 4,
  INVOICE: 5,
  PRODUCT: 6,
  PROPOSAL: 7,
  USER: 8,
  ORGANIZATION: 9,
  MILESTONE: 10
} as const;

export type EventType =
  // Task events - More granular
  | 'task_created' | 'task_submitted' | 'task_approved' | 'task_rejected' | 'task_rejected_with_comment'
  | 'task_completed' | 'task_commented'
  // Project events
  | 'project_created' | 'project_started' | 'project_activated' | 'project_reactivated' | 'project_paused' | 'project_resumed' | 'project_completed'
  | 'project_pause_requested' | 'project_pause_accepted' | 'project_pause_denied' | 'project_pause_refused'
  // Gig events
  | 'gig_posted' | 'gig_applied' | 'gig_rejected' | 'gig_request_sent' | 'gig_request_accepted' | 'gig_request_declined'
  // Message events
  | 'message_sent' | 'message_read'
  // Invoice events - More granular
  | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_overdue' | 'milestone_payment_received'
  // Storefront events
  | 'product_purchased' | 'product_downloaded' | 'review_posted' | 'product_approved' | 'product_rejected'
  // Proposal events
  | 'proposal_sent' | 'proposal_accepted' | 'proposal_rejected'
  // Network events
  | 'contact_added' | 'contact_removed'
  // System events
  | 'user_login' | 'user_logout' | 'profile_updated'
  // Rating events
  | 'rating_prompt_freelancer' | 'rating_prompt_commissioner';

export type EntityType =
  | 'task' | 'project' | 'gig' | 'message' | 'invoice' | 'product' | 'proposal' | 'user' | 'organization' | 'milestone';

export interface NotificationRule {
  eventType: EventType;
  targetUserTypes: ('actor' | 'target' | 'project_commissioner' | 'project_freelancer' | 'gig_owner' | 'organization_members')[];
  notificationType: string;
  titleTemplate: string;
  messageTemplate: string;
  iconType: 'avatar' | 'icon' | 'organization_logo';
  iconPath?: string;
  priority: 'low' | 'medium' | 'high';
  channels: ('in_app' | 'email' | 'push')[];
}

// Helper function to map event types to notification types
function getNotificationTypeNumber(eventType: EventType): number {
  const mapping: Record<EventType, number> = {
    // Task events
    'task_submitted': NOTIFICATION_TYPES.TASK_SUBMITTED,
    'task_approved': NOTIFICATION_TYPES.TASK_APPROVED,
    'task_rejected': NOTIFICATION_TYPES.TASK_REJECTED,
    'task_rejected_with_comment': NOTIFICATION_TYPES.TASK_REJECTED_WITH_COMMENT,
    'task_completed': NOTIFICATION_TYPES.TASK_COMPLETED,
    'task_created': NOTIFICATION_TYPES.TASK_ASSIGNED,
    'task_commented': NOTIFICATION_TYPES.TASK_COMMENTED,

    // Project events
    'project_created': NOTIFICATION_TYPES.PROJECT_CREATED,
    'project_started': NOTIFICATION_TYPES.PROJECT_STARTED,
    'project_activated': NOTIFICATION_TYPES.PROJECT_ACTIVATED,
    'project_reactivated': NOTIFICATION_TYPES.PROJECT_STARTED, // Reuse started type
    'project_pause_requested': NOTIFICATION_TYPES.PROJECT_PAUSE_REQUESTED,
    'project_pause_accepted': NOTIFICATION_TYPES.PROJECT_PAUSE_ACCEPTED,
    'project_pause_refused': NOTIFICATION_TYPES.PROJECT_PAUSE_REFUSED,
    'project_pause_denied': NOTIFICATION_TYPES.PROJECT_PAUSE_REFUSED, // Alias for refused
    'project_paused': NOTIFICATION_TYPES.PROJECT_PAUSED,
    'project_pause_reminder': NOTIFICATION_TYPES.PROJECT_PAUSE_REMINDER,
    'project_completed': NOTIFICATION_TYPES.PROJECT_COMPLETED,

    // Invoice events
    'invoice_sent': NOTIFICATION_TYPES.INVOICE_SENT,
    'invoice_paid': NOTIFICATION_TYPES.INVOICE_PAID,
    'milestone_payment_received': NOTIFICATION_TYPES.MILESTONE_PAYMENT_RECEIVED,
    'invoice_overdue': NOTIFICATION_TYPES.INVOICE_OVERDUE,

    // Gig events
    'gig_applied': NOTIFICATION_TYPES.GIG_APPLICATION_RECEIVED,
    'gig_rejected': NOTIFICATION_TYPES.GIG_APPLICATION_RECEIVED, // Reuse application type
    'gig_request_sent': NOTIFICATION_TYPES.GIG_REQUEST_SENT,
    'gig_request_accepted': NOTIFICATION_TYPES.GIG_REQUEST_ACCEPTED,

    // Proposal events
    'proposal_sent': NOTIFICATION_TYPES.PROPOSAL_SENT,
    'proposal_accepted': NOTIFICATION_TYPES.PROPOSAL_ACCEPTED,
    'proposal_rejected': NOTIFICATION_TYPES.PROPOSAL_REJECTED,

    // Storefront events
    'product_purchased': NOTIFICATION_TYPES.PRODUCT_PURCHASED,
    'product_approved': NOTIFICATION_TYPES.PRODUCT_APPROVED,
    'product_rejected': NOTIFICATION_TYPES.PRODUCT_REJECTED,

    // Default fallback for unmapped types
    'project_resumed': NOTIFICATION_TYPES.PROJECT_STARTED,
    'project_pause_denied': NOTIFICATION_TYPES.PROJECT_PAUSE_REFUSED,
    'gig_posted': NOTIFICATION_TYPES.GIG_APPLICATION_RECEIVED,
    'gig_request_declined': NOTIFICATION_TYPES.GIG_REQUEST_SENT,
    'message_sent': 0, // Messages excluded from notifications
    'message_read': 0,
    'invoice_created': NOTIFICATION_TYPES.INVOICE_SENT,
    'product_downloaded': NOTIFICATION_TYPES.PRODUCT_PURCHASED,
    'review_posted': NOTIFICATION_TYPES.PRODUCT_PURCHASED,
    'contact_added': 0,
    'contact_removed': 0,
    'user_login': 0,
    'user_logout': 0,
    'profile_updated': 0,

    // Rating events
    'rating_prompt_freelancer': NOTIFICATION_TYPES.RATING_PROMPT_FREELANCER,
    'rating_prompt_commissioner': NOTIFICATION_TYPES.RATING_PROMPT_COMMISSIONER
  };

  return mapping[eventType] || 0;
}

// Helper function to get entity type number
function getEntityTypeNumber(entityType: EntityType): number {
  const mapping: Record<EntityType, number> = {
    'task': ENTITY_TYPES.TASK,
    'project': ENTITY_TYPES.PROJECT,
    'gig': ENTITY_TYPES.GIG,
    'message': ENTITY_TYPES.MESSAGE,
    'invoice': ENTITY_TYPES.INVOICE,
    'product': ENTITY_TYPES.PRODUCT,
    'proposal': ENTITY_TYPES.PROPOSAL,
    'user': ENTITY_TYPES.USER,
    'organization': ENTITY_TYPES.ORGANIZATION,
    'milestone': ENTITY_TYPES.MILESTONE
  };

  return mapping[entityType] || 0;
}

class EventLogger {
  private logPath: string;
  private notificationRules: NotificationRule[];

  constructor() {
    this.logPath = path.join(process.cwd(), 'data', 'notifications', 'notifications-log.json');
    this.notificationRules = this.initializeNotificationRules();
  }

  private initializeNotificationRules(): NotificationRule[] {
    return [
      // Task events
      {
        eventType: 'task_submitted',
        targetUserTypes: ['project_commissioner'],
        notificationType: 'task_submission',
        titleTemplate: '{actorName} submitted a task',
        messageTemplate: '"{taskTitle}" is awaiting your review',
        iconType: 'avatar',
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'task_approved',
        targetUserTypes: ['project_freelancer'],
        notificationType: 'task_approved',
        titleTemplate: 'Task approved',
        messageTemplate: '"{taskTitle}" has been approved',
        iconType: 'icon',
        iconPath: '/icons/task-approved.png',
        priority: 'medium',
        channels: ['in_app']
      },
      {
        eventType: 'task_rejected',
        targetUserTypes: ['project_freelancer'],
        notificationType: 'task_rejected',
        titleTemplate: 'Task needs revision',
        messageTemplate: '"{taskTitle}" requires changes',
        iconType: 'icon',
        iconPath: '/icons/task-rejected.png',
        priority: 'high',
        channels: ['in_app', 'email']
      },

      // Project events - Updated per your requirements
      {
        eventType: 'project_pause_requested',
        targetUserTypes: ['project_commissioner'],
        notificationType: 'project_pause',
        titleTemplate: '{actorName} requested a pause for your {projectTitle} project',
        messageTemplate: '{pauseReason}',
        iconType: 'avatar', // Freelancer avatar on commissioner side
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'project_pause_accepted',
        targetUserTypes: ['project_freelancer'],
        notificationType: 'project_pause_accepted',
        titleTemplate: 'Project pause request approved',
        messageTemplate: 'Your request to pause the {projectTitle} project has been approved',
        iconType: 'icon',
        iconPath: '/icons/project-pause.png', // Commissioner accepts/initiates pause
        priority: 'medium',
        channels: ['in_app']
      },
      {
        eventType: 'project_activated',
        targetUserTypes: ['project_commissioner'],
        notificationType: 'project_activated',
        titleTemplate: '{actorName} has accepted your gig request for {gigTitle}',
        messageTemplate: 'This project is now active.',
        iconType: 'avatar', // Freelancer avatar on commissioner side
        priority: 'high',
        channels: ['in_app', 'email']
      },

      // Gig events - Updated per your requirements
      {
        eventType: 'gig_applied',
        targetUserTypes: ['gig_owner'],
        notificationType: 'gig_application',
        titleTemplate: '{actorName} applied for {gigTitle}',
        messageTemplate: 'New application for "{gigTitle}"',
        iconType: 'avatar',
        priority: 'medium',
        channels: ['in_app']
      },
      {
        eventType: 'gig_request_sent',
        targetUserTypes: ['target'],
        notificationType: 'gig_request',
        titleTemplate: 'New gig request from {organizationName}',
        messageTemplate: 'You have been invited to apply for {gigTitle}',
        iconType: 'organization_logo', // Commissioner's organization logo on freelancer side
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'gig_request_accepted',
        targetUserTypes: ['gig_owner'],
        notificationType: 'gig_request_accepted',
        titleTemplate: '{actorName} accepted your gig request',
        messageTemplate: 'Gig request for "{gigTitle}" has been accepted',
        iconType: 'avatar', // Freelancer avatar on commissioner side
        priority: 'high',
        channels: ['in_app', 'email']
      },

      // Invoice events - Updated per your requirements
      {
        eventType: 'invoice_sent',
        targetUserTypes: ['target'],
        notificationType: 'invoice_sent',
        titleTemplate: '{actorName} sent you a new invoice',
        messageTemplate: 'Invoice {invoiceNumber} for {projectTitle}',
        iconType: 'avatar', // Freelancer avatar on commissioner side
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'invoice_paid',
        targetUserTypes: ['actor'],
        notificationType: 'invoice_paid',
        titleTemplate: 'Payment received',
        messageTemplate: 'Your invoice for {description} has been paid',
        iconType: 'icon',
        iconPath: '/icons/new-payment.png', // Payment icon when commissioner pays
        priority: 'high',
        channels: ['in_app', 'email']
      },

      // Storefront events - Updated per your requirements
      {
        eventType: 'product_purchased',
        targetUserTypes: ['target'], // Product owner
        notificationType: 'storefront_purchase',
        titleTemplate: '{actorName} just purchased {productTitle}',
        messageTemplate: 'New sale on your storefront',
        iconType: 'icon',
        iconPath: '/icons/new-payment.png', // Payment icon for storefront sales
        priority: 'medium',
        channels: ['in_app']
      },

      // Proposal events
      {
        eventType: 'proposal_sent',
        targetUserTypes: ['target'],
        notificationType: 'proposal_sent',
        titleTemplate: '{actorName} sent you a proposal',
        messageTemplate: 'New project proposal for {proposalTitle}',
        iconType: 'avatar',
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'proposal_accepted',
        targetUserTypes: ['actor'], // Notify the freelancer who sent the proposal
        notificationType: 'proposal_accepted',
        titleTemplate: 'Proposal accepted',
        messageTemplate: 'Your proposal for {proposalTitle} has been accepted',
        iconType: 'icon',
        iconPath: '/icons/proposal-accepted.png',
        priority: 'high',
        channels: ['in_app', 'email']
      },
      {
        eventType: 'proposal_rejected',
        targetUserTypes: ['actor'], // Notify the freelancer who sent the proposal
        notificationType: 'proposal_rejected',
        titleTemplate: 'Proposal rejected',
        messageTemplate: '{organizationName} has rejected your proposal for {proposalTitle}',
        iconType: 'organization_logo',
        priority: 'medium',
        channels: ['in_app']
      }

      // NOTE: Message events are intentionally excluded from notifications
      // Messages should be handled separately in the messages system
    ];
  }

  /**
   * Log an event and generate notifications
   */
  async logEvent(eventData: EventData): Promise<void> {
    try {
      // Enhance event data with number-based fields
      const enhancedEventData: EventData = {
        ...eventData,
        notificationType: getNotificationTypeNumber(eventData.type)
        // entityType is already a number, no conversion needed
      };

      // Use the new granular storage system
      NotificationStorage.addEvent(enhancedEventData);

      // Generate notifications based on rules
      await this.generateNotifications(enhancedEventData);

      console.log(`✅ Event logged: ${eventData.type} (type: ${enhancedEventData.notificationType}) by user ${eventData.actorId}`);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  /**
   * Generate notifications based on event and rules
   */
  private async generateNotifications(eventData: EventData): Promise<void> {
    const applicableRules = this.notificationRules.filter(rule => rule.eventType === eventData.type);
    
    for (const rule of applicableRules) {
      const targetUsers = await this.resolveTargetUsers(eventData, rule.targetUserTypes);
      
      for (const userId of targetUsers) {
        const notification = await this.createNotification(eventData, rule, userId);
        if (notification) {
          await this.saveNotification(userId, notification);
        }
      }
    }
  }

  /**
   * Resolve target users based on event and rule
   */
  private async resolveTargetUsers(eventData: EventData, targetUserTypes: string[]): Promise<number[]> {
    const targetUsers: Set<number> = new Set();

    for (const userType of targetUserTypes) {
      switch (userType) {
        case 'actor':
          targetUsers.add(eventData.actorId);
          break;
        case 'target':
          if (eventData.targetId) {
            targetUsers.add(eventData.targetId);
          }
          break;
        case 'project_commissioner':
          if (eventData.context?.projectId) {
            const commissionerId = await this.getProjectCommissioner(eventData.context.projectId);
            if (commissionerId) targetUsers.add(commissionerId);
          }
          break;
        case 'project_freelancer':
          if (eventData.context?.projectId) {
            const freelancerId = await this.getProjectFreelancer(eventData.context.projectId);
            if (freelancerId) targetUsers.add(freelancerId);
          }
          break;
        case 'gig_owner':
          if (eventData.context?.gigId) {
            const gigOwnerId = await this.getGigOwner(eventData.context.gigId);
            if (gigOwnerId) targetUsers.add(gigOwnerId);
          }
          break;
      }
    }

    // Remove the actor from receiving their own notifications (except for confirmations)
    if (!['invoice_paid', 'task_approved', 'project_pause_accepted'].includes(eventData.type)) {
      targetUsers.delete(eventData.actorId);
    }

    return Array.from(targetUsers);
  }

  /**
   * Create notification object from event and rule
   */
  private async createNotification(eventData: EventData, rule: NotificationRule, targetUserId: number): Promise<any> {
    // Load user data for template variables
    const usersData = await this.loadUsers();
    const actor = usersData.find((u: any) => u.id === eventData.actorId);
    
    if (!actor) return null;

    const title = this.processTemplate(rule.titleTemplate, eventData, actor);
    const message = this.processTemplate(rule.messageTemplate, eventData, actor);

    return {
      id: `${eventData.id}-${targetUserId}`,
      type: rule.notificationType,
      title,
      message,
      timestamp: eventData.timestamp,
      isRead: false,
      user: rule.iconType === 'avatar' ? {
        id: actor.id,
        name: actor.name,
        avatar: actor.avatar,
        title: actor.title
      } : undefined,
      organization: rule.iconType === 'organization_logo' && eventData.context?.organizationId ? 
        await this.getOrganization(eventData.context.organizationId) : undefined,
      project: eventData.context?.projectId ? {
        id: eventData.context.projectId,
        title: eventData.metadata.projectTitle || 'Unknown Project'
      } : undefined,
      gig: eventData.context?.gigId ? {
        id: eventData.context.gigId,
        title: eventData.metadata.gigTitle || 'Unknown Gig'
      } : undefined,
      isFromNetwork: eventData.metadata.isFromNetwork || false,
      priority: rule.priority,
      iconPath: rule.iconPath
    };
  }

  /**
   * Process template strings with event data
   */
  private processTemplate(template: string, eventData: EventData, actor: any): string {
    return template
      .replace('{actorName}', actor.name)
      .replace('{taskTitle}', eventData.metadata.taskTitle || '')
      .replace('{projectTitle}', eventData.metadata.projectTitle || '')
      .replace('{gigTitle}', eventData.metadata.gigTitle || '')
      .replace('{organizationName}', eventData.metadata.organizationName || '')
      .replace('{invoiceNumber}', eventData.metadata.invoiceNumber || '')
      .replace('{productTitle}', eventData.metadata.productTitle || '')
      .replace('{proposalTitle}', eventData.metadata.proposalTitle || '')
      .replace('{messagePreview}', eventData.metadata.messagePreview || '')
      .replace('{pauseReason}', eventData.metadata.pauseReason || '')
      .replace('{description}', eventData.metadata.description || '');
  }

  // Helper methods to load data
  private async loadUsers(): Promise<any[]> {
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  }

  private async getProjectCommissioner(projectId: number): Promise<number | null> {
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    const project = projects.find((p: any) => p.projectId === projectId);
    return project?.commissionerId || null;
  }

  private async getProjectFreelancer(projectId: number): Promise<number | null> {
    try {
      const { UnifiedStorageService } = await import('../storage/unified-storage-service');
      const project = await UnifiedStorageService.readProject(String(projectId));
      return project?.freelancerId || null;
    } catch (error) {
      console.error('Error getting project freelancer:', error);
      return null;
    }
  }

  private async getGigOwner(gigId: number): Promise<number | null> {
    const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
    const gigs = JSON.parse(fs.readFileSync(gigsPath, 'utf-8'));
    const gig = gigs.find((g: any) => g.id === gigId);
    return gig?.commissionerId || null;
  }

  private async getOrganization(organizationId: number): Promise<any> {
    const orgsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const organizations = JSON.parse(fs.readFileSync(orgsPath, 'utf-8'));
    return organizations.find((o: any) => o.id === organizationId);
  }

  /**
   * Save notification to user's notification list
   */
  private async saveNotification(userId: number, notification: any): Promise<void> {
    // This will be implemented to save to the new notification system
    // For now, we'll add it to the existing structure for compatibility
    console.log(`Notification for user ${userId}:`, notification);
  }
}

export const eventLogger = new EventLogger();

// Convenience functions for common events
export const logTaskSubmitted = (freelancerId: number, taskId: number, projectId: number, taskTitle: string, projectTitle: string) => {
  return eventLogger.logEvent({
    id: `task_submitted_${taskId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'task_submitted',
    notificationType: NOTIFICATION_TYPES.TASK_SUBMITTED,
    actorId: freelancerId,
    entityType: ENTITY_TYPES.TASK,
    entityId: taskId,
    metadata: {
      taskTitle,
      projectTitle,
      version: 1
    },
    context: {
      projectId,
      taskId
    }
  });
};

// New granular convenience functions
export const logTaskApproved = async (commissionerId: number, freelancerId: number, taskId: number, taskTitle: string, projectId: number) => {
  // Get additional metadata for notification generation
  let projectTitle = 'Unknown Project';
  let commissionerName = 'Unknown Commissioner';
  let freelancerName = 'Unknown Freelancer';

  try {
    // Read project and user data for metadata
    const fs = require('fs').promises;
    const path = require('path');

    const [projectData, usersData] = await Promise.all([
      import('@/lib/projects-utils').then(m => m.readProject(projectId)),
      fs.readFile(path.join(process.cwd(), 'data', 'users.json'), 'utf-8').then((data: string) => JSON.parse(data))
    ]);

    if (projectData) {
      projectTitle = projectData.title || 'Unknown Project';
    }

    const commissioner = usersData.find((u: any) => u.id === commissionerId);
    const freelancer = usersData.find((u: any) => u.id === freelancerId);

    if (commissioner) commissionerName = commissioner.name;
    if (freelancer) freelancerName = freelancer.name;
  } catch (error) {
    console.error('Error reading metadata for task approved event:', error);
  }

  return eventLogger.logEvent({
    id: `task_approved_${taskId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'task_approved',
    notificationType: NOTIFICATION_TYPES.TASK_APPROVED,
    actorId: commissionerId,
    targetId: freelancerId,
    entityType: ENTITY_TYPES.TASK,
    entityId: taskId,
    metadata: {
      taskTitle,
      projectTitle,
      commissionerName,
      freelancerName,
      priority: 'medium'
    },
    context: {
      projectId
    }
  });
};

export const logTaskRejected = async (commissionerId: number, freelancerId: number, taskId: number, taskTitle: string, projectId: number, rejectionComment?: string) => {
  // Get additional metadata for notification generation
  let projectTitle = 'Unknown Project';
  let commissionerName = 'Unknown Commissioner';
  let freelancerName = 'Unknown Freelancer';

  try {
    // Read project and user data for metadata
    const fs = require('fs').promises;
    const path = require('path');

    const [projectData, usersData] = await Promise.all([
      import('@/lib/projects-utils').then(m => m.readProject(projectId)),
      fs.readFile(path.join(process.cwd(), 'data', 'users.json'), 'utf-8').then((data: string) => JSON.parse(data))
    ]);

    if (projectData) {
      projectTitle = projectData.title || 'Unknown Project';
    }

    const commissioner = usersData.find((u: any) => u.id === commissionerId);
    const freelancer = usersData.find((u: any) => u.id === freelancerId);

    if (commissioner) commissionerName = commissioner.name;
    if (freelancer) freelancerName = freelancer.name;
  } catch (error) {
    console.error('Error reading metadata for task rejected event:', error);
  }

  return eventLogger.logEvent({
    id: `task_rejected_${taskId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: rejectionComment ? 'task_rejected_with_comment' : 'task_rejected',
    notificationType: rejectionComment ? NOTIFICATION_TYPES.TASK_REJECTED_WITH_COMMENT : NOTIFICATION_TYPES.TASK_REJECTED,
    actorId: commissionerId,
    targetId: freelancerId,
    entityType: ENTITY_TYPES.TASK,
    entityId: taskId,
    metadata: {
      taskTitle,
      projectTitle,
      commissionerName,
      freelancerName,
      priority: 'high'
    },
    context: {
      projectId,
      rejectionComment
    }
  });
};

export const logMilestonePayment = (commissionerId: number, freelancerId: number, projectId: number, milestoneTitle: string, amount: number) => {
  return eventLogger.logEvent({
    id: `milestone_payment_${projectId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'milestone_payment_received',
    notificationType: NOTIFICATION_TYPES.MILESTONE_PAYMENT_RECEIVED,
    actorId: commissionerId,
    targetId: freelancerId,
    entityType: ENTITY_TYPES.MILESTONE,
    entityId: `${projectId}_${milestoneTitle}`,
    metadata: {
      milestoneTitle,
      amount,
      priority: 'high'
    },
    context: {
      projectId,
      milestoneTitle
    }
  });
};

export const logGigRequestSent = (commissionerId: number, freelancerId: number, gigId: number, gigTitle: string, organizationName: string, organizationId: number) => {
  return eventLogger.logEvent({
    id: `gig_request_sent_${gigId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'gig_request_sent',
    notificationType: NOTIFICATION_TYPES.GIG_REQUEST_SENT,
    actorId: commissionerId,
    targetId: freelancerId,
    entityType: ENTITY_TYPES.GIG,
    entityId: gigId,
    metadata: {
      gigTitle,
      organizationName,
      priority: 'high'
    },
    context: {
      gigId,
      organizationId
    }
  });
};

export const logProjectPauseRequested = (freelancerId: number, projectId: number, projectTitle: string, reason: string) => {
  return eventLogger.logEvent({
    id: `project_pause_${projectId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'project_pause_requested',
    notificationType: NOTIFICATION_TYPES.PROJECT_PAUSE_REQUESTED,
    actorId: freelancerId,
    entityType: ENTITY_TYPES.PROJECT,
    entityId: projectId,
    metadata: {
      projectTitle,
      pauseReason: reason
    },
    context: {
      projectId
    }
  });
};

export const logInvoiceSent = (freelancerId: number, commissionerId: number, invoiceId: string, projectId: number, invoiceNumber: string, projectTitle: string, amount: number) => {
  return eventLogger.logEvent({
    id: `invoice_sent_${invoiceId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'invoice_sent',
    notificationType: NOTIFICATION_TYPES.INVOICE_SENT,
    actorId: freelancerId,
    targetId: commissionerId,
    entityType: ENTITY_TYPES.INVOICE,
    entityId: invoiceId,
    metadata: {
      invoiceNumber,
      projectTitle,
      amount,
      description: 'Project milestone'
    },
    context: {
      projectId,
      invoiceId
    }
  });
};

export const logInvoicePaid = (commissionerId: number, freelancerId: number, invoiceId: string, projectId: number, invoiceNumber: string, amount: number, description: string) => {
  return eventLogger.logEvent({
    id: `invoice_paid_${invoiceId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'invoice_paid',
    notificationType: NOTIFICATION_TYPES.INVOICE_PAID,
    actorId: commissionerId,
    targetId: freelancerId,
    entityType: ENTITY_TYPES.INVOICE,
    entityId: invoiceId,
    metadata: {
      invoiceNumber,
      amount,
      description
    },
    context: {
      projectId,
      invoiceId
    }
  });
};

export const logGigApplication = (freelancerId: number, gigId: number, gigTitle: string, gigOwnerId: number) => {
  return eventLogger.logEvent({
    id: `gig_applied_${gigId}_${freelancerId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'gig_applied',
    notificationType: NOTIFICATION_TYPES.GIG_APPLICATION_RECEIVED,
    actorId: freelancerId,
    targetId: gigOwnerId,
    entityType: ENTITY_TYPES.GIG,
    entityId: gigId,
    metadata: {
      gigTitle
    },
    context: {
      gigId
    }
  });
};

export const logStorefrontPurchase = (buyerId: number, sellerId: number, productId: string, productTitle: string, amount: number) => {
  return eventLogger.logEvent({
    id: `product_purchased_${productId}_${buyerId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'product_purchased',
    notificationType: NOTIFICATION_TYPES.PRODUCT_PURCHASED,
    actorId: buyerId,
    targetId: sellerId,
    entityType: ENTITY_TYPES.PRODUCT,
    entityId: productId,
    metadata: {
      productTitle,
      amount
    },
    context: {
      productId
    }
  });
};

export const logMessageSent = (senderId: number, recipientId: number, messageId: string, messagePreview: string, threadId: string) => {
  return eventLogger.logEvent({
    id: `message_sent_${messageId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'message_sent',
    notificationType: 0, // Messages excluded from notifications
    actorId: senderId,
    targetId: recipientId,
    entityType: ENTITY_TYPES.MESSAGE,
    entityId: messageId,
    metadata: {
      messagePreview,
      threadId
    },
    context: {
      messageThreadId: threadId
    }
  });
};
