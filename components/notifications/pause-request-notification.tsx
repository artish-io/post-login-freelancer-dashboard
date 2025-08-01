'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Check, X } from 'lucide-react';
import { NotificationData } from './notification-item';

interface PauseRequestNotificationProps {
  notification: NotificationData;
  onActionComplete?: () => void;
}

export default function PauseRequestNotification({
  notification,
  onActionComplete
}: PauseRequestNotificationProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [processing, setProcessing] = useState<'approve' | 'refuse' | null>(null);
  const [actionTaken, setActionTaken] = useState<'approve' | 'refuse' | null>(notification.actionTaken as 'approve' | 'refuse' | null);

  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  const handleNotificationClick = () => {
    if (notification.context?.projectId) {
      router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking?id=${notification.context.projectId}`);
    }
  };

  const handleApprove = async () => {
    if (!session?.user?.id || !notification.context?.projectId || !notification.context?.freelancerId) {
      alert('Unable to approve pause request. Missing required information.');
      return;
    }

    setProcessing('approve');
    try {
      const response = await fetch('/api/projects/pause/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: notification.context.projectId,
          commissionerId: Number(session.user.id),
          freelancerId: notification.context.freelancerId,
          projectTitle: notification.project?.title || 'Project',
          requestId: notification.context.requestId,
          notificationId: notification.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        setActionTaken('approve');

        // Mark notification as actioned in the database
        await fetch('/api/notifications/mark-actioned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notification.id,
            userId: Number(session.user.id),
            action: 'approve'
          })
        });

        onActionComplete?.();
        // Trigger notification refresh for dropdown
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else if (response.status === 409) {
        // Already responded to - set the action state from the response
        setActionTaken(result.action);
        onActionComplete?.();
      } else {
        throw new Error(result.error || 'Failed to approve pause request');
      }
    } catch (error) {
      console.error('Error approving pause request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRefuse = async () => {
    if (!session?.user?.id || !notification.context?.projectId || !notification.context?.freelancerId) {
      console.error('Unable to refuse pause request: Missing required information');
      return;
    }

    setProcessing('refuse');
    try {
      const response = await fetch('/api/projects/pause/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: notification.context.projectId,
          commissionerId: Number(session.user.id),
          freelancerId: notification.context.freelancerId,
          projectTitle: notification.project?.title || 'Project',
          requestId: notification.context.requestId,
          reason: 'Commissioner declined the pause request',
          notificationId: notification.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        setActionTaken('refuse');

        // Mark notification as actioned in the database
        await fetch('/api/notifications/mark-actioned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notification.id,
            userId: Number(session.user.id),
            action: 'refuse'
          })
        });

        onActionComplete?.();
        // Trigger notification refresh for dropdown
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else if (response.status === 409) {
        // Already responded to - set the action state from the response
        setActionTaken(result.action);
        onActionComplete?.();
      } else {
        throw new Error(result.error || 'Failed to refuse pause request');
      }
    } catch (error) {
      console.error('Error refusing pause request:', error);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div
      onClick={actionTaken ? handleNotificationClick : undefined}
      className={`flex items-start gap-3 p-4 mb-2 rounded-lg border border-gray-100 ${
        !notification.isRead ? 'bg-pink-50' : 'bg-white'
      } ${actionTaken ? 'opacity-60 cursor-pointer hover:opacity-80' : ''}`}
    >
      {/* User Avatar */}
      <div className="flex-shrink-0 w-10">
        {notification.user?.avatar ? (
          <Image
            src={notification.user.avatar}
            alt={notification.user.name}
            width={40}
            height={40}
            className="rounded-full object-cover w-10 h-10"
          />
        ) : (
          <Image
            src="/icons/project-pause.png"
            alt="pause request"
            width={24}
            height={24}
          />
        )}
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900 font-medium">
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
            {notification.metadata?.remainingTasks && (
              <p className="text-xs text-gray-500 mt-1">
                This project has {notification.metadata.remainingTasks} milestone-task{notification.metadata.remainingTasks !== 1 ? 's' : ''} left.
              </p>
            )}
            {notification.project && (
              <p className="text-xs text-gray-500 mt-1">
                Project: {notification.project.title}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 ml-4">
            <p className="text-xs text-gray-500">
              {timeAgo}
            </p>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-[#eb1966] rounded-full mt-1 ml-auto"></div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show if no action has been taken */}
        {!actionTaken && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApprove}
              disabled={processing !== null}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              {processing === 'approve' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Approving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Approve Pause
                </>
              )}
            </button>
            <button
              onClick={handleRefuse}
              disabled={processing !== null}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              {processing === 'refuse' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Refusing...
                </>
              ) : (
                <>
                  <X size={16} />
                  Refuse Pause
                </>
              )}
            </button>
          </div>
        )}

        {actionTaken && (
          <div className="mt-3">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              actionTaken === 'approve'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {actionTaken === 'approve' ? '✓ Pause Approved' : '✗ Pause Refused'}
            </span>
            <p className="text-xs text-gray-500 mt-1">Click to view project</p>
          </div>
        )}
      </div>
    </div>
  );
}
