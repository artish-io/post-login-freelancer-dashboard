'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  iconPath?: string;
  link?: string;
  userId?: number;
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
};

type Props = {
  dashboardType: 'freelancer' | 'commissioner';
};

export default function NotificationDropdown({ dashboardType }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Fetch unread count on component mount and periodically
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount();

      // Set up polling for unread count every 10 seconds for better responsiveness
      const interval = setInterval(fetchUnreadCount, 10000);

      // Listen for custom notification refresh events
      const handleNotificationRefresh = () => {
        fetchUnreadCount();
        if (open) {
          fetchNotifications();
        }
      };

      window.addEventListener('notificationRefresh', handleNotificationRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('notificationRefresh', handleNotificationRefresh);
      };
    }
  }, [session?.user?.id, dashboardType, open]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open && session?.user?.id) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.user?.id, dashboardType]);

  const fetchUnreadCount = async () => {
    if (!session?.user?.id) return;

    try {
      // Use v2 API for both user types for consistent filtering
      const endpoint = `/api/notifications-v2?userId=${session.user.id}&userType=${dashboardType}&tab=all`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.notifications) {
        // Count unread notifications
        const unreadNotifications = data.notifications.filter((n: NotificationItem) => !n.isRead);
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      // Use v2 API for both user types for consistent filtering
      const endpoint = `/api/notifications-v2?userId=${session.user.id}&userType=${dashboardType}&tab=all`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.notifications) {
        // Take first 5 notifications for dropdown
        setNotifications(data.notifications.slice(0, 5));
        // Update unread count based on fetched notifications
        const unreadNotifications = data.notifications.filter((n: NotificationItem) => !n.isRead);
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    // Listen for notification read events from other components
    const handleNotificationRead = (event: CustomEvent) => {
      const { userType: eventUserType } = event.detail;
      // Only update count if the event is for the same dashboard type
      if (eventUserType === dashboardType) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('notificationRead', handleNotificationRead as EventListener);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('notificationRead', handleNotificationRead as EventListener);
    };
  }, [dashboardType]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return time.toLocaleDateString();
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    // Close dropdown
    setOpen(false);

    // Mark notification as read locally and on server
    if (!notification.isRead) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Mark as read on server
      try {
        if (dashboardType === 'commissioner') {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: notification.id,
              commissionerId: session?.user?.id
            })
          });
        } else {
          // For freelancers, use the notifications-v2 endpoint
          await fetch('/api/notifications-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: notification.id,
              userId: session?.user?.id,
              userType: dashboardType
            })
          });
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to the notification link if it exists
    if (notification.link && notification.link !== '#') {
      router.push(notification.link);
    }
  };

  // Types that should use user avatar instead of icon
  const shouldUseUserAvatar = (type: string): boolean => {
    return ['project_accepted', 'invoice_sent'].includes(type);
  };

  const getNotificationTypeIcon = (type: string): string => {
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
      case 'project_pause':
        return '/icons/project-pause.png';
      case 'project_accepted':
        return '/icons/project-accepted.png';
      case 'gig_request':
        return '/icons/gig-request.png';
      default:
        return '/icons/notification-default.png';
    }
  };

  const getNotificationIcon = (notification: NotificationItem) => {
    // Use the iconPath from the API if available
    if (notification.iconPath) {
      return (
        <Image
          src={notification.iconPath}
          alt="Notification"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      );
    }

    // Use user avatar for specific notification types
    if (notification.user?.avatar && shouldUseUserAvatar(notification.type)) {
      return (
        <Image
          src={notification.user.avatar}
          alt={notification.user.name || 'User'}
          width={36}
          height={36}
          className="rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default-avatar.png';
          }}
        />
      );
    }

    // Use type-based icon for other notifications
    return (
      <Image
        src={getNotificationTypeIcon(notification.type)}
        alt="Notification"
        width={24}
        height={24}
        className="w-6 h-6"
      />
    );
  };

  const viewAllLink = dashboardType === 'commissioner' 
    ? '/commissioner-dashboard/notifications'
    : '/freelancer-dashboard/notifications';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition relative"
      >
        <Image src="/bell-icon.png" alt="Notifications" width={20} height={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-2 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white rounded-xl shadow-xl p-4 z-50">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Notifications</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ul className="space-y-3 max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="text-center py-8 text-gray-500 text-sm">
                  No notifications yet
                </li>
              ) : (
                notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-pink-50' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {getNotificationIcon(notif)}
                    <div className="text-sm flex-1 min-w-0">
                      <p className="text-black leading-snug">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notif.timestamp)}</p>
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-pink-500 rounded-full mt-1"></div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}

          {/* View All Button */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <Link
              href={viewAllLink}
              className="block w-full text-center py-2 text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
