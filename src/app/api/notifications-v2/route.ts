import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EventData, EventType, USER_TYPE_FILTERS } from '../../../lib/events/event-logger';
import { NotificationStorage } from '../../../lib/notifications/notification-storage';
import { readAllProjects } from '@/lib/projects-utils';
import { readAllTasks } from '@/lib/project-tasks/hierarchical-storage';


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
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');

    // Get events using the new partitioned storage system
    const events: EventData[] = NotificationStorage.getEventsForUser(
      parseInt(userId),
      userType as 'freelancer' | 'commissioner',
      undefined, // startDate - defaults to 3 months ago
      undefined, // endDate - defaults to now
      200 // limit - get up to 200 recent events
    );

    // Load data from repos and controlled utilities
    const { getAllUsers } = await import('@/lib/storage/unified-storage-service');
    const { readAllFreelancers } = await import('@/lib/freelancers-utils');
    const [users, freelancers, projects, organizations, contacts, allTasks] = await Promise.all([
      getAllUsers(), // Use hierarchical storage for users
      readAllFreelancers(), // Use controlled freelancers utility
      readAllProjects(), // Use projects repo
      fs.promises.readFile(organizationsPath, 'utf-8').then(data => JSON.parse(data)),
      fs.promises.readFile(contactsPath, 'utf-8').then(data => JSON.parse(data)),
      readAllTasks() // Use tasks repo
    ]);

    // Group tasks by project for compatibility with existing logic
    const projectTasks = allTasks.reduce((acc: any[], task) => {
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

      // User is the target of the event AND not the actor (no self-notifications)
      if (event.targetId === parseInt(userId) && event.actorId !== parseInt(userId)) return true;

      // For certain notification types, only show to the specific target user
      const targetOnlyNotifications = [
        'project_pause_accepted',
        'project_pause_refused',
        'project_paused',
        'invoice_paid',
        'milestone_payment_received'
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

    // Convert events to notifications
    const notifications = groupedEvents.map(event => {
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

      // Check if this is a project completion notification for rating
      const isProjectComplete = event.type === 'task_approved' &&
        projectTaskData?.tasks?.filter((t: any) => t.status !== 'Approved' || !t.completed).length === 0;

      return {
        id: notificationId,
        type: isProjectComplete ? 'project_complete_rating' : getNotificationType(event.type),
        title: generateGranularTitle(event, actor, project, projectTaskData, task, userType),
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
        metadata: {
          ...event.metadata,
          // Add rating-specific metadata for project completion
          ...(isProjectComplete && {
            canRate: true,
            subjectUserId: userType === 'freelancer' ? project?.commissionerId : project?.freelancerId,
            subjectUserType: userType === 'freelancer' ? 'commissioner' : 'freelancer',
            subjectName: userType === 'freelancer' ? actor?.name : users.find(u => u.id === project?.freelancerId)?.name
          })
        }, // Add the metadata field for additional data
        isFromNetwork: isFromNetwork(event, parseInt(userId)),
        priority: event.metadata.priority || 'medium',
        iconPath: iconPath,
        notificationType: event.notificationType,
        groupCount: event.metadata.groupCount || 1,
        link: generateNotificationLink(event, project, task),
        actionTaken: NotificationStorage.isActioned(event.id, parseInt(userId))
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
    'project_pause_denied': 'project_pause_denied',
    'project_pause_refused': 'project_pause_refused',
    'gig_posted': 'gig_posted',
    'gig_applied': 'gig_application',
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
    'product_approved': 'product_approved',
    'product_rejected': 'product_rejected',
    'project_rating_submitted': 'project_rating_received'
  };
  
  return typeMap[eventType] || eventType;
}

function shouldUseAvatar(eventType: EventType): boolean {
  return [
    'task_submitted',
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

function generateGranularTitle(event: EventData, actor: any, _project?: any, projectTaskData?: any, _task?: any, userType?: string): string {
  const actorName = actor?.name || 'Someone';
  const groupCount = event.metadata.groupCount;

  switch (event.type) {
    case 'task_submitted':
      return `${actorName} submitted a task`;
    case 'task_approved':
      // Calculate remaining milestones (only count tasks that are not approved)
      const remainingTasks = projectTaskData?.tasks?.filter((t: any) => t.status !== 'Approved' || !t.completed).length || 0;
      if (remainingTasks === 0) {
        // Project is complete - add rating prompt based on user type
        const projectTitle = event.metadata.projectTitle || 'this project';
        if (userType === 'freelancer') {
          // Freelancer sees: Commissioner approved task, project complete, click to rate
          return `${actorName} approved "${event.metadata.taskTitle}" for ${projectTitle}. This project is now complete. Click here to rate`;
        } else {
          // Commissioner sees: You approved all milestones, click to rate freelancer
          const freelancerName = event.metadata.freelancerName || 'the freelancer';
          return `You have approved all task milestones for ${projectTitle}. Click here to rate ${freelancerName} for their work on this project. Your rating improves the experience of other project managers on ARTISH`;
        }
      } else {
        return `${actorName} approved "${event.metadata.taskTitle}". Only ${remainingTasks} milestone${remainingTasks !== 1 ? 's' : ''} remain${remainingTasks === 1 ? 's' : ''} for this project`;
      }
    case 'task_rejected':
      return `${actorName} rejected "${event.metadata.taskTitle}". Revisions are required. View notes and resume progress`;
    case 'task_rejected_with_comment':
      return `${actorName} rejected "${event.metadata.taskTitle}". Revisions are required. View notes and resume progress`;
    case 'task_completed':
      return 'Task marked as completed';
    case 'project_pause_requested':
      return `${actorName} has requested a pause for ${event.metadata.projectTitle}. Click to view the project tracker and respond.`;
    case 'project_pause_accepted':
      return 'Project pause request approved';
    case 'project_activated':
      return `${actorName} accepted your application for ${event.metadata.gigTitle}`;
    case 'project_paused':
      return `${actorName} has paused ${event.metadata.projectTitle}`;
    case 'project_reactivated':
      return `${actorName} has re-activated ${event.metadata.projectTitle}. Work can now resume!`;
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
      return `Your invoice for "${event.metadata.projectTitle || event.metadata.taskTitle || _task?.title || 'project work'}" has been paid by ${actorName}`;
    case 'milestone_payment_received':
      return `Your invoice for "${event.context?.milestoneTitle || _task?.title || 'milestone'}" has been paid by ${actorName}`;
    case 'product_purchased':
      return `You just made a new sale of "${event.metadata.productTitle}"`;
    case 'invoice_created':
      return `Auto-invoice generated for "${event.metadata.taskTitle}" - $${event.metadata.amount}`;
    case 'message_sent':
      return `New message from ${actorName}`;
    case 'proposal_sent':
      return `${actorName} sent you a proposal`;
    case 'proposal_accepted':
      return `Your proposal has been accepted`;
    case 'proposal_rejected':
      return `${event.metadata.organizationName || actorName} rejected your proposal`;
    case 'gig_rejected':
      return `${event.metadata.organizationName || actorName} rejected your application for "${event.metadata.gigTitle}"`;
    case 'project_rating_submitted':
      const stars = event.metadata.stars || 0;
      const projectTitle = event.metadata.projectTitle || 'project';
      return `${actorName} rated you ${stars}/5 stars for your work on ${projectTitle}`;
    default:
      // Skip generic events - they shouldn't reach here if properly filtered
      return `Activity update`;
  }
}

function generateGranularMessage(event: EventData, _actor: any, _project?: any, _projectTaskData?: any, _task?: any): string {
  switch (event.type) {
    case 'task_submitted':
      return `"${event.metadata.taskTitle}" is awaiting your review`;
    case 'task_approved':
      return `Task approved and milestone completed`;
    case 'task_rejected':
      return `Task requires revision`;
    case 'task_rejected_with_comment':
      return `Task rejected with feedback`;
    case 'task_completed':
      return `"${event.metadata.taskTitle}" has been marked as completed`;
    case 'project_pause_requested':
      return event.metadata.pauseReason || 'Project pause requested';
    case 'project_pause_accepted':
      return `Your request to pause the ${event.metadata.projectTitle} project has been approved`;
    case 'project_activated':
      const taskCount = event.metadata.taskCount || 1;
      const dueDate = event.metadata.dueDate || 'the deadline';
      return `This project is now active and includes ${taskCount} milestone${taskCount !== 1 ? 's' : ''} due by ${dueDate}`;
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
    case 'proposal_accepted':
      return `Your proposal for "${event.metadata.proposalTitle}" has been accepted and a project has been created`;
    case 'proposal_rejected':
      return event.metadata.rejectionReason || 'No reason provided';
    case 'gig_rejected':
      return event.metadata.rejectionMessage || 'You will be able to re-apply if this gig listing is still active after 21 days.';
    case 'project_rating_submitted':
      const stars = event.metadata.stars || 0;
      const projectTitle = event.metadata.projectTitle || 'project';
      return `${stars}/5 stars for your collaboration on ${projectTitle}`;
    default:
      return 'Activity update';
  }
}

function generateNotificationLink(event: EventData, _project?: any, _task?: any): string {
  switch (event.type) {
    case 'task_approved':
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
    case 'gig_applied':
      // Navigate to gig applications page for commissioners
      return `/commissioner-dashboard/gigs/applications?gigId=${event.context?.gigId}`;
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
