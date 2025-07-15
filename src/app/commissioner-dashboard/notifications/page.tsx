'use client';


import { useSession } from 'next-auth/react';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import NotificationsPageLayout from '../../../../components/notifications/notifications-page-layout';
import MessagesPreview from '../../../../components/freelancer-dashboard/messages-preview';
import { NotificationData } from '../../../../components/notifications/notification-item';

export default function NotificationsPage() {
  const { data: session } = useSession();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to view notifications.</p>
        </div>
      </div>
    );
  }

  const handleNotificationClick = (notification: NotificationData) => {
    // You could also navigate to specific pages based on notification type
    // For example, navigate to project details for task submissions
    console.log('Notification clicked:', notification);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <CommissionerHeader />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notifications Panel - Left/Main Column */}
          <div className="lg:col-span-2">
            <NotificationsPageLayout
              commissionerId={parseInt(session.user.id)}
              onNotificationClick={handleNotificationClick}
            />
          </div>

          {/* Messages Preview - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-0">
                <MessagesPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}