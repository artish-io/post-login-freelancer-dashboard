'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export interface NotificationData {
  id: string;
  type: 'gig_application' | 'task_submission' | 'task_approved' | 'task_rejected' | 'project_pause' | 'project_pause_accepted' | 'project_pause_requested' | 'project_pause_refused' | 'project_paused' | 'project_pause_reminder' | 'project_activated' | 'project_reactivated' | 'gig_request' | 'gig_request_accepted' | 'gig_rejected' | 'project_accepted' | 'new_gig_request' | 'proposal_sent' | 'invoice_sent' | 'invoice_paid' | 'storefront_purchase' | 'task_submitted' | 'job_application' | 'invoice_reminder' | 'invoice_overdue_reminder' | 'milestone_payment_received' | 'milestone_payment_sent' | 'task_rejected_with_comment' | 'completion_project_activated' | 'completion_upfront_payment' | 'completion_task_approved' | 'completion_invoice_received' | 'completion_invoice_paid' | 'completion_project_completed' | 'completion_final_payment' | 'completion_rating_prompt';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  user?: {
    id: number;
    name: string;
    avatar: string;
    title?: string;
  };
  organization?: {
    id: number;
    name: string;
    logo: string;
  };
  project?: {
    id: number;
    title: string;
  };
  gig?: {
    id: number;
    title: string;
  };
  invoice?: {
    number: string;
    amount: number;
    dueDate: string;
  };
  context?: {
    projectId?: number;
    taskId?: number;
    gigId?: number;
    applicationId?: number;
    invoiceId?: string;
    invoiceNumber?: string;
    productId?: string;
    requestId?: string;
  };
  metadata?: {
    [key: string]: any;
  };
  isFromNetwork?: boolean;
  iconPath?: string; // For specific notification icons
  priority?: string;
  link?: string; // Navigation link for the notification
  actionTaken?: string | null; // Track if action was taken on this notification
}

interface NotificationItemProps {
  notification: NotificationData;
  onClick?: () => void;
}

const getNotificationIcon = (type: string, notification: NotificationData): string => {
  // If notification has a specific iconPath, use it
  if (notification.iconPath) {
    return notification.iconPath;
  }

  // If notification has organization logo, use it (for gig requests)
  if (notification.organization?.logo) {
    return notification.organization.logo;
  }

  // Default icons for different notification types
  switch (type) {
    case 'gig_application':
      return '/icons/gig-applied.png';
    case 'task_submission':
      return '/icons/task-awaiting-review.png';
    case 'task_approved':
      return '/icons/task-approved.png';
    case 'task_rejected':
      return '/icons/task-rejected.png';
    case 'gig_request':
      return '/icons/new-gig-request.png';
    case 'gig_rejected':
      return '/icons/gig-rejected.png';
    case 'proposal_sent':
      return '/icons/new-proposal.png';
    case 'invoice_sent':
      return '/icons/new-invoice.png';
    case 'invoice_reminder':
      return '/icons/invoice-reminder.png';
    case 'invoice_overdue_reminder':
      return '/icons/invoice-overdue.png';
    case 'milestone_payment_received':
      return '/icons/new-payment.png';
    case 'milestone_payment_sent':
      return '/icons/new-payment.png';
    case 'project_accepted':
      return '/icons/project-accepted.png';

    // Completion notification icons
    case 'completion_project_activated':
      return '/icons/project-activated.png';
    case 'completion_upfront_payment':
      return '/icons/new-payment.png';
    case 'completion_task_approved':
      return '/icons/task-approved.png';
    case 'completion_invoice_received':
      return '/icons/new-invoice.png';
    case 'completion_invoice_paid':
      return '/icons/new-payment.png';
    case 'completion_project_completed':
      return '/icons/project-completed.png';
    case 'completion_final_payment':
      return '/icons/new-payment.png';
    case 'completion_rating_prompt':
      return '/icons/rating-prompt.png';

    default:
      return '/icons/notification-default.png';
  }
};

// Types that should use user avatar instead of icon
const useUserAvatar = (type: string): boolean => {
  return [
    'project_pause', // Freelancer requests project pause - show freelancer avatar on commissioner side
    'invoice_sent', // Freelancer sends invoice - show freelancer avatar on commissioner side
    'gig_request_accepted', // Freelancer accepts gig request - show freelancer avatar on commissioner side
    'task_submission', // Freelancer submits task - show freelancer avatar on commissioner side
    'gig_application', // Freelancer applies for gig - show freelancer avatar on commissioner side
    'proposal_sent' // Freelancer sends proposal - show freelancer avatar on commissioner side
  ].includes(type);
};

export default function NotificationItem({
  notification,
  onClick
}: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
  const shouldUseUserAvatar = useUserAvatar(notification.type);

  return (
    <div
      className={`flex items-start gap-3 p-4 mb-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg border border-gray-100 ${
        !notification.isRead ? 'bg-pink-50' : ''
      }`}
      onClick={onClick}
    >
      {/* User Avatar or Icon */}
      <div className="flex-shrink-0 w-10">
        {notification.user?.avatar && shouldUseUserAvatar ? (
          <Image
            src={notification.user.avatar}
            alt={notification.user.name}
            width={40}
            height={40}
            className="rounded-full object-cover w-10 h-10"
          />
        ) : (
          <Image
            src={getNotificationIcon(notification.type, notification)}
            alt="icon"
            width={24}
            height={24}
          />
        )}
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900 font-medium">
              {notification.title}
            </p>
            {notification.type !== 'gig_application' && (
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
            )}

          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 ml-4">
            <p className="text-xs text-gray-500">
              {timeAgo}
            </p>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-[#eb1966] rounded-full mt-1 ml-auto"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}