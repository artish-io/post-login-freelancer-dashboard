import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EventData, EventType, USER_TYPE_FILTERS } from '../../../lib/events/event-logger';
import { NotificationStorage } from '../../../lib/notifications/notification-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

/**
 * Deduplicate notification events, prioritizing enriched versions
 * For milestone payment notifications, keep only the version with enriched metadata
 */
function deduplicateNotificationEvents(events: EventData[]): EventData[] {
  const eventGroups = new Map<string, EventData[]>();

  // Group events by their logical identity
  for (const event of events) {
    let groupKey: string;

    if (event.type === 'milestone_payment_sent' || event.type === 'milestone_payment_received') {
      // Group milestone payments by project + invoice + target
      groupKey = `${event.type}_${event.context?.projectId}_${event.context?.invoiceNumber}_${event.targetId}`;
    } else if (event.type === 'invoice_paid') {
      // Group invoice payments by project + invoice + target
      groupKey = `${event.type}_${event.context?.projectId}_${event.context?.invoiceNumber}_${event.targetId}`;
    } else {
      // For other events, use the event ID as unique key
      groupKey = event.id;
    }

    if (!eventGroups.has(groupKey)) {
      eventGroups.set(groupKey, []);
    }
    eventGroups.get(groupKey)!.push(event);
  }

  // For each group, select the best version
  const deduplicatedEvents: EventData[] = [];

  for (const [groupKey, groupEvents] of eventGroups) {
    if (groupEvents.length === 1) {
      // Only one event, keep it
      deduplicatedEvents.push(groupEvents[0]);
    } else {
      // Multiple events, prioritize enriched versions
      const enrichedEvent = groupEvents.find(e =>
        e.metadata?.message &&
        e.metadata?.freelancerName &&
        e.metadata?.organizationName &&
        e.metadata?.amount > 0
      );

      if (enrichedEvent) {
        // Use the enriched version
        deduplicatedEvents.push(enrichedEvent);
      } else {
        // Fallback to the most recent event
        const sortedEvents = groupEvents.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        deduplicatedEvents.push(sortedEvents[0]);
      }
    }
  }

  return deduplicatedEvents;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType') || 'commissioner';
    const tab = searchParams.get('tab') || 'all';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Load data files
    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');

    // Get events using the new partitioned storage system
    const events: EventData[] = NotificationStorage.getEventsForUser(
      parseInt(userId),
      userType as 'freelancer' | 'commissioner',
      undefined, // startDate - defaults to 3 months ago
      undefined, // endDate - defaults to now
      200 // limit - get up to 200 recent events
    );

    // Load data from unified storage and flat files
    const [users, freelancers, projects, organizations, contacts] = await Promise.all([
      UnifiedStorageService.getAllUsers(), // Use hierarchical storage for users
      UnifiedStorageService.getAllFreelancers(), // Use hierarchical storage for freelancers
      UnifiedStorageService.listProjects(), // Use unified storage for projects
      UnifiedStorageService.getAllOrganizations(), // Use hierarchical storage for organizations
      fs.promises.readFile(contactsPath, 'utf-8').then(data => JSON.parse(data))
    ]);

    // Get all tasks across all projects
    const allTasks: any[] = [];
    for (const project of projects) {
      const tasks = await UnifiedStorageService.listTasks(project.projectId);
      allTasks.push(...tasks);
    }

    // Group tasks by project for compatibility with existing logic
    const projectTasks = allTasks.reduce((acc: any[], task: any) => {
      const existingProject = acc.find(p => p.projectId === task.projectId);
      if (existingProject) {
        existingProject.tasks.push(task);
      } else {
        acc.push({
          projectId: task.projectId,
          tasks: [task]
        });
      }
      return acc;
    }, []);

    // Filter events relevant to this user with user-type filtering
    const userEvents = events.filter(event => {
      // Exclude message events from notifications
      if (event.type === 'message_sent' || event.type === 'message_read') {
        return false;
      }

      // Apply user-type filtering based on notification rules
      if (userType === 'commissioner') {
        // Commissioners should only see certain notification types
        if ((USER_TYPE_FILTERS.FREELANCER_ONLY as readonly string[]).includes(event.type)) {
          return false;
        }
      } else if (userType === 'freelancer') {
        // Freelancers should only see certain notification types
        if ((USER_TYPE_FILTERS.COMMISSIONER_ONLY as readonly string[]).includes(event.type)) {
          return false;
        }
      }

      // Special case: milestone_payment_sent and payment_sent notifications are self-notifications for commissioners
      if ((event.type === 'milestone_payment_sent' || event.type === 'payment_sent') && event.targetId === parseInt(userId)) {
        return true;
      }

      // Special case: completion.upfront_payment notifications for commissioners are self-notifications
      if (event.type === 'completion.upfront_payment' && event.targetId === parseInt(userId) && event.actorId === parseInt(userId)) {
        return true;
      }

      // Special case: completion.rating_prompt notifications can be self-notifications for both freelancers and commissioners
      if (event.type === 'completion.rating_prompt' && event.targetId === parseInt(userId)) {
        return true;
      }

      // Special case: completion.final_payment, completion.project_completed, completion.commissioner_payment, and project_completed notifications can be self-notifications for commissioners
      if ((event.type === 'completion.final_payment' || event.type === 'completion.project_completed' || event.type === 'completion.commissioner_payment' || event.type === 'project_completed') && event.targetId === parseInt(userId) && event.actorId === parseInt(userId)) {
        return true;
      }

      // User is the target of the event AND not the actor (no self-notifications)
      if (event.targetId === parseInt(userId) && event.actorId !== parseInt(userId)) return true;

      // For certain notification types, only show to the specific target user
      const targetOnlyNotifications = [
        'project_pause_accepted',
        'project_pause_refused',
        'project_paused',
        'invoice_paid'
      ];

      if (targetOnlyNotifications.includes(event.type)) {
        // Only show to the target user, not to other project participants
        return false;
      }

      // User is involved in the project (but not for self-initiated actions)
      if (event.context?.projectId && event.actorId !== parseInt(userId)) {
        const project = projects.find((p: any) => p.projectId === event.context?.projectId);
        if (project && (project.commissionerId === parseInt(userId) || project.freelancerId === parseInt(userId))) {
          return true;
        }
      }

      return false;
    });

    // Group similar notifications (e.g., multiple gig applications)
    const groupedEvents = groupSimilarEvents(userEvents);

    // Helper function to check if actor is in user's network
    const isActorInNetwork = (actorId: number, userId: number): boolean => {
      // Find user's contacts
      const userContacts = contacts.find((c: any) => c.userId === userId);
      if (!userContacts) return false;

      // Check if actor is in contacts list
      return userContacts.contacts.includes(actorId);
    };

    // Helper function to check if notification is from network
    const isFromNetwork = (event: any, userId: number): boolean => {
      // Product purchases should never be considered network notifications
      // They should always appear in the "All" tab only
      if (event.type === 'product_purchased') {
        return false;
      }

      // For gig-related events, actorId might be a freelancer ID, so we need to map it to user ID
      let actorUserId;
      if (event.type === 'gig_applied' || event.type === 'gig_request_accepted') {
        const freelancer = freelancers.find((f: any) => f.id === parseInt(event.actorId));
        actorUserId = freelancer ? freelancer.userId : parseInt(event.actorId);
      } else {
        actorUserId = parseInt(event.actorId);
      }

      // Check if actor is in user's contacts
      const directContact = isActorInNetwork(actorUserId, userId);
      if (directContact) {
        return true;
      }

      // For project-related notifications, check if user has ongoing projects with the actor
      if (event.context?.projectId) {
        const project = projects.find((p: any) => p.projectId === event.context.projectId);
        if (project) {
          // If it's a commissioner viewing, check if the freelancer is in their network
          if (userType === 'commissioner' && project.commissionerId === userId && project.freelancerId) {
            const freelancerInNetwork = isActorInNetwork(project.freelancerId, userId);
            if (freelancerInNetwork) {
              return true;
            }
          }
          // If it's a freelancer viewing, check if the commissioner is in their network
          if (userType === 'freelancer' && project.freelancerId === userId && project.commissionerId) {
            const commissionerInNetwork = isActorInNetwork(project.commissionerId, userId);
            if (commissionerInNetwork) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Filter out notifications for deleted projects to reduce noise
    const validEvents = [];
    for (const event of groupedEvents) {
      if (event.context?.projectId) {
        try {
          const { UnifiedStorageService } = await import('../../../lib/storage/unified-storage-service');
          const project = await UnifiedStorageService.getProjectById(event.context.projectId);
          if (project) {
            validEvents.push(event);
          }
          // Silently skip notifications for deleted projects
        } catch (error) {
          // Skip events for projects that can't be accessed
        }
      } else {
        // Keep non-project events
        validEvents.push(event);
      }
    }

    // Filter to prioritize enriched notifications and remove duplicates
    const deduplicatedEvents = deduplicateNotificationEvents(validEvents);

    // Convert events to notifications
    const notificationPromises = deduplicatedEvents.map(async event => {
      // For gig-related events, actorId might be a freelancer ID, so we need to map it to user ID
      let actor;
      if (event.type === 'gig_applied' || event.type === 'gig_request_accepted') {
        // actorId is a freelancer ID, find the corresponding user
        const freelancer = freelancers.find((f: any) => f.id === event.actorId);
        actor = freelancer ? users.find((u: any) => u.id === freelancer.userId) : null;
      } else {
        // actorId is a user ID
        actor = users.find((u: any) => u.id === event.actorId);
      }

      // Special handling for task_submission notifications that don't have actorId
      if (!actor && event.type === 'task_submission' && event.metadata?.title) {
        // Extract freelancer name from title like "Margsate Flether submitted a task"
        const titleMatch = event.metadata.title.match(/^(.+?)\s+submitted a task$/);
        if (titleMatch) {
          const freelancerName = titleMatch[1];
          // Try to find the freelancer in the users array by name
          const freelancerUser = users.find((u: any) => u.name === freelancerName);
          if (freelancerUser) {
            actor = freelancerUser;
          } else {
            // Create a fallback actor with the extracted name
            actor = {
              id: 0,
              name: freelancerName,
              avatar: `/avatars/${freelancerName.toLowerCase().replace(/\s+/g, '-')}.png`
            };
          }
        }
      }



      const organization = event.context?.organizationId ?
        organizations.find((o: any) => o.id === event.context?.organizationId) : null;

      // Get project and task details for granular notifications
      const project = projects.find((p: any) => p.projectId === event.context?.projectId);
      const projectTaskData = projectTasks.find((pt: any) => pt.projectId === event.context?.projectId);
      const task = projectTaskData?.tasks?.find((t: any) => t.id === event.context?.taskId);

      // Determine icon based on notification typology rules
      let iconPath = undefined;
      if (shouldUseOrgLogo(event.type) && organization?.logo) {
        iconPath = organization.logo;
      } else if (shouldUsePaymentIcon(event.type)) {
        iconPath = '/icons/new-payment.png';
      } else if (shouldUsePauseIcon(event.type)) {
        iconPath = '/icons/project-pause.png';
      } else if (shouldUseTaskApprovalIcon(event.type)) {
        iconPath = '/icons/task-approved.png';
      } else if (shouldUseTaskRejectionIcon(event.type)) {
        iconPath = '/icons/task-rejected.png';
      } else if (shouldUseProjectCompletionIcon(event.type)) {
        iconPath = '/icons/project-completed.png';
      } else if (shouldUseRatingPromptIcon(event.type)) {
        iconPath = '/icons/rating-prompt.png';
      }



      // Check for enriched title and message in metadata first
      const enrichedTitle = event.metadata?.title;
      const enrichedMessage = event.metadata?.message;

      const title = enrichedTitle || await generateGranularTitle(event, actor, project, projectTaskData, task, parseInt(userId));

      // Always generate messages dynamically for completion notifications to ensure they're context-aware
      const preGeneratedMessage = enrichedMessage || (event as any).message;
      const isFallbackMessage = preGeneratedMessage && preGeneratedMessage.startsWith('Completion event:');
      const isCompletionNotification = event.type.startsWith('completion.');

      const message = (preGeneratedMessage && !isFallbackMessage && !isCompletionNotification)
        ? preGeneratedMessage
        : await generateGranularMessage(event, actor, project, projectTaskData, task, parseInt(userId));

      // Filter out notifications with null title or message (unknown event types)
      if (title === null || message === null) {
        return null;
      }

      const notificationId = `${event.id}-${userId}`;
      return {
        id: notificationId,
        type: getNotificationType(event.type),
        title,
        message,
        timestamp: event.timestamp,
        isRead: NotificationStorage.isRead(notificationId, parseInt(userId)),
        user: shouldUseAvatar(event.type) ? {
          id: actor?.id,
          name: actor?.name,
          avatar: actor?.avatar,
          title: actor?.title
        } : undefined,
        organization: shouldUseOrgLogo(event.type) ? organization : undefined,
        project: event.context?.projectId ? {
          id: event.context.projectId,
          title: event.metadata?.projectTitle || 'Unknown Project'
        } : undefined,
        gig: event.context?.gigId ? {
          id: event.context.gigId,
          title: event.metadata?.gigTitle || 'Unknown Gig'
        } : undefined,
        context: event.context, // Add the context field for navigation
        metadata: event.metadata, // Add the metadata field for additional data
        isFromNetwork: isFromNetwork(event, parseInt(userId)),
        priority: event.metadata?.priority || 'medium',
        iconPath: iconPath,
        notificationType: event.notificationType,
        groupCount: event.metadata?.groupCount || 1,
        link: generateNotificationLink(event, project, task, parseInt(userId)),
        actionTaken: NotificationStorage.isActioned(event.id, parseInt(userId))
      };
    });

    const notifications = (await Promise.all(notificationPromises))
      .filter(notification => notification !== null)
      .filter(notification => {
        // Filter out phantom task_approved notifications that have no actorId and generic titles
        if (notification.type === 'task_approved' &&
            notification.title === 'Task approved' &&
            !notification.user?.name) {
          console.log(`[notifications-v2] Filtering out phantom task_approved notification: ${notification.id}`);
          return false;
        }
        return true;
      });

    // Filter by tab
    let filteredNotifications = notifications;
    if (userType === 'freelancer') {
      if (tab === 'projects') {
        filteredNotifications = notifications.filter(n =>
          ['task_submission', 'task_approved', 'task_rejected', 'project_pause_requested', 'project_pause_accepted',
           'milestone_payment_received', 'invoice_paid'].includes(n.type)
        );
      } else if (tab === 'gigs') {
        filteredNotifications = notifications.filter(n =>
          ['gig_request', 'gig_application', 'proposal_sent', 'proposal_accepted', 'proposal_rejected'].includes(n.type)
        );
      }
    } else {
      if (tab === 'network') {
        filteredNotifications = notifications.filter(n => n.isFromNetwork);
      }
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate counts (only unread notifications)
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const allCount = unreadNotifications.length;
    const networkCount = unreadNotifications.filter(n => n.isFromNetwork).length;
    const projectsCount = unreadNotifications.filter(n =>
      ['task_submission', 'task_approved', 'task_rejected', 'project_pause_requested', 'project_pause_accepted'].includes(n.type)
    ).length;
    const gigsCount = unreadNotifications.filter(n =>
      ['gig_request', 'gig_application', 'gig_rejected', 'proposal_sent', 'proposal_accepted', 'proposal_rejected'].includes(n.type)
    ).length;

    return NextResponse.json({
      notifications: filteredNotifications,
      counts: userType === 'freelancer' ? {
        all: allCount,
        projects: projectsCount,
        gigs: gigsCount
      } : {
        all: allCount,
        network: networkCount
      }
    });

  } catch (error) {
    console.error('Error fetching notifications v2:', error);

    // If it's a file not found error, provide more specific guidance
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.error('⚠️  CRITICAL: Missing data files detected. This suggests the application is trying to read from deprecated flat file structure instead of hierarchical storage.');
      console.error('📁 Expected hierarchical structure: data/projects/[year]/[month]/[day]/[projectId]/project.json');
      console.error('🔧 This API has been updated to use hierarchical storage, but the error suggests a fallback or cache issue.');
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { notificationId, userId, userType } = await request.json();

    if (!notificationId || !userId || !userType) {
      return NextResponse.json(
        { error: 'Notification ID, User ID, and User Type are required' },
        { status: 400 }
      );
    }

    // Mark notification as read in the read states storage
    NotificationStorage.markAsRead(notificationId, parseInt(userId));

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

function getNotificationType(eventType: EventType): string {
  const typeMap: Partial<Record<EventType, string>> = {
    'task_submitted': 'task_submission',
    'task_approved': 'task_approved',
    'task_rejected': 'task_rejected',
    'task_rejected_with_comment': 'task_rejected_with_comment',
    'task_completed': 'task_completed',
    'task_created': 'task_created',
    'task_commented': 'task_comment',
    'project_created': 'project_created',
    'project_started': 'project_started',
    'project_activated': 'project_activated',
    'project_reactivated': 'project_reactivated',
    'project_paused': 'project_pause',
    'project_resumed': 'project_resumed',
    'project_completed': 'project_completed',
    'project_pause_requested': 'project_pause',
    'project_pause_accepted': 'project_pause_accepted',
    'gig_applied': 'gig_application',
    'project_pause_denied': 'project_pause_denied',
    'project_pause_refused': 'project_pause_refused',
    'gig_posted': 'gig_posted',
    'gig_request_sent': 'gig_request',
    'gig_request_accepted': 'gig_request_accepted',
    'gig_request_declined': 'gig_request_declined',
    'gig_rejected': 'gig_rejected',
    'message_sent': 'new_message',
    'message_read': 'message_read',
    'invoice_created': 'invoice_created',
    'invoice_sent': 'invoice_sent',
    'invoice_paid': 'invoice_paid',
    'invoice_overdue': 'invoice_overdue',
    'product_purchased': 'storefront_purchase',
    'product_downloaded': 'product_downloaded',
    'review_posted': 'review_posted',
    'proposal_sent': 'proposal_sent',
    'proposal_accepted': 'proposal_accepted',
    'proposal_rejected': 'proposal_rejected',
    'contact_added': 'contact_added',
    'contact_removed': 'contact_removed',
    'user_login': 'user_login',
    'user_logout': 'user_logout',
    'profile_updated': 'profile_updated',
    'milestone_payment_received': 'milestone_payment_received',
    'milestone_payment_sent': 'milestone_payment_sent',
    'payment_sent': 'payment_sent',
    'product_approved': 'product_approved',
    'product_rejected': 'product_rejected',

    // Completion notification types
    'completion.project_activated': 'completion_project_activated',
    'completion.upfront_payment': 'completion_upfront_payment',
    'completion.task_approved': 'completion_task_approved',
    'completion.invoice_received': 'completion_invoice_received',
    'completion.invoice_paid': 'completion_invoice_paid',
    'completion.commissioner_payment': 'completion_commissioner_payment',
    'completion.project_completed': 'completion_project_completed',
    'completion.final_payment': 'completion_final_payment',
    'completion.rating_prompt': 'completion_rating_prompt'
  };

  return typeMap[eventType] || eventType;
}

function shouldUseAvatar(eventType: EventType): boolean {
  return [
    'task_submitted',
    'task_submission', // Legacy task submission notifications should also use avatars
    'project_pause_requested', // Freelancer requests pause - show freelancer avatar on commissioner side
    'project_activated', // Commissioner accepts application - show commissioner avatar on freelancer side
    'invoice_sent', // Freelancer sends invoice - show freelancer avatar on commissioner side
    'gig_request_accepted', // Freelancer accepts gig request - show freelancer avatar on commissioner side
    'proposal_sent',
    'gig_applied' // Freelancer applies for gig - show freelancer avatar on commissioner side
  ].includes(eventType);
}

function shouldUseOrgLogo(eventType: EventType): boolean {
  return [
    'gig_request_sent', // Commissioner sends gig request - show organization logo on freelancer side
    'gig_rejected' // Organization rejects freelancer application - show organization logo on freelancer side
  ].includes(eventType);
}

function shouldUsePaymentIcon(eventType: EventType): boolean {
  return [
    'invoice_paid', // Commissioner pays invoice - show payment icon
    'completion.invoice_paid', // Completion project payment - show payment icon
    'completion.commissioner_payment', // Completion project payment confirmation - show payment icon
    'completion.upfront_payment', // Completion project upfront payment - show payment icon
    'completion.final_payment', // Completion project final payment - show payment icon
    'product_purchased' // Storefront purchase - show payment icon
    // Note: milestone_payment_* notifications use avatars instead of payment icons
  ].includes(eventType);
}

function shouldUsePauseIcon(eventType: EventType): boolean {
  return [
    'project_pause_accepted' // Commissioner accepts pause request - show pause icon
  ].includes(eventType);
}

function shouldUseTaskApprovalIcon(eventType: EventType): boolean {
  return [
    'task_approved' // Commissioner approves task - show task awaiting review icon
  ].includes(eventType);
}

function shouldUseTaskRejectionIcon(eventType: EventType): boolean {
  return [
    'task_rejected', // Commissioner rejects task - show task rejected icon
    'task_rejected_with_comment'
  ].includes(eventType);
}

function shouldUseProjectCompletionIcon(eventType: EventType): boolean {
  return [
    'project_completed', // Milestone project completion - show project completed icon
    'completion.project_completed', // Completion project completion - show project completed icon
    'completion_project_completed' // Legacy completion project completion - show project completed icon
  ].includes(eventType);
}

function shouldUseRatingPromptIcon(eventType: EventType): boolean {
  return [
    'rating_prompt_freelancer', // Rating prompt for freelancer - show rating prompt icon
    'rating_prompt_commissioner' // Rating prompt for commissioner - show rating prompt icon
  ].includes(eventType);
}

// Group similar events (e.g., multiple gig applications for the same gig)
function groupSimilarEvents(events: EventData[]): EventData[] {
  const grouped: { [key: string]: EventData[] } = {};
  const ungrouped: EventData[] = [];

  events.forEach(event => {
    // Group gig applications by gig ID
    if (event.type === 'gig_applied' && event.context?.gigId) {
      const key = `gig_applied_${event.context.gigId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    } else {
      ungrouped.push(event);
    }
  });

  // Convert grouped events to single notifications with counts
  const groupedNotifications: EventData[] = [];
  Object.entries(grouped).forEach(([, groupEvents]) => {
    if (groupEvents.length > 1) {
      const latestEvent = groupEvents[0]; // Most recent
      groupedNotifications.push({
        ...latestEvent,
        metadata: {
          ...latestEvent.metadata,
          groupCount: groupEvents.length,
          otherApplicants: groupEvents.slice(1).map(e => e.actorId)
        }
      });
    } else {
      ungrouped.push(groupEvents[0]);
    }
  });

  return [...groupedNotifications, ...ungrouped];
}

async function generateGranularTitle(event: EventData, actor: any, _project?: any, projectTaskData?: any, task?: any, currentUserId?: number): Promise<string | null> {
  // For task_submission notifications, use the title from metadata if it exists
  if (event.type === 'task_submission' && event.metadata?.title) {
    return event.metadata.title;
  }

  const actorName = actor?.name || 'Someone';
  const groupCount = event.metadata?.groupCount || 1;

  switch (event.type) {
    case 'task_submitted':
    case 'task_submission':
      return `${actorName} submitted a task`;
    case 'task_approved':
      // Use short title format to match V2 style
      return `${actorName} approved your task`;
    case 'task_rejected':
      return `${actorName} rejected "${event.metadata?.taskTitle || 'task'}". Revisions are required. View notes and resume progress`;
    case 'task_rejected_with_comment':
      return `${actorName} rejected "${event.metadata?.taskTitle || 'task'}". Revisions are required. View notes and resume progress`;
    case 'task_completed':
      return 'Task marked as completed';
    case 'project_pause_requested':
      return `${actorName} has requested a pause for ${event.metadata?.projectTitle || 'this project'}. Click to view the project tracker and respond.`;
    case 'project_pause_accepted':
      return 'Project pause request approved';
    case 'project_activated':
      return `${actorName} accepted your application for ${event.metadata?.gigTitle || 'gig'}`;
    case 'project_paused':
      return `${actorName} has paused ${event.metadata?.projectTitle || 'this project'}`;
    case 'project_reactivated':
      return `${actorName} has re-activated ${event.metadata?.projectTitle || 'this project'}. Work can now resume!`;
    case 'project_completed':
      return `Project completed`;
    case 'gig_applied':
      if (groupCount && groupCount > 1) {
        return `${actorName} and ${groupCount - 1} others applied to "${event.metadata?.gigTitle || 'gig'}"`;
      }
      return `${actorName} applied for ${event.metadata?.gigTitle || 'gig'}`;
    case 'gig_request_sent':
      return `${event.metadata?.organizationName || actorName} sent you a gig request for "${event.metadata?.gigTitle || 'gig'}"`;
    case 'gig_request_accepted':
      return `${actorName} accepted your gig request`;
    case 'invoice_sent':
      // Use the custom notification text if available, otherwise fall back to default
      if (event.metadata?.notificationText) {
        return event.metadata.notificationText;
      }
      // Fallback format for older notifications
      const invoiceAmount = event.metadata?.amount ? `$${event.metadata.amount}` : '';
      const tasksCount = event.metadata?.approvedTasksCount || 1;
      const invoiceProjectTitle = event.metadata?.projectTitle || 'project';
      return `${actorName} sent you an invoice for ${invoiceAmount} for ${tasksCount} approved task${tasksCount !== 1 ? 's' : ''}, of your active project, ${invoiceProjectTitle}.`;
    case 'invoice_paid':
      // Use organization name for invoice payments as specified by user
      const invoiceOrgName = event.metadata?.organizationName || actorName;
      const invoicePaidAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      return `${invoiceOrgName} paid ${invoicePaidAmount}`;
    case 'milestone_payment_received':
      const titleOrgName = event.metadata?.organizationName || actorName;
      const titleAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      return `${titleOrgName} paid ${titleAmount}`;
    case 'milestone_payment_sent':
      const titleFreelancerName = event.metadata?.freelancerName || 'freelancer';
      const titlePaidAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      return `You just paid ${titleFreelancerName} ${titlePaidAmount}`;
    case 'payment_sent':
      // Use the custom notification text if available, otherwise fall back to default
      if (event.metadata?.notificationText) {
        return event.metadata.notificationText;
      }
      // Fallback format
      const paymentFreelancerName = event.metadata?.freelancerName || 'freelancer';
      const paymentAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount}`
        : '$0';
      const paymentProjectTitle = event.metadata?.projectTitle || 'project';
      const paymentRemainingBudget = event.metadata?.remainingBudget || 'unknown';
      return `You just paid ${paymentFreelancerName} ${paymentAmount} for their work on ${paymentProjectTitle}. This project has a remaining budget of ${paymentRemainingBudget} left.`;
    case 'product_purchased':
      return `You just made a new sale of "${event.metadata?.productTitle || 'product'}"`;
    case 'invoice_created':
      return `Auto-invoice generated for "${event.metadata?.taskTitle || 'task'}" - $${event.metadata?.amount || 0}`;
    case 'message_sent':
      return `New message from ${actorName}`;
    case 'proposal_sent':
      return `${actorName} sent you a proposal`;
    case 'proposal_accepted':
      return `Your proposal has been accepted`;
    case 'proposal_rejected':
      return `${event.metadata?.organizationName || actorName} rejected your proposal`;
    case 'gig_rejected':
      return `${event.metadata?.organizationName || actorName} rejected your application for "${event.metadata?.gigTitle || 'gig'}"`;
    case 'rating_prompt_freelancer':
      return `Rate your experience with ${event.metadata?.commissionerName || 'the commissioner'}`;
    case 'rating_prompt_commissioner':
      return `Rate your experience with ${event.metadata?.freelancerName || 'the freelancer'}`;
    case 'payment_sent':
      const paymentSentFreelancerName = event.metadata?.freelancerName || 'freelancer';
      const paymentSentAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      return `You just paid ${paymentSentFreelancerName} ${paymentSentAmount}`;

    // Completion notification types
    case 'completion.project_activated':
      return `${actorName} accepted your application`;
    case 'completion.upfront_payment':
      // Use organization name for upfront payments as specified by user
      const orgName = (event.metadata as any)?.orgName || (event.context as any)?.orgName || actorName;
      return `${orgName} paid upfront payment`;
    case 'completion.task_approved':
      return `${actorName} approved your task`;
    case 'completion.invoice_received':
      return `${actorName} sent you an invoice`;
    case 'completion.invoice_paid':
      // Generate context-aware title for invoice payments
      const compTitleOrgName = (event.metadata as any)?.orgName || (event.context as any)?.orgName || actorName;
      const compTitleAmount = (event.metadata as any)?.amount || (event.context as any)?.amount || 0;
      const compTitleFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isCompTitleCommissioner = currentUserId === event.actorId;

      if (isCompTitleCommissioner) {
        // Commissioner title - they made the payment
        return `You just paid ${compTitleFreelancerName} $${compTitleAmount}`;
      } else {
        // Freelancer title - they received the payment
        return `${compTitleOrgName} paid your invoice`;
      }
    case 'completion.commissioner_payment':
      // Commissioner payment confirmation title
      const commPaymentAmount = (event.metadata as any)?.amount || (event.context as any)?.amount || 0;
      const commPaymentFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';
      return `You paid ${commPaymentFreelancerName} $${commPaymentAmount}`;
    case 'completion.project_completed':
      return `Project completed`;
    case 'project_completed':
      return `Project completed`;
    case 'completion.final_payment':
      // Generate context-aware title for final payments
      const finalTitleOrgName = (event.metadata as any)?.orgName || (event.context as any)?.orgName || actorName;
      const finalTitleAmount = (event.metadata as any)?.finalAmount || (event.context as any)?.finalAmount || 0;
      const finalTitleFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isFinalTitleCommissioner = currentUserId === event.actorId;

      if (isFinalTitleCommissioner) {
        // Commissioner title - they made the final payment
        return `You just paid ${finalTitleFreelancerName} $${finalTitleAmount}`;
      } else {
        // Freelancer title - they received the final payment
        return `${finalTitleOrgName} sent final payment`;
      }
    case 'completion.rating_prompt':
      return `Rate your experience`;

    default:
      // Skip generic events - they shouldn't reach here if properly filtered
      console.warn(`Unknown notification type: ${event.type}`, event);
      return null; // Return null to filter out unknown events
  }
}

async function generateGranularMessage(event: EventData, _actor: any, _project?: any, _projectTaskData?: any, task?: any, currentUserId?: number): Promise<string | null> {
  switch (event.type) {
    case 'task_submitted':
    case 'task_submission':
      // Use enriched actor name for task submissions
      const taskTitle = event.metadata?.taskTitle || event.metadata?.message?.replace(/^"/, '').replace(/".*$/, '') || 'Task';
      return `"${taskTitle}" is awaiting your review for ${_project?.title || 'this project'}`;
    case 'task_approved':
      // Generate detailed message with milestone information
      try {
        const { detectProjectCompletion } = await import('../../../lib/notifications/project-completion-detector');
        const actorName = _actor?.name || 'Someone';

        // Handle both string and number project IDs
        const projectId = event.context?.projectId || event.metadata?.projectId;
        if (!projectId) {
          console.warn(`[notifications-v2] No project ID found for task_approved notification ${event.id}, using fallback message`);
          return `${actorName} has approved your task submission. Task approved and milestone completed. Click here to see project tracker.`;
        }

        const completionStatus = await detectProjectCompletion(
          projectId,
          event.metadata?.taskId
        );

        // For task approval notifications, show remaining milestones AFTER this approval
        const remainingMilestones = Math.max(0, completionStatus.remainingTasks);

        if (remainingMilestones === 0) {
          // For final tasks, use the standardized V2 format
          return `${actorName} has approved your submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. Task approved and milestone completed. Click here to see its project tracker.`;
        } else {
          // Use the standardized V2 format with milestone count
          return `${actorName} has approved your submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. This project has ${remainingMilestones} milestone${remainingMilestones !== 1 ? 's' : ''} left. Task approved and milestone completed. Click here to see its project tracker.`;
        }
      } catch (error) {
        console.warn('Failed to detect project completion for notification message:', error);
        // Fallback to standardized V2 format
        const actorName = _actor?.name || 'Someone';
        return `${actorName} has approved your submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. Task approved and milestone completed. Click here to see its project tracker.`;
      }
    case 'task_rejected':
      return `Task requires revision`;
    case 'task_rejected_with_comment':
      return `Task rejected with feedback`;
    case 'task_completed':
      return `"${event.metadata?.taskTitle || 'Task'}" has been marked as completed`;
    case 'project_pause_requested':
      return event.metadata?.pauseReason || 'Project pause requested';
    case 'project_pause_accepted':
      return `Your request to pause the ${event.metadata?.projectTitle || 'project'} project has been approved`;
    case 'project_paused':
      return event.metadata?.message || `${event.metadata?.projectTitle || 'Project'} has been paused. You will receive an update when work can resume.`;
    case 'project_activated':
      const taskCount = event.metadata?.taskCount || 1;
      // Format due date properly if available
      let dueDateText = 'the deadline';
      if (event.metadata?.dueDate) {
        try {
          const date = new Date(event.metadata.dueDate);
          dueDateText = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          dueDateText = event.metadata.dueDate;
        }
      }
      return `This project is now active and includes ${taskCount} milestone${taskCount !== 1 ? 's' : ''} due by ${dueDateText}`;
    case 'gig_applied':
      if (event.metadata?.groupCount && event.metadata.groupCount > 1) {
        return `${event.metadata.groupCount} applications received for "${event.metadata?.gigTitle || 'gig'}"`;
      }
      return `New application for "${event.metadata?.gigTitle || 'gig'}"`;
    case 'gig_request_sent':
      return `You have been invited to apply for ${event.metadata?.gigTitle || 'gig'}`;
    case 'gig_request_accepted':
      return `Gig request for "${event.metadata?.gigTitle || 'gig'}" has been accepted`;
    case 'invoice_sent':
      return `Invoice ${event.metadata?.invoiceNumber || 'INV-XXX'} for ${event.metadata?.projectTitle || 'project'}`;
    case 'invoice_paid':
      // Enhanced freelancer notification with project name and remaining budget
      const invoiceMsgOrgName = event.metadata?.organizationName || 'Organization';
      const invoiceMsgAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      const invoiceMsgProjectTitle = event.metadata?.projectTitle || 'project';

      // Calculate remaining budget if we have the data
      let remainingBudgetText = '';
      if (event.metadata?.projectBudget && event.metadata?.amount) {
        const totalBudget = event.metadata.projectBudget;
        const paidAmount = event.metadata.amount;
        const remainingBudget = totalBudget - paidAmount;
        remainingBudgetText = ` This project has a remaining budget of $${remainingBudget.toLocaleString()}.`;
      }

      return `${invoiceMsgOrgName} has paid ${invoiceMsgAmount} for your recent ${invoiceMsgProjectTitle} task submission.${remainingBudgetText} Click here to view invoice details`;
    case 'invoice_created':
      return `Invoice automatically generated for milestone completion`;
    case 'milestone_payment_received':
      // Enhanced freelancer notification with project name and remaining budget
      const milestoneRecOrgName = event.metadata?.organizationName || 'Organization';
      const milestoneRecAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      const milestoneRecProjectTitle = event.metadata?.projectTitle || 'project';

      // Calculate remaining budget if we have the data
      let milestoneRecRemainingBudgetText = '';
      if (event.metadata?.projectBudget) {
        const totalBudget = event.metadata.projectBudget;
        // Use remainingBudget if provided (from bus system), otherwise calculate from total budget
        const remainingBudget = event.metadata?.remainingBudget !== undefined
          ? event.metadata.remainingBudget
          : (event.metadata?.amount ? totalBudget - event.metadata.amount : totalBudget);
        milestoneRecRemainingBudgetText = ` This project has a remaining budget of $${remainingBudget.toLocaleString()}.`;
      }

      return `${milestoneRecOrgName} has paid ${milestoneRecAmount} for your recent ${milestoneRecProjectTitle} task submission.${milestoneRecRemainingBudgetText} Click here to view invoice details`;
    case 'milestone_payment_sent':
      const milestoneFreelancerName = event.metadata?.freelancerName || 'freelancer';
      const milestonePaidAmount = event.metadata?.amount !== undefined && event.metadata?.amount !== null
        ? `$${event.metadata.amount.toLocaleString()}`
        : '$0';
      const milestoneTaskTitle = event.metadata?.taskTitle || 'task';
      const milestoneProjectTitle = event.metadata?.projectTitle || 'this project';
      const milestoneRemainingBudget = event.metadata?.remainingBudget;
      const milestoneRemainingBudgetText = milestoneRemainingBudget !== undefined ? ` Remaining budget: $${milestoneRemainingBudget.toLocaleString()}.` : '';
      return `You just paid ${milestoneFreelancerName} ${milestonePaidAmount} for submitting ${milestoneTaskTitle} for ${milestoneProjectTitle}.${milestoneRemainingBudgetText} Click here to see transaction activity`;
    case 'product_purchased':
      return 'New sale on your storefront';
    case 'message_sent':
      return event.metadata?.messagePreview || 'New message';
    case 'proposal_sent':
      return `New project proposal for ${event.metadata?.proposalTitle || 'project'}`;
    case 'proposal_accepted':
      return `Your proposal for "${event.metadata?.proposalTitle || 'project'}" has been accepted and a project has been created`;
    case 'proposal_rejected':
      return event.metadata?.rejectionReason || 'No reason provided';
    case 'gig_rejected':
      return event.metadata?.rejectionMessage || 'You will be able to re-apply if this gig listing is still active after 21 days.';
    case 'rating_prompt_freelancer':
      return event.metadata?.message || `Rate your experience working with ${event.metadata?.commissionerName || 'the commissioner'} on ${event.metadata?.projectTitle || 'this project'}`;
    case 'rating_prompt_commissioner':
      return event.metadata?.message || `Rate your experience working with ${event.metadata?.freelancerName || 'the freelancer'} on ${event.metadata?.projectTitle || 'this project'}`;

    case 'payment_sent':
      // Use the pre-generated notification text from metadata
      return event.metadata?.notificationText || event.metadata?.message || 'Payment sent';

    // Completion notification types
    case 'completion.project_activated':
      return `Your application has been accepted and the project is now active`;
    case 'completion.upfront_payment':
      // Generate detailed message with budget information
      const upfrontAmt = (event.metadata as any)?.upfrontAmount || (event.context as any)?.upfrontAmount || 0;
      const remainingBudgetAmt = (event.metadata as any)?.remainingBudget || (event.context as any)?.remainingBudget || 0;
      const projTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'your project';
      const orgNameForUpfront = (event.metadata as any)?.orgName || (event.context as any)?.orgName || 'Organization';
      const freelancerNameForUpfront = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isUpfrontCommissioner = currentUserId === event.actorId;

      if (isUpfrontCommissioner) {
        // Commissioner message - they sent the upfront payment
        return `You sent ${freelancerNameForUpfront} a $${upfrontAmt} invoice for your recently activated ${projTitle} project. This project has a budget of $${remainingBudgetAmt} left. Click here to view invoice details`;
      } else {
        // Freelancer message - they received the upfront payment
        if (upfrontAmt && remainingBudgetAmt) {
          return `${orgNameForUpfront} has paid $${upfrontAmt} upfront for your newly activated ${projTitle} project. This project has a budget of $${remainingBudgetAmt} left. Click here to view invoice details`;
        } else {
          return `Upfront payment received for your newly activated project`;
        }
      }
    case 'completion.task_approved':
      // Generate detailed message for task approval notifications
      const taskApprovalTaskTitle = (event.metadata as any)?.taskTitle || (event.context as any)?.taskTitle || 'task';
      const taskApprovalProjectTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'project';
      const taskApprovalCommissionerName = (event.metadata as any)?.commissionerName || (event.context as any)?.commissionerName || 'Commissioner';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isTaskApprovalCommissioner = currentUserId === event.actorId;

      if (isTaskApprovalCommissioner) {
        // Commissioner message - they approved the task
        return `You approved "${taskApprovalTaskTitle}" in ${taskApprovalProjectTitle}. Task approved and milestone completed. Click here to see project tracker.`;
      } else {
        // Freelancer message - their task was approved
        return `${taskApprovalCommissionerName} has approved your submission for "${taskApprovalTaskTitle}" in ${taskApprovalProjectTitle}. Task approved and milestone completed. Click here to see its project tracker.`;
      }
    case 'completion.invoice_received':
      // Generate detailed message for invoice received notifications
      const invoiceRecAmount = (event.metadata as any)?.amount || (event.context as any)?.amount || 0;
      const invoiceRecTaskTitle = (event.metadata as any)?.taskTitle || (event.context as any)?.taskTitle || 'task';
      const invoiceRecFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';
      const invoiceRecInvoiceNumber = (event.metadata as any)?.invoiceNumber || (event.context as any)?.invoiceNumber || '';

      return `${invoiceRecFreelancerName} sent you a $${invoiceRecAmount} invoice for ${invoiceRecTaskTitle}. Invoice #${invoiceRecInvoiceNumber}. Click here to review.`;
    case 'completion.invoice_paid':
      // Generate context-aware message for manual invoice payments
      const compInvoiceAmount = (event.metadata as any)?.amount || (event.context as any)?.amount || 0;
      const compTaskTitle = (event.metadata as any)?.taskTitle || (event.context as any)?.taskTitle || 'task';
      const compProjectTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'project';
      const compOrgName = (event.metadata as any)?.orgName || (event.context as any)?.orgName || 'Organization';
      const compFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';
      const compRemainingBudget = (event.metadata as any)?.remainingBudget || (event.context as any)?.remainingBudget || 0;

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isCommissioner = currentUserId === event.actorId;

      if (isCommissioner) {
        // Commissioner message - they made the payment
        return `You just paid ${compFreelancerName} $${compInvoiceAmount} for submitting ${compTaskTitle} for ${compProjectTitle}. Remaining budget: $${compRemainingBudget}. Click here to see transaction activity`;
      } else {
        // Freelancer message - they received the payment
        return `${compOrgName} has paid $${compInvoiceAmount} for your recent task submission. Click here to view invoice details`;
      }
    case 'completion.commissioner_payment':
      // Generate context-aware message for commissioner payment confirmation
      const commPaymentAmount = (event.metadata as any)?.amount || (event.context as any)?.amount || 0;
      const commPaymentProjectTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'project';
      const commPaymentOrgName = (event.metadata as any)?.organizationName || (event.context as any)?.orgName || 'Organization';
      const commPaymentFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';
      const commPaymentRemainingBudget = (event.metadata as any)?.remainingBudget || (event.context as any)?.remainingBudget || 0;

      return `${commPaymentOrgName} has paid ${commPaymentFreelancerName} $${commPaymentAmount} for your ongoing ${commPaymentProjectTitle} project. This project has a budget of $${commPaymentRemainingBudget} left. Click here to view invoice details`;
    case 'completion.project_completed':
      // Generate context-aware message for project completion
      const completionProjectTitle = (event.context as any)?.projectTitle || (event.metadata as any)?.projectTitle || 'project';
      const completionCommissionerName = (event.context as any)?.commissionerName || (event.metadata as any)?.commissionerName || 'Commissioner';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isCompletionCommissioner = currentUserId === event.actorId;

      if (isCompletionCommissioner) {
        // Commissioner message - they approved all tasks
        return `You have approved all tasks for ${completionProjectTitle}. Project is now complete.`;
      } else {
        // Freelancer message - commissioner approved all their tasks
        return `${completionCommissionerName} has approved all tasks for ${completionProjectTitle}. This project is now complete.`;
      }
    case 'project_completed':
      // Generate context-aware message for milestone project completion
      const projectCompletedTitle = event.metadata?.projectTitle || 'project';
      const projectCompletedCommissionerName = event.metadata?.commissionerName || 'Commissioner';

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isProjectCompletedCommissioner = currentUserId === event.actorId;

      if (isProjectCompletedCommissioner) {
        // Commissioner message - they approved all tasks
        return `You have approved all tasks for ${projectCompletedTitle}. This project is now complete.`;
      } else {
        // Freelancer message - commissioner approved all their tasks
        return `${projectCompletedCommissionerName} has approved all tasks for ${projectCompletedTitle}. This project is now complete.`;
      }
    case 'completion.final_payment':
      // Generate context-aware message for final payments
      const finalAmount = (event.metadata as any)?.finalAmount || (event.context as any)?.finalAmount || 0;
      const finalProjectTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'project';
      const finalOrgName = (event.metadata as any)?.orgName || (event.context as any)?.orgName || 'Organization';
      const finalFreelancerName = (event.metadata as any)?.freelancerName || (event.context as any)?.freelancerName || 'Freelancer';
      const finalPercent = (event.metadata as any)?.finalPercent || (event.context as any)?.finalPercent || 88;

      // Check if current user is the commissioner (actor) or freelancer (target)
      const isFinalCommissioner = currentUserId === event.actorId;

      if (isFinalCommissioner) {
        // Commissioner message - they made the final payment
        return `You just paid ${finalFreelancerName} $${finalAmount} for completing ${finalProjectTitle}. Remaining budget: $0. Click here to see transaction activity`;
      } else {
        // Freelancer message - they received the final payment
        return `${finalOrgName} has paid you $${finalAmount} for ${finalProjectTitle} final payment (remaining ${finalPercent}% of budget). Click here to view invoice details`;
      }
    case 'completion.rating_prompt':
      return `Please rate your experience with this project`;

    default:
      console.warn(`Unknown notification message type: ${event.type}`, event);
      return null; // Return null to filter out unknown events
  }
}

function generateNotificationLink(event: EventData, _project?: any, _task?: any, currentUserId?: number): string {
  switch (event.type) {
    case 'task_approved':
      // Always navigate to project tracking page for task approvals
      return `/freelancer-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
    case 'task_rejected':
    case 'task_rejected_with_comment':
      // Navigate to project tracking page
      return `/freelancer-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
    case 'project_paused':
    case 'project_pause_accepted':
    case 'project_pause_refused':
    case 'project_activated':
    case 'project_reactivated':
      // Navigate to project tracking page with dynamic route
      return `/freelancer-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
    case 'invoice_paid':
      // Navigate to specific invoice if available, otherwise invoices page
      if (event.context?.invoiceNumber || event.metadata?.invoiceNumber) {
        const invoiceNumber = event.context?.invoiceNumber || event.metadata?.invoiceNumber;
        return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`;
      }
      return `/freelancer-dashboard/projects-and-invoices/invoices`;
    case 'milestone_payment_received':
      // Navigate to invoice page to see invoice details
      const invoiceNumber = event.metadata?.invoiceNumber || event.context?.invoiceNumber;
      if (invoiceNumber) {
        return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`;
      }
      return `/freelancer-dashboard/projects-and-invoices/invoices`;
    case 'milestone_payment_sent':
    case 'payment_sent':
      // Navigate to payments page to see transaction activity
      return `/commissioner-dashboard/payments`;
    case 'invoice_created':
      // Navigate to the auto-generated invoice
      return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${event.context?.invoiceId}`;
    case 'gig_applied':
      // Navigate to job listings page for commissioners
      if (event.context?.gigId) {
        return `/commissioner-dashboard/job-listings?gigId=${event.context.gigId}`;
      }
      return `/commissioner-dashboard/job-listings`;
    case 'gig_request_sent':
      // Navigate to gig requests page with details open
      return `/freelancer-dashboard/gig-requests?requestId=${event.context?.requestId}&open=true`;
    case 'product_purchased':
      // Navigate to product inventory page
      return `/freelancer-dashboard/storefront/product-inventory`;
    case 'rating_prompt_freelancer':
      // Navigate to completed projects list where rating UI will be available
      return `/freelancer-dashboard/projects-and-invoices/project-list?status=completed`;
    case 'rating_prompt_commissioner':
      // Navigate to completed projects list where rating UI will be available
      return `/commissioner-dashboard/projects-and-invoices/project-list?status=completed`;
    case 'task_submitted':
      // Navigate to tasks to review page for commissioners
      if (event.context?.projectId && event.context?.taskId) {
        return `/commissioner-dashboard/projects-and-invoices/tasks-to-review?projectId=${event.context.projectId}&taskId=${event.context.taskId}`;
      }
      return `/commissioner-dashboard/projects-and-invoices/tasks-to-review`;
    case 'gig_rejected':
      // Navigate to gig explore page to see available gigs
      return `/freelancer-dashboard/gigs/explore-gigs`;

    // Completion notification links
    case 'completion.invoice_received':
      // Navigate to invoice details page for commissioners (works for both paid and unpaid invoices)
      const invoiceNum = event.context?.invoiceNumber || event.metadata?.invoiceNumber;
      if (invoiceNum) {
        return `/commissioner-dashboard/projects-and-invoices/invoices/invoice/${invoiceNum}`;
      }
      return `/commissioner-dashboard/projects-and-invoices/invoices`;
    case 'completion.invoice_paid':
      // Navigate to invoice details for freelancers
      const paidInvoiceNum = event.context?.invoiceNumber || event.metadata?.invoiceNumber;
      if (paidInvoiceNum) {
        return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${paidInvoiceNum}`;
      }
      return `/freelancer-dashboard/projects-and-invoices/invoices`;
    case 'completion.commissioner_payment':
      // Navigate to payments page for commissioners
      return `/commissioner-dashboard/payments`;
    case 'completion.project_activated':
    case 'completion.task_approved':
    case 'completion.project_completed':
      // Navigate to project tracking page (always freelancer for completion projects)
      return `/freelancer-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
    case 'project_completed':
      // Navigate to appropriate dashboard based on user role for milestone projects
      if (currentUserId && event.actorId === currentUserId) {
        // Commissioner (actor) - they approved all tasks
        return `/commissioner-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
      } else {
        // Freelancer (target) - they received the completion notification
        return `/freelancer-dashboard/projects-and-invoices/project-tracking/${event.context?.projectId}`;
      }
    case 'completion.upfront_payment':
    case 'completion.final_payment':
      // Navigate to invoice details for freelancers
      const completionInvoiceNum = event.context?.invoiceNumber || event.metadata?.invoiceNumber;
      if (completionInvoiceNum) {
        return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${completionInvoiceNum}`;
      }
      return `/freelancer-dashboard/projects-and-invoices/invoices`;

    default:
      return '#';
  }
}
