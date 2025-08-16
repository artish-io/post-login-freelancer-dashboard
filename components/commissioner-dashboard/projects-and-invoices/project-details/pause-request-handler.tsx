'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Check, X } from 'lucide-react';

interface PauseRequestHandlerProps {
  projectId: string | number;
  projectTitle: string;
  projectStatus: string;
  onRequestHandled?: () => void;
}

interface PauseRequest {
  id: string;
  freelancerId: number;
  freelancerName: string;
  reason: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'refused';
}

export default function PauseRequestHandler({
  projectId,
  projectTitle,
  projectStatus,
  onRequestHandled
}: PauseRequestHandlerProps) {
  const { data: session } = useSession();
  const [pauseRequest, setPauseRequest] = useState<PauseRequest | null>(null);
  const [processing, setProcessing] = useState<'approve' | 'refuse' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPauseRequest();
  }, [projectId]);

  const fetchPauseRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/pause/status?projectId=${projectId}`);
      const data = await response.json();
      
      if (response.ok && data.pauseRequest) {
        setPauseRequest(data.pauseRequest);
      } else {
        setPauseRequest(null);
      }
    } catch (error) {
      console.error('Error fetching pause request:', error);
      setPauseRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!session?.user?.id || !pauseRequest || pauseRequest.status !== 'pending') return;

    setProcessing('approve');
    try {
      const response = await fetch('/api/projects/pause/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          commissionerId: Number(session.user.id),
          freelancerId: pauseRequest.freelancerId,
          projectTitle,
          requestId: pauseRequest.id,
          notificationId: pauseRequest.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the pause request status from the server
        await fetchPauseRequest();
        onRequestHandled?.();
        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else if (response.status === 409) {
        // Already responded to - refresh status from server
        await fetchPauseRequest();
        onRequestHandled?.();
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
    if (!session?.user?.id || !pauseRequest || pauseRequest.status !== 'pending') return;

    setProcessing('refuse');
    try {
      const response = await fetch('/api/projects/pause/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          commissionerId: Number(session.user.id),
          freelancerId: pauseRequest.freelancerId,
          projectTitle,
          requestId: pauseRequest.id,
          reason: 'Commissioner declined the pause request',
          notificationId: pauseRequest.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the pause request status from the server
        await fetchPauseRequest();
        onRequestHandled?.();
        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else if (response.status === 409) {
        // Already responded to - refresh status from server
        await fetchPauseRequest();
        onRequestHandled?.();
      } else {
        throw new Error(result.error || 'Failed to refuse pause request');
      }
    } catch (error) {
      console.error('Error refusing pause request:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-yellow-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-yellow-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!pauseRequest) {
    return null;
  }

  // Check if project is already paused - if so, don't show pause request UI
  const isProjectPaused = projectStatus?.toLowerCase() === 'paused';

  // If project is already paused and there's a pause request, show appropriate message
  if (isProjectPaused && pauseRequest.status === 'pending') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">ℹ</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Project Already Paused
            </h3>
            <p className="text-sm text-blue-700">
              This project is already paused. The pause request from {pauseRequest.freelancerName} is no longer actionable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show static message for approved/refused requests
  if (pauseRequest.status === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800 mb-1">
              Pause Approved
            </h3>
            <p className="text-sm text-green-700">
              You approved the pause request from {pauseRequest.freelancerName}. The project has been paused.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pauseRequest.status === 'refused') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Pause Refused
            </h3>
            <p className="text-sm text-red-700">
              You refused the pause request from {pauseRequest.freelancerName}. The project continues as normal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show action buttons for pending requests only if project is active
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <span className="text-yellow-600 text-sm font-medium">!</span>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">
            Pause Request from {pauseRequest.freelancerName}
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            {pauseRequest.reason}
          </p>

          {/* Only show action buttons if project is active (not already paused) */}
          {!isProjectPaused && (
            <div className="flex gap-2">
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

          {/* Show message if project is already paused */}
          {isProjectPaused && (
            <div className="text-sm text-yellow-700 italic">
              This project is already paused. No action needed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
