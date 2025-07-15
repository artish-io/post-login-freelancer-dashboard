'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export interface NotificationData {
  id: string;
  type: 'gig_application' | 'task_submission' | 'project_pause' | 'gig_request' | 'project_accepted' | 'new_gig_request' | 'proposal_sent' | 'invoice_sent';
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
  project?: {
    id: number;
    title: string;
  };
  gig?: {
    id: number;
    title: string;
  };
  isFromNetwork?: boolean;
}

interface NotificationItemProps {
  notification: NotificationData;
  onClick?: () => void;
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'gig_application':
      return '/icons/gig-applied.png';
    case 'task_submission':
      return '/icons/task-awaiting-review.png';
    case 'new_gig_request':
      return '/icons/new-gig-request.png';
    case 'proposal_sent':
      return '/icons/new-proposal.png';
    case 'invoice_sent':
      return '/icons/new-invoice.png';
    default:
      return '/icons/notification-default.png';
  }
};

// Types that should use user avatar instead of icon
const useUserAvatar = (type: string): boolean => {
  return ['project_pause', 'gig_request', 'project_accepted', 'proposal_sent', 'invoice_sent'].includes(type);
};

export default function NotificationItem({
  notification,
  onClick
}: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  return (
    <div
      className={`flex items-start gap-3 p-4 mb-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg border border-gray-100 ${
        !notification.isRead ? 'bg-pink-50' : ''
      }`}
      onClick={onClick}
    >
      {/* User Avatar or Icon */}
      <div className="flex-shrink-0 w-10">
        {notification.user?.avatar && useUserAvatar(notification.type) ? (
          <Image
            src={notification.user.avatar}
            alt={notification.user.name}
            width={40}
            height={40}
            className="rounded-full object-cover w-10 h-10"
          />
        ) : (
          <Image
            src={getNotificationIcon(notification.type)}
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
            {notification.project && (
              <p className="text-xs text-gray-500 mt-1">
                Project: {notification.project.title}
              </p>
            )}
            {notification.gig && notification.type !== 'gig_application' && (
              <p className="text-xs text-gray-500 mt-1">
                Gig: {notification.gig.title}
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