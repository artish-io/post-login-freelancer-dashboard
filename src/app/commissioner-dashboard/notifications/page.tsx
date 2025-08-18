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

    // Use the link from the notification if available for any type
    if (notification.link && notification.link !== '#') {
      try {
        router.push(notification.link);
        return;
      } catch (error) {
        console.error('Error navigating with notification link:', error);
        // Continue to fallback navigation
      }
    }

    // Handle milestone payment notifications separately - they go to payments page
    if (type === 'milestone_payment_sent') {
      router.push('/commissioner-dashboard/payments');
      return;
    }

    // Handle invoice notifications with universal routing
    if (type === 'invoice_sent' || type === 'invoice_reminder' || type === 'invoice_overdue_reminder' ||
        type === 'invoice_paid') {
      // Try multiple sources for invoice number with proper fallback
      const invoiceNumber =
        notification.invoice?.number ||
        context?.invoiceNumber ||
        context?.invoiceId ||
        notification.metadata?.invoiceNumber ||
        notification.metadata?.invoiceId;

      if (invoiceNumber) {
        try {
          // Use the universal invoice preview route
          router.push(`/commissioner-dashboard/projects-and-invoices/invoices/invoice/${invoiceNumber}`);
          return;
        } catch (error) {
          console.error('Error navigating to invoice:', error);
          // Fallback to invoices page
          router.push('/commissioner-dashboard/projects-and-invoices/invoices');
          return;
        }
      } else {
        // No invoice number found, go to invoices page
        router.push('/commissioner-dashboard/projects-and-invoices/invoices');
        return;
      }
    }

    switch (type) {

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

      case 'project_pause':
      case 'project_pause_requested':
      case 'project_pause_reminder':
      case 'project_activated':
      case 'project_reactivated':
        // Navigate to project tracking page for pause requests and project activation
        if (context?.projectId) {
          router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking/${context.projectId}`);
        } else {
          router.push('/commissioner-dashboard/projects-and-invoices');
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