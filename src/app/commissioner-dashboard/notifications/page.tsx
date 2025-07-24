'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import NotificationsPageLayout from '../../../../components/notifications/notifications-page-layout';
import MessagesPreview from '../../../../components/freelancer-dashboard/messages-preview';
import { NotificationData } from '../../../../components/notifications/notification-item';

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();

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
    const { type, context } = notification;

    switch (type) {
      case 'invoice_sent':
        // Navigate to pay invoice page with specific invoice
        if (context?.invoiceId) {
          router.push(`/commissioner-dashboard/projects-and-invoices/invoices/pay-invoice?invoice=${context.invoiceId}`);
        } else {
          router.push('/commissioner-dashboard/projects-and-invoices/invoices');
        }
        break;

      case 'gig_application':
        // Navigate to job listings with candidate details
        if (context?.gigId && context?.applicationId) {
          router.push(`/commissioner-dashboard/job-listings?gigId=${context.gigId}&applicationId=${context.applicationId}`);
        } else if (context?.gigId) {
          // Multiple applications - just go to job listings
          router.push(`/commissioner-dashboard/job-listings?gigId=${context.gigId}`);
        } else {
          router.push('/commissioner-dashboard/job-listings');
        }
        break;

      case 'task_submission':
        // Navigate to tasks to review with specific task
        if (context?.projectId && context?.taskId) {
          router.push(`/commissioner-dashboard/projects-and-invoices/tasks-to-review?projectId=${context.projectId}&taskId=${context.taskId}`);
        } else {
          router.push('/commissioner-dashboard/projects-and-invoices/tasks-to-review');
        }
        break;

      case 'storefront_purchase':
        // Navigate to storefront product inventory
        if (context?.productId) {
          router.push(`/commissioner-dashboard/storefront/product-inventory?productId=${context.productId}`);
        } else {
          router.push('/commissioner-dashboard/storefront/product-inventory');
        }
        break;

      default:
        console.log('Unhandled notification type:', type);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-2">
        <CommissionerHeader />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notifications Panel - Left/Main Column */}
          <div className="lg:col-span-2">
            <NotificationsPageLayout
              commissionerId={parseInt(session.user.id)}
              onNotificationClick={handleNotificationClick}
            />
          </div>

          {/* Messages Preview - Right Column - Completely hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
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