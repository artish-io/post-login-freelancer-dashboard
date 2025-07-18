'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // Determine user type based on the current path
  const userType = pathname?.includes('/freelancer-dashboard/') ? 'freelancer' : 'commissioner';

  const [activeTab, setActiveTab] = useState<'all' | 'network' | 'projects' | 'gigs'>('all');
  const [notificationCounts, setNotificationCounts] = useState({
    all: 0,
    network: 0,
    projects: 0,
    gigs: 0
  });

  const handleTabChange = (tab: 'all' | 'network' | 'projects' | 'gigs') => {
    setActiveTab(tab);
  };

  const handleCountsUpdate = (counts: { all: number; network?: number; projects?: number; gigs?: number }) => {
    setNotificationCounts({
      all: counts.all,
      network: counts.network || 0,
      projects: counts.projects || 0,
      gigs: counts.gigs || 0
    });
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
          projectsCount={notificationCounts.projects}
          gigsCount={notificationCounts.gigs}
          userType={userType}
        />
      </div>

      {/* Notifications List */}
      <div>
        <NotificationsList
          activeTab={activeTab}
          commissionerId={commissionerId}
          userType={userType}
          onNotificationClick={onNotificationClick}
          onCountsUpdate={handleCountsUpdate}
        />
      </div>
    </div>
  );
}