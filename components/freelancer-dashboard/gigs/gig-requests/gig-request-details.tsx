'use client';

import React, { useState } from 'react';
import GigRequestHeader from './gig-request-header';
import GigRequestBody from './gig-request-body';
import GigRequestMetaPanel from './gig-request-meta-panel';
import { useSuccessToast, useErrorToast } from '@/components/ui/toast';

type GigRequest = {
  id: number;
  skills: string[];
  tools: string[];
  title: string;
  subtitle: string;
  organizationLogo?: string;
  createdAt: string;
  description: string;
  toolIconUrl: string;
  briefUrl: string;
  notes: string;
  postedByName: string;
  postedByAvatar: string;
  status: 'Available' | 'Pending' | 'Accepted' | 'Rejected';
  estimatedDelivery: string;
  hoursOfWork: string;
  maxRate: string;
  minRate: string;
  projectId?: number;
};

type Props = {
  request: GigRequest;
};

const GigRequestDetails: React.FC<Props> = ({ request }) => {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const handleAcceptOffer = () => {
    // Prevent opening modal for already accepted requests
    if (request.status === 'Accepted') {
      showErrorToast('Error', 'This offer has already been accepted.');
      return;
    }
    setShowAcceptModal(true);
  };

  const handleRejectOffer = () => {
    setShowRejectModal(true);
  };

  const confirmAccept = async () => {
    // Prevent accepting already accepted requests
    if (request.status === 'Accepted') {
      showErrorToast('Error', 'This offer has already been accepted.');
      setShowAcceptModal(false);
      return;
    }

    setSubmitting(true);
    try {
      // API call to accept the gig request
      const res = await fetch(`/api/gig-requests/${request.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showSuccessToast('Offer Accepted', `Offer accepted successfully! Project #${result.projectId} has been created.`);
        setShowAcceptModal(false);

        // Trigger a page refresh to update the UI state
        window.location.reload();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      showErrorToast('Acceptance Failed', error instanceof Error ? error.message : 'Failed to accept offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReject = async () => {
    setSubmitting(true);
    try {
      // API call to reject the gig request
      const res = await fetch(`/api/gig-requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          reason: rejectReason.trim() || 'No reason provided'
        }),
      });

      if (res.ok) {
        alert('Offer rejected.');
        setShowRejectModal(false);
        setRejectReason('');
        // Optionally refresh the page or update the request status
        window.location.reload();
      } else {
        throw new Error('Failed to reject offer');
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="flex gap-x-8">
      <div className="w-2/3">
        <GigRequestHeader
          skills={request.skills}
          title={request.title}
          subtitle={request.subtitle}
          organizationLogo={request.organizationLogo}
          createdAt={request.createdAt}
          status={request.status}
          projectId={request.projectId}
        />
        <GigRequestBody
          description={request.description}
          skills={request.skills}
          tools={request.tools}
          toolIconUrl={request.toolIconUrl}
          briefUrl={request.briefUrl}
          notes={request.notes}
          createdAt={request.createdAt}
          postedByName={request.postedByName}
          postedByAvatar={request.postedByAvatar}
        />
      </div>
      <div className="w-1/3">
        <GigRequestMetaPanel
          status={request.status}
          estimatedDelivery={request.estimatedDelivery}
          hoursOfWork={request.hoursOfWork}
          maxRate={request.maxRate}
          minRate={request.minRate}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
        />
      </div>
    </div>

    {/* Accept Confirmation Modal */}
    {showAcceptModal && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-4">
          <h3 className="text-base font-semibold mb-3">Accept Offer</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Are you sure you want to accept this gig offer for "{request.title}"?
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmAccept}
              disabled={submitting}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
                submitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? 'Accepting...' : 'Yes, Accept Offer'}
            </button>
            <button
              onClick={() => setShowAcceptModal(false)}
              disabled={submitting}
              className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Reject Confirmation Modal */}
    {showRejectModal && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-4">
          <h3 className="text-base font-semibold mb-3">Reject Offer</h3>
          <p className="text-gray-600 mb-3 text-sm">
            Are you sure you want to reject this gig offer for "{request.title}"?
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason for rejection (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Let the commissioner know why you're declining..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={confirmReject}
              disabled={submitting}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
                submitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {submitting ? 'Rejecting...' : 'Yes, Reject Offer'}
            </button>
            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
              disabled={submitting}
              className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default GigRequestDetails;
