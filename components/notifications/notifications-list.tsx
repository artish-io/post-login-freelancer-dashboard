'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationItem, { NotificationData } from './notification-item';
import NotificationsEmptyState from './notifications-empty-state';

interface NotificationsListProps {
  activeTab: 'all' | 'network' | 'projects' | 'gigs';
  commissionerId: number;
  userType?: 'commissioner' | 'freelancer';
  onNotificationClick?: (notification: NotificationData) => void;
  onCountsUpdate?: (counts: { all: number; network?: number; projects?: number; gigs?: number }) => void;
  onNotificationRead?: (notification: NotificationData) => void;
}

export default function NotificationsList({
  activeTab,
  commissionerId,
  userType = 'commissioner',
  onNotificationClick,
  onCountsUpdate,
  onNotificationRead
}: NotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, commissionerId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Use the v2 API for both user types for consistent filtering
      const endpoint = `/api/notifications-v2?userId=${commissionerId}&userType=${userType}&tab=${activeTab}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);

      // Update counts in parent component
      if (onCountsUpdate && data.counts) {
        onCountsUpdate(data.counts);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read locally
    const wasUnread = !notification.isRead;
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Mark as read on server
    if (wasUnread) {
      try {
        if (userType === 'commissioner') {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: notification.id,
              commissionerId: commissionerId
            })
          });
        } else {
          // For freelancers, use the notifications-v2 endpoint
          await fetch('/api/notifications-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: notification.id,
              userId: commissionerId,
              userType: userType
            })
          });
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Notify parent that notification was read (for count updates)
    if (wasUnread) {
      onNotificationRead?.(notification);

      // Dispatch custom event to notify other components (like top navbar)
      window.dispatchEvent(new CustomEvent('notificationRead', {
        detail: { notification, userType }
      }));
    }

    // Call parent click handler for navigation
    onNotificationClick?.(notification);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`empty-${activeTab}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <NotificationsEmptyState
            activeTab={activeTab}
            message={
              activeTab === 'network'
                ? "No notifications from your network yet"
                : "No notifications yet"
            }
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="space-y-0"
      >
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: "easeInOut"
            }}
          >
            <NotificationItem
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}