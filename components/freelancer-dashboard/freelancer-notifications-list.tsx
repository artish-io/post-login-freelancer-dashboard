'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationItem, { NotificationData } from '../notifications/notification-item';

interface FreelancerNotificationsListProps {
  activeTab: 'all' | 'projects' | 'gigs';
  freelancerId: number;
  onNotificationClick?: (notification: NotificationData) => void;
  onCountsUpdate?: (counts: { all: number; projects: number; gigs: number }) => void;
  onNotificationRead?: (notification: NotificationData) => void;
}

export default function FreelancerNotificationsList({
  activeTab,
  freelancerId,
  onNotificationClick,
  onCountsUpdate,
  onNotificationRead
}: FreelancerNotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications-v2?userId=${freelancerId}&userType=freelancer&tab=${activeTab}`);

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
        await fetch('/api/notifications-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notification.id,
            userId: freelancerId,
            userType: 'freelancer'
          })
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }

      // Notify parent that notification was read (for count updates)
      onNotificationRead?.(notification);

      // Dispatch custom event to notify other components (like top navbar)
      window.dispatchEvent(new CustomEvent('notificationRead', {
        detail: { notification, userType: 'freelancer' }
      }));
    }

    // Call parent click handler for navigation
    onNotificationClick?.(notification);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freelancerId, activeTab]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h5v12z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-600">
            {activeTab === 'all' 
              ? "You're all caught up! No new notifications."
              : `No ${activeTab} notifications at the moment.`
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-200">
        <AnimatePresence mode="wait">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <NotificationItem
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
