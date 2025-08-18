'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationData } from '../notifications/notification-item';

// Helper functions for notification display
const getNotificationIcon = (type: NotificationData['type']): string => {
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
    case 'milestone_payment_sent':
      return '/icons/payment-sent.png';
    default:
      return '/icons/notification-default.png';
  }
};



// Format timestamp to relative time
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 48) return 'Yesterday';
  return time.toLocaleDateString();
};

export default function CommissionerNotificationsPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!session?.user?.id) return;

      setLoading(true);
      try {
        // Use the same API endpoint as the main notifications page for consistency
        const userType = (session.user as any).userType || 'commissioner';
        const response = await fetch(`/api/notifications-v2?userId=${session.user.id}&userType=${userType}&tab=all`);
        if (!response.ok) throw new Error('Failed to fetch notifications');

        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('[notifications] load error:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [session?.user?.id]);

  const displayed = notifications.slice(0, 4);

  // Mark as read locally
  const markAsRead = (id: string) =>
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );

  // Navigate to full notifications page
  const handleViewAllNotifications = () => {
    router.push('/commissioner-dashboard/notifications');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm px-6 py-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-gray-200 rounded w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">
          Notifications
        </h3>
      </div>

      {/* ─── List ─────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {displayed.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => markAsRead(notification.id)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.isRead
                    ? 'hover:bg-gray-50'
                    : 'bg-pink-50 hover:bg-pink-100'
                }`}
              >
                {/* Avatar / Icon */}
                <div className="flex-shrink-0 w-10">
                  {notification.user?.avatar ? (
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

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug text-gray-900">
                    <span
                      className={`font-medium ${
                        notification.isRead ? '' : 'font-semibold'
                      }`}
                    >
                      {notification.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(notification.timestamp)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ─── View All Notifications ──────────────────────────── */}
        {notifications.length > 4 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleViewAllNotifications}
              className="bg-pink-100 hover:bg-pink-200 p-2 rounded-full shadow-sm transition-colors"
              title="View all notifications"
            >
              <svg
                className="w-4 h-4 text-pink-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">No notifications</div>
        )}
      </div>
    </div>
  );
}
