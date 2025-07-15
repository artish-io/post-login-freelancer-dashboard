'use client';

import { useState } from 'react';
import NotificationsTabs from './notifications-tabs';
import NotificationsList from './notifications-list';
import { NotificationData } from './notification-item';

interface NotificationsPageLayoutProps {
  commissionerId: number;
  onNotificationClick?: (notification: NotificationData) => void;
}

export default function NotificationsPageLayout({
  commissionerId,
  onNotificationClick
}: NotificationsPageLayoutProps) {
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
          commissionerId={commissionerId}
          onNotificationClick={onNotificationClick}
          onCountsUpdate={handleCountsUpdate}
        />
      </div>
    </div>
  );
}