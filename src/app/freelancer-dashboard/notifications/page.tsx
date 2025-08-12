'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FreelancerHeader from '../../../../components/freelancer-dashboard/freelancer-header';
import NotificationsPageLayout from '../../../../components/notifications/notifications-page-layout';
import MessagesPreview from '../../../../components/freelancer-dashboard/messages-preview';
import { NotificationData } from '../../../../components/notifications/notification-item';
import RatingModal from '../../../../components/common/rating/rating-modal';

export default function FreelancerNotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    projectId: number;
    projectTitle: string;
    subjectUserId: number;
    subjectUserType: 'freelancer' | 'commissioner';
    subjectName: string;
  } | null>(null);

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

    // Handle invoice notifications with special care
    if (type === 'invoice_paid' || type === 'milestone_payment_received') {
      // Try multiple sources for invoice number
      const invoiceNumber =
        context?.invoiceNumber ||
        context?.invoiceId ||
        notification.metadata?.invoiceNumber ||
        notification.metadata?.invoiceId;

      if (invoiceNumber) {
        try {
          router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`);
          return;
        } catch (error) {
          console.error('Error navigating to invoice:', error);
          // Fallback to invoices page
          router.push('/freelancer-dashboard/projects-and-invoices/invoices');
          return;
        }
      } else {
        // No invoice number found, go to invoices page
        router.push('/freelancer-dashboard/projects-and-invoices/invoices');
        return;
      }
    }

    // Use the link from the notification if available for other types
    if (notification.link && notification.link !== '#') {
      try {
        router.push(notification.link);
        return;
      } catch (error) {
        console.error('Error navigating with notification link:', error);
        // Continue to fallback navigation
      }
    }

    // Fallback navigation based on notification type
    switch (type) {

      case 'task_approved':
      case 'task_rejected':
      case 'task_rejected_with_comment':
        // Navigate to project tracking page
        if (context?.projectId) {
          router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`);
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

      case 'project_pause_accepted':
      case 'project_pause_refused':
      case 'project_paused':
      case 'project_activated':
      case 'project_reactivated':
        // Navigate to project tracking page for pause responses and project activation
        if (context?.projectId) {
          router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`);
        } else {
          router.push('/freelancer-dashboard/projects-and-invoices');
        }
        break;

      case 'project_complete_rating':
        // Open rating modal for project completion
        if (notification.metadata?.canRate && context?.projectId) {
          setRatingModal({
            isOpen: true,
            projectId: context.projectId,
            projectTitle: notification.metadata.projectTitle || 'Unknown Project',
            subjectUserId: notification.metadata.subjectUserId,
            subjectUserType: notification.metadata.subjectUserType,
            subjectName: notification.metadata.subjectName || 'Unknown User'
          });
        } else {
          // Fallback to project tracking page
          if (context?.projectId) {
            router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${context.projectId}`);
          } else {
            router.push('/freelancer-dashboard/projects-and-invoices');
          }
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

      {/* Rating Modal */}
      {ratingModal && (
        <RatingModal
          isOpen={ratingModal.isOpen}
          onClose={() => setRatingModal(null)}
          projectId={ratingModal.projectId}
          projectTitle={ratingModal.projectTitle}
          subjectUserId={ratingModal.subjectUserId}
          subjectUserType={ratingModal.subjectUserType}
          subjectName={ratingModal.subjectName}
          onRatingSubmitted={() => {
            setRatingModal(null);
            // Optionally refresh notifications or show success message
          }}
        />
      )}
    </div>
  );
}