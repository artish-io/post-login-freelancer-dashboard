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

  const handleNotificationRead = (notification: NotificationData) => {
    // Decrease the count for the current tab and all tab
    setNotificationCounts(prev => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
      [activeTab]: activeTab !== 'all' ? Math.max(0, prev[activeTab] - 1) : prev[activeTab]
    }));
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
          userType="freelancer"
        />
      </div>

      {/* Notifications List */}
      <div>
        <NotificationsList
          activeTab={activeTab}
          commissionerId={freelancerId}
          userType="freelancer"
          onNotificationClick={onNotificationClick}
          onCountsUpdate={handleCountsUpdate}
          onNotificationRead={handleNotificationRead}
        />
      </div>
    </div>
  );
}
