import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EventData, EventType, NOTIFICATION_TYPES, USER_TYPE_FILTERS } from '../../../lib/events/event-logger';
import { NotificationStorage } from '../../../lib/notifications/notification-storage';

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
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');

    // Get events using the new partitioned storage system
    const events: EventData[] = NotificationStorage.getEventsForUser(
      parseInt(userId),
      userType as 'freelancer' | 'commissioner',
      undefined, // startDate - defaults to 3 months ago
      undefined, // endDate - defaults to now
      200 // limit - get up to 200 recent events
    );

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    const organizations = JSON.parse(fs.readFileSync(organizationsPath, 'utf-8'));
    const projectTasks = JSON.parse(fs.readFileSync(projectTasksPath, 'utf-8'));
    const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf-8'));

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

      // User is the target of the event AND not the actor (no self-notifications)
      if (event.targetId === parseInt(userId) && parseInt(event.actorId) !== parseInt(userId)) return true;

      // User is involved in the project (but not for self-initiated actions)
      if (event.context?.projectId && parseInt(event.actorId) !== parseInt(userId)) {
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

      // Check if actor is in user's contacts
      const directContact = isActorInNetwork(parseInt(event.actorId), userId);
      if (directContact) {
        return true;
      }

      // For project-related notifications, check if user has ongoing projects with the actor
      if (event.context?.projectId) {
        const project = projects.find((p: any) => p.projectId === event.context.projectId);
        if (project) {
          // If it's a commissioner viewing, check if the freelancer is in their network
          if (userType === 'commissioner' && project.commissionerId === userId) {
            const freelancerInNetwork = isActorInNetwork(project.freelancerId, userId);
            if (freelancerInNetwork) {
              return true;
            }
          }
          // If it's a freelancer viewing, check if the commissioner is in their network
          if (userType === 'freelancer' && project.freelancerId === userId) {
            const commissionerInNetwork = isActorInNetwork(project.commissionerId, userId);
            if (commissionerInNetwork) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Convert events to notifications
    const notifications = groupedEvents.map(event => {
      const actor = users.find((u: any) => u.id === parseInt(event.actorId));
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
        iconPath = '/icons/task-awaiting-review.png';
      } else if (shouldUseTaskRejectionIcon(event.type)) {
        iconPath = '/icons/task-rejected.png';
      }

      const notificationId = `${event.id}-${userId}`;
      return {
        id: notificationId,
        type: getNotificationType(event.type),
        title: generateGranularTitle(event, actor, project, projectTaskData, task),
        message: generateGranularMessage(event, actor, project, projectTaskData, task),
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
          title: event.metadata.projectTitle || 'Unknown Project'
        } : undefined,
        gig: event.context?.gigId ? {
          id: event.context.gigId,
          title: event.metadata.gigTitle || 'Unknown Gig'
        } : undefined,
        context: event.context, // Add the context field for navigation
        metadata: event.metadata, // Add the metadata field for additional data
        isFromNetwork: isFromNetwork(event, parseInt(userId)),
        priority: event.metadata.priority || 'medium',
        iconPath: iconPath,
        notificationType: event.notificationType,
        groupCount: event.metadata.groupCount || 1,
        link: generateNotificationLink(event, project, task)
      };
    });

    // Filter by tab
    let filteredNotifications = notifications;
    if (userType === 'freelancer') {
      if (tab === 'projects') {
        filteredNotifications = notifications.filter(n =>
          ['task_submission', 'task_approved', 'task_rejected', 'project_pause_requested', 'project_pause_accepted'].includes(n.type)
        );
      } else if (tab === 'gigs') {
        filteredNotifications = notifications.filter(n => 
          ['gig_request', 'gig_application', 'proposal_sent'].includes(n.type)
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
      ['gig_request', 'gig_application', 'proposal_sent'].includes(n.type)
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
  const typeMap: Record<EventType, string> = {
    'task_submitted': 'task_submission',
    'task_approved': 'task_approved',
    'task_rejected': 'task_rejected',
    'task_created': 'task_created',
    'task_commented': 'task_comment',
    'project_created': 'project_created',
    'project_started': 'project_started',
    'project_paused': 'project_pause',
    'project_resumed': 'project_resumed',
    'project_completed': 'project_completed',
    'project_pause_requested': 'project_pause',
    'project_pause_accepted': 'project_pause_accepted',
    'project_pause_denied': 'project_pause_denied',
    'gig_posted': 'gig_posted',
    'gig_applied': 'gig_application',
    'gig_request_sent': 'gig_request',
    'gig_request_accepted': 'gig_request_accepted',
    'gig_request_declined': 'gig_request_declined',
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
    'task_completed': 'task_completed',
    'task_rejected_with_comment': 'task_rejected_with_comment',
    'milestone_payment_received': 'milestone_payment_received',
    'product_approved': 'product_approved',
    'product_rejected': 'product_rejected'
  };
  
  return typeMap[eventType] || eventType;
}

function shouldUseAvatar(eventType: EventType): boolean {
  return [
    'task_submitted',
    'project_pause_requested', // Freelancer requests pause - show freelancer avatar on commissioner side
    'invoice_sent', // Freelancer sends invoice - show freelancer avatar on commissioner side
    'gig_request_accepted', // Freelancer accepts gig request - show freelancer avatar on commissioner side
    'proposal_sent',
    'gig_applied' // Freelancer applies for gig - show freelancer avatar on commissioner side
  ].includes(eventType);
}

function shouldUseOrgLogo(eventType: EventType): boolean {
  return [
    'gig_request_sent' // Commissioner sends gig request - show organization logo on freelancer side
  ].includes(eventType);
}

function shouldUsePaymentIcon(eventType: EventType): boolean {
  return [
    'invoice_paid', // Commissioner pays invoice - show payment icon
    'product_purchased' // Storefront purchase - show payment icon
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
  Object.entries(grouped).forEach(([key, groupEvents]) => {
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

function generateGranularTitle(event: EventData, actor: any, project?: any, projectTaskData?: any, task?: any): string {
  const actorName = actor?.name || 'Someone';
  const groupCount = event.metadata.groupCount;

  switch (event.type) {
    case 'task_submitted':
      return `${actorName} submitted a task`;
    case 'task_approved':
      // Calculate remaining milestones
      const remainingTasks = projectTaskData?.tasks?.filter((t: any) => !t.completed).length || 0;
      if (remainingTasks === 0) {
        return `${actorName} approved "${event.metadata.taskTitle}". This project is now complete`;
      } else {
        return `${actorName} approved "${event.metadata.taskTitle}". This project now has ${remainingTasks} milestone${remainingTasks !== 1 ? 's' : ''} left`;
      }
    case 'task_rejected':
      return `${actorName} rejected "${event.metadata.taskTitle}". Click to see project tracker`;
    case 'task_rejected_with_comment':
      return `${actorName} rejected "${event.metadata.taskTitle}" with a comment. Click to see project tracker`;
    case 'task_completed':
      return 'Task marked as completed';
    case 'project_pause_requested':
      return `${actorName} requested a pause for your ${event.metadata.projectTitle} project`;
    case 'project_pause_accepted':
      return 'Project pause request approved';
    case 'gig_applied':
      if (groupCount && groupCount > 1) {
        return `${actorName} and ${groupCount - 1} others applied to "${event.metadata.gigTitle}"`;
      }
      return `${actorName} applied for ${event.metadata.gigTitle}`;
    case 'gig_request_sent':
      return `${event.metadata.organizationName || actorName} sent you a gig request for "${event.metadata.gigTitle}"`;
    case 'gig_request_accepted':
      return `${actorName} accepted your gig request`;
    case 'invoice_sent':
      return `${actorName} sent you a new invoice`;
    case 'invoice_paid':
      return `Your invoice for "${event.metadata.projectTitle || event.metadata.taskTitle || task?.title || 'project work'}" has been paid by ${actorName}`;
    case 'milestone_payment_received':
      return `Your invoice for "${event.context?.milestoneTitle || task?.title || 'milestone'}" has been paid by ${actorName}`;
    case 'product_purchased':
      return `You just made a new sale of "${event.metadata.productTitle}"`;
    case 'invoice_created':
      return `Auto-invoice generated for "${event.metadata.taskTitle}" - $${event.metadata.amount}`;
    case 'message_sent':
      return `New message from ${actorName}`;
    case 'proposal_sent':
      return `${actorName} sent you a proposal`;
    default:
      // Skip generic events - they shouldn't reach here if properly filtered
      return `Activity update`;
  }
}

function generateGranularMessage(event: EventData, actor: any, project?: any, projectTaskData?: any, task?: any): string {
  switch (event.type) {
    case 'task_submitted':
      return `"${event.metadata.taskTitle}" is awaiting your review`;
    case 'task_approved':
      // No subcaption needed - everything is in the title now
      return `Task approved and milestone completed`;
    case 'task_rejected':
      // No subcaption needed - everything is in the title now
      return `Task requires revision`;
    case 'task_rejected_with_comment':
      // No subcaption needed - everything is in the title now
      return `Task rejected with feedback`;
    case 'task_completed':
      return `"${event.metadata.taskTitle}" has been marked as completed`;
    case 'project_pause_requested':
      return event.metadata.pauseReason || 'Project pause requested';
    case 'project_pause_accepted':
      return `Your request to pause the ${event.metadata.projectTitle} project has been approved`;
    case 'gig_applied':
      if (event.metadata.groupCount && event.metadata.groupCount > 1) {
        return `${event.metadata.groupCount} applications received for "${event.metadata.gigTitle}"`;
      }
      return `New application for "${event.metadata.gigTitle}"`;
    case 'gig_request_sent':
      return `You have been invited to apply for ${event.metadata.gigTitle}`;
    case 'gig_request_accepted':
      return `Gig request for "${event.metadata.gigTitle}" has been accepted`;
    case 'invoice_sent':
      return `Invoice ${event.metadata.invoiceNumber} for ${event.metadata.projectTitle}`;
    case 'invoice_paid':
      return `Payment received for ${event.metadata.projectTitle || 'project'}`;
    case 'invoice_created':
      return `Invoice automatically generated for milestone completion`;
    case 'milestone_payment_received':
      return `Payment of $${event.metadata.amount} for "${event.context?.milestoneTitle}" has been received`;
    case 'product_purchased':
      return 'New sale on your storefront';
    case 'message_sent':
      return event.metadata.messagePreview || 'New message';
    case 'proposal_sent':
      return `New project proposal for ${event.metadata.proposalTitle || 'project'}`;
    default:
      return 'Activity update';
  }
}

function generateNotificationLink(event: EventData, project?: any, task?: any): string {
  switch (event.type) {
    case 'task_approved':
    case 'task_rejected':
    case 'task_rejected_with_comment':
      // Navigate to project tracking page
      return `/freelancer-dashboard/projects-and-invoices/project-tracking?projectId=${event.context?.projectId}`;
    case 'invoice_paid':
    case 'milestone_payment_received':
      // Navigate to specific invoice if available, otherwise invoices page
      if (event.context?.invoiceNumber || event.metadata?.invoiceNumber) {
        const invoiceNumber = event.context?.invoiceNumber || event.metadata?.invoiceNumber;
        return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`;
      }
      return `/freelancer-dashboard/projects-and-invoices/invoices`;
    case 'invoice_created':
      // Navigate to the auto-generated invoice
      return `/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${event.context?.invoiceId}`;
    case 'gig_request_sent':
      // Navigate to gig requests page with details open
      return `/freelancer-dashboard/gig-requests?requestId=${event.context?.requestId}&open=true`;
    case 'product_purchased':
      // Navigate to product inventory page
      return `/freelancer-dashboard/storefront/product-inventory`;
    default:
      return '#';
  }
}
