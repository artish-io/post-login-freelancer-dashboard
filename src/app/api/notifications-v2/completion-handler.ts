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

    // ✅ SAFE: Log event using existing infrastructure
    await logCompletionEvent(enrichedEvent);

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

// 🔒 COMPLETION-SPECIFIC: Event logging
async function logCompletionEvent(event: CompletionEvent) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    // Log to completion-specific event log
    const eventLogPath = path.join(process.cwd(), 'data', 'completion-event-log.json');
    let eventLog: CompletionEvent[] = [];
    
    try {
      const eventLogData = await fs.readFile(eventLogPath, 'utf8');
      eventLog = JSON.parse(eventLogData);
    } catch (e) {
      // File doesn't exist, start with empty array
    }
    
    eventLog.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    
    // Keep only last 1000 events to prevent file from growing too large
    if (eventLog.length > 1000) {
      eventLog = eventLog.slice(-1000);
    }
    
    await fs.writeFile(eventLogPath, JSON.stringify(eventLog, null, 2));
    
    // ✅ SAFE: Also try to use existing event logger if available
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
    
  } catch (error) {
    console.error('Error logging completion event:', error);
    // Don't throw - logging failures shouldn't break notification flows
  }
}

// ✅ SAFE: Integration with existing notification system
async function integrateWithExistingNotificationSystem(event: CompletionEvent): Promise<string | undefined> {
  try {
    // Use the proper notification storage service
    const { NotificationStorage } = await import('@/lib/notifications/notification-storage');

    const notificationId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notificationEvent = {
      id: notificationId,
      type: event.type,
      actorId: event.actorId,
      targetId: event.targetId,
      projectId: event.projectId,
      message: generateNotificationMessage(event),
      context: event.context,
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

  switch (event.type) {
    case 'completion.project_activated':
      return `${projectTitle} activated with $${upfrontAmount} upfront payment (12% of total budget)`;

    case 'completion.invoice_received':
      return `Manual invoice received for "${taskTitle}": $${amount}. Invoice #${invoiceNumber}`;

    case 'completion.invoice_paid':
      return `Invoice paid for "${taskTitle}": $${amount}. Invoice #${invoiceNumber}`;

    case 'completion.project_completed':
      return `${projectTitle} completed with final payment: $${finalAmount} (remaining 88% of budget)`;

    default:
      return `Completion event: ${event.type}`;
  }
}

// 🔒 COMPLETION-SPECIFIC: Notification retrieval
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
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const notificationsPath = path.join(process.cwd(), 'data', 'completion-notifications.json');
    let notifications: any[] = [];
    
    try {
      const notificationsData = await fs.readFile(notificationsPath, 'utf8');
      notifications = JSON.parse(notificationsData);
    } catch (e) {
      // File doesn't exist, return empty
      return { notifications: [], total: 0, unreadCount: 0 };
    }
    
    // Filter notifications for the user
    let userNotifications = notifications.filter(n => 
      n.targetId === userId || n.actorId === userId
    );
    
    // Apply filters
    if (options?.unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }
    
    if (options?.projectId) {
      userNotifications = userNotifications.filter(n => n.projectId === options.projectId);
    }
    
    // Sort by creation date (newest first)
    userNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const total = userNotifications.length;
    const unreadCount = userNotifications.filter(n => !n.read).length;
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      userNotifications = userNotifications.slice(offset, offset + limit);
    }
    
    return {
      notifications: userNotifications,
      total,
      unreadCount
    };
    
  } catch (error) {
    console.error('Error retrieving completion notifications:', error);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

// 🔒 COMPLETION-SPECIFIC: Mark notifications as read
export async function markCompletionNotificationsAsRead(
  userId: number, 
  notificationIds: string[]
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const notificationsPath = path.join(process.cwd(), 'data', 'completion-notifications.json');
    let notifications: any[] = [];
    
    try {
      const notificationsData = await fs.readFile(notificationsPath, 'utf8');
      notifications = JSON.parse(notificationsData);
    } catch (e) {
      return { success: false, updatedCount: 0 };
    }
    
    let updatedCount = 0;
    
    // Mark specified notifications as read
    notifications = notifications.map(notification => {
      if (
        notificationIds.includes(notification.id) &&
        (notification.targetId === userId || notification.actorId === userId) &&
        !notification.read
      ) {
        updatedCount++;
        return { ...notification, read: true, readAt: new Date().toISOString() };
      }
      return notification;
    });
    
    await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));
    
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('Error marking completion notifications as read:', error);
    return { success: false, updatedCount: 0 };
  }
}
