'use client';

import { useState } from 'react';
import NotificationsTabs from '../notifications/notifications-tabs';
import NotificationsList from '../notifications/notifications-list';
import { NotificationData } from '../notifications/notification-item';

interface FreelancerNotificationsPageLayoutProps {
  freelancerId: number;
  onNotificationClick?: (notification: NotificationData) => void;
}

export default function FreelancerNotificationsPageLayout({
  freelancerId,
  onNotificationClick
}: FreelancerNotificationsPageLayoutProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'network'>('all');
  const [notificationCounts, setNotificationCounts] = useState({
    all: 0,
    network: 0
  });

  const handleTabChange = (tab: 'all' | 'network') => {
    setActiveTab(tab);
  };

  const handleCountsUpdate = (counts: { all: number; network: number }) => {
    setNotificationCounts(counts);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <NotificationsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          allCount={notificationCounts.all}
          networkCount={notificationCounts.network}
        />
      </div>

      {/* Notifications List */}
      <div>
        <NotificationsList
          activeTab={activeTab}
          commissionerId={freelancerId}
          onNotificationClick={onNotificationClick}
          onCountsUpdate={handleCountsUpdate}
        />
      </div>
    </div>
  );
}
