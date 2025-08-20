import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EventData, EventType, USER_TYPE_FILTERS } from '../../../lib/events/event-logger';
import { NotificationStorage } from '../../../lib/notifications/notification-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';


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

      // Special case: milestone_payment_sent notifications are self-notifications for commissioners
      if (event.type === 'milestone_payment_sent' && event.targetId === parseInt(userId)) {
        return true;
      }

      // Special case: completion.upfront_payment notifications for commissioners are self-notifications
      if (event.type === 'completion.upfront_payment' && event.targetId === parseInt(userId) && event.actorId === parseInt(userId)) {
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

    // Convert events to notifications
    const notificationPromises = validEvents.map(async event => {
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

      const title = await generateGranularTitle(event, actor, project, projectTaskData, task);
      // Use pre-generated message from completion notifications if available and not a fallback message
      const preGeneratedMessage = (event as any).message;
      const isFallbackMessage = preGeneratedMessage && preGeneratedMessage.startsWith('Completion event:');
      const message = (preGeneratedMessage && !isFallbackMessage)
        ? preGeneratedMessage
        : generateGranularMessage(event, actor, project, projectTaskData, task);

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
        link: generateNotificationLink(event, project, task),
        actionTaken: NotificationStorage.isActioned(event.id, parseInt(userId))
      };
    });

    const notifications = (await Promise.all(notificationPromises)).filter(notification => notification !== null);

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
    'product_approved': 'product_approved',
    'product_rejected': 'product_rejected',

    // Completion notification types
    'completion.project_activated': 'completion_project_activated',
    'completion.upfront_payment': 'completion_upfront_payment',
    'completion.task_approved': 'completion_task_approved',
    'completion.invoice_received': 'completion_invoice_received',
    'completion.invoice_paid': 'completion_invoice_paid',
    'completion.project_completed': 'completion_project_completed',
    'completion.final_payment': 'completion_final_payment',
    'completion.rating_prompt': 'completion_rating_prompt'
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

async function generateGranularTitle(event: EventData, actor: any, _project?: any, projectTaskData?: any, task?: any): Promise<string | null> {
  const actorName = actor?.name || 'Someone';
  const groupCount = event.metadata?.groupCount || 1;

  switch (event.type) {
    case 'task_submitted':
      return `${actorName} submitted a task`;
    case 'task_approved':
      // Use the new project completion detector for accurate milestone counts
      try {
        const { detectProjectCompletion } = await import('../../../lib/notifications/project-completion-detector');

        // Handle both string and number project IDs
        const projectId = event.context?.projectId;
        if (!projectId) {
          throw new Error('No project ID found in event context');
        }

        const completionStatus = await detectProjectCompletion(
          projectId,
          event.metadata?.taskId
        );

        // For task approval notifications, show remaining milestones AFTER this approval
        const remainingMilestones = Math.max(0, completionStatus.remainingTasks);

        if (remainingMilestones === 0) {
          // For final tasks, just mention it's the final submission without project completion text
          // Project completion will be handled by a separate notification
          return `${actorName} has approved your final submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. Click here to see its project tracker.`;
        } else {
          return `${actorName} has approved your submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. This project has ${remainingMilestones} milestone${remainingMilestones !== 1 ? 's' : ''} left. Click here to see its project tracker.`;
        }
      } catch (error) {
        console.warn('Failed to detect project completion for notification message:', error);
        // Fallback to simple message
        return `${actorName} has approved your submission of "${event.metadata?.taskTitle || 'task'}" for ${event.metadata?.projectTitle || 'this project'}. Click here to see its project tracker.`;
      }
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
      return `${event.metadata?.projectTitle || 'Project'} has been completed! All tasks have been approved. Click here to see the project summary.`;
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
      return `${actorName} sent you a new invoice`;
    case 'invoice_paid':
      return `Your invoice for "${event.metadata?.projectTitle || event.metadata?.taskTitle || task?.title || 'project work'}" has been paid by ${actorName}`;
    case 'milestone_payment_received':
      const organizationName = event.metadata?.organizationName || actorName;
      const amount = event.metadata?.amount ? `$${event.metadata.amount.toLocaleString()}` : 'payment';
      return `${organizationName} has paid ${amount} for your recent task submission. Click here to view invoice details`;
    case 'milestone_payment_sent':
      const freelancerName = event.metadata?.freelancerName || 'freelancer';
      const paidAmount = event.metadata?.amount ? `$${event.metadata.amount.toLocaleString()}` : 'payment';
      const taskTitle = event.metadata?.taskTitle || 'task';
      const projectTitle = event.metadata?.projectTitle || 'this project';
      const remainingBudget = event.metadata?.remainingBudget;
      const remainingBudgetText = remainingBudget !== undefined ? ` Remaining budget: $${remainingBudget.toLocaleString()}.` : '';
      return `You just paid ${freelancerName} ${paidAmount} for submitting ${taskTitle} for ${projectTitle}.${remainingBudgetText} Click here to see transaction activity`;
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
      return `Rate ${event.metadata?.freelancerName || 'the freelancer'}'s work`;

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
      return `${actorName} paid your invoice`;
    case 'completion.project_completed':
      return `Project completed`;
    case 'completion.final_payment':
      return `${actorName} sent final payment`;
    case 'completion.rating_prompt':
      return `Rate your experience`;

    default:
      // Skip generic events - they shouldn't reach here if properly filtered
      console.warn(`Unknown notification type: ${event.type}`, event);
      return null; // Return null to filter out unknown events
  }
}

function generateGranularMessage(event: EventData, _actor: any, _project?: any, _projectTaskData?: any, task?: any): string | null {
  switch (event.type) {
    case 'task_submitted':
      return `"${event.metadata?.taskTitle || 'Task'}" is awaiting your review`;
    case 'task_approved':
      return `Task approved and milestone completed`;
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
    case 'project_activated':
      const taskCount = event.metadata?.taskCount || 1;
      const dueDate = event.metadata?.dueDate || 'the deadline';
      return `This project is now active and includes ${taskCount} milestone${taskCount !== 1 ? 's' : ''} due by ${dueDate}`;
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
      return `Payment received for ${event.metadata?.projectTitle || 'project'}`;
    case 'invoice_created':
      return `Invoice automatically generated for milestone completion`;
    case 'milestone_payment_received':
      const organizationName = event.metadata?.organizationName || 'Organization';
      const amount = event.metadata?.amount ? `$${event.metadata.amount.toLocaleString()}` : 'payment';
      return `${organizationName} has paid ${amount} for your recent task submission. Click here to view invoice details`;
    case 'milestone_payment_sent':
      const freelancerName = event.metadata?.freelancerName || 'freelancer';
      const paidAmount = event.metadata?.amount ? `$${event.metadata.amount.toLocaleString()}` : 'payment';
      const taskTitle = event.metadata?.taskTitle || 'task';
      const projectTitle = event.metadata?.projectTitle || 'this project';
      const remainingBudget = event.metadata?.remainingBudget;
      const remainingBudgetText = remainingBudget !== undefined ? ` Remaining budget: $${remainingBudget.toLocaleString()}.` : '';
      return `You just paid ${freelancerName} ${paidAmount} for submitting ${taskTitle} for ${projectTitle}.${remainingBudgetText} Click here to see transaction activity`;
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
      return event.metadata?.message || `Rate ${event.metadata?.freelancerName || 'the freelancer'}'s work on ${event.metadata?.projectTitle || 'this project'}`;

    // Completion notification types
    case 'completion.project_activated':
      return `Your application has been accepted and the project is now active`;
    case 'completion.upfront_payment':
      // Generate detailed message with budget information
      const upfrontAmt = (event.metadata as any)?.upfrontAmount || (event.context as any)?.upfrontAmount || 0;
      const remainingBudgetAmt = (event.metadata as any)?.remainingBudget || (event.context as any)?.remainingBudget || 0;
      const projTitle = (event.metadata as any)?.projectTitle || (event.context as any)?.projectTitle || 'your project';
      const orgNameForUpfront = (event.metadata as any)?.orgName || (event.context as any)?.orgName || 'Organization';

      if (upfrontAmt && remainingBudgetAmt) {
        return `${orgNameForUpfront} has paid $${upfrontAmt} upfront for your newly activated ${projTitle} project. This project has a budget of $${remainingBudgetAmt} left. Click here to view invoice details`;
      } else {
        return `Upfront payment received for your newly activated project`;
      }
    case 'completion.task_approved':
      return `Your task submission has been approved`;
    case 'completion.invoice_received':
      return `New invoice received for review`;
    case 'completion.invoice_paid':
      return `Your invoice has been paid`;
    case 'completion.project_completed':
      return `All project tasks have been completed`;
    case 'completion.final_payment':
      return `Final payment has been processed`;
    case 'completion.rating_prompt':
      return `Please rate your experience with this project`;

    default:
      console.warn(`Unknown notification message type: ${event.type}`, event);
      return null; // Return null to filter out unknown events
  }
}

function generateNotificationLink(event: EventData, _project?: any, _task?: any): string {
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
      // Navigate to completed projects tab where rating UI will be available
      return `/freelancer-dashboard/projects-and-invoices/project-list?status=completed`;
    case 'rating_prompt_commissioner':
      // Navigate to completed projects page where rating UI will be available
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
    default:
      return '#';
  }
}
