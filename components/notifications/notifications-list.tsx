'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationItem, { NotificationData } from './notification-item';
import NotificationsEmptyState from './notifications-empty-state';

interface NotificationsListProps {
  activeTab: 'all' | 'network';
  commissionerId: number;
  onNotificationClick?: (notification: NotificationData) => void;
  onCountsUpdate?: (counts: { all: number; network: number }) => void;
}

export default function NotificationsList({
  activeTab,
  commissionerId,
  onNotificationClick,
  onCountsUpdate
}: NotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, commissionerId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?commissionerId=${commissionerId}&tab=${activeTab}`);

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

  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Call parent handler
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