'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FreelancerHeader from '../../../../components/freelancer-dashboard/freelancer-header';
import NotificationsPageLayout from '../../../../components/notifications/notifications-page-layout';
import MessagesPreview from '../../../../components/freelancer-dashboard/messages-preview';
import { NotificationData } from '../../../../components/notifications/notification-item';

export default function FreelancerNotificationsPage() {
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
    // Use the link from the notification if available
    if (notification.link && notification.link !== '#') {
      router.push(notification.link);
      return;
    }

    // Fallback navigation based on notification type
    const { type, context } = notification;

    switch (type) {
      case 'invoice_paid':
      case 'milestone_payment_received':
        // Navigate to invoices page
        if (context?.invoiceNumber || context?.invoiceId || notification.metadata?.invoiceNumber) {
          const invoiceNumber = context?.invoiceNumber || context?.invoiceId || notification.metadata?.invoiceNumber;
          router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`);
        } else {
          router.push('/freelancer-dashboard/projects-and-invoices/invoices');
        }
        break;

      case 'task_approved':
      case 'task_rejected':
      case 'task_rejected_with_comment':
        // Navigate to project tracking page
        if (context?.projectId) {
          router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking?id=${context.projectId}`);
        } else {
          router.push('/freelancer-dashboard/projects-and-invoices');
        }
        break;

      case 'gig_request':
        // Navigate to gig requests page
        if (context?.requestId) {
          router.push(`/freelancer-dashboard/gig-requests?requestId=${context.requestId}&open=true`);
        } else {
          router.push('/freelancer-dashboard/gig-requests');
        }
        break;

      case 'storefront_purchase':
        // Navigate to product inventory
        if (context?.productId) {
          router.push(`/freelancer-dashboard/storefront/product-inventory?productId=${context.productId}`);
        } else {
          router.push('/freelancer-dashboard/storefront/product-inventory');
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
        <FreelancerHeader />
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