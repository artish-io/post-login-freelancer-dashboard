'use client';

import { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

type Props = {
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  proposalData: any;
};

export default function CommissionerProposalActions({
  onAccept,
  onReject,
  proposalData,
}: Props) {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<'accept' | 'reject' | null>(null);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } catch (err) {
      console.error('Accept failed:', err);
    } finally {
      setAccepting(false);
      setShowConfirmation(null);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject();
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setRejecting(false);
      setShowConfirmation(null);
    }
  };

  if (showConfirmation === 'accept') {
    return (
      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Confirm Acceptance</span>
          </div>
          <p className="text-xs text-green-700 mb-3">
            By accepting this proposal, you agree to the terms and the upfront payment will be processed automatically.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
            >
              {accepting ? 'Processing...' : 'Confirm Accept'}
            </button>
            <button
              onClick={() => setShowConfirmation(null)}
              className="flex-1 border border-gray-300 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation === 'reject') {
    return (
      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Confirm Rejection</span>
          </div>
          <p className="text-xs text-red-700 mb-3">
            Are you sure you want to reject this proposal? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
            >
              {rejecting ? 'Processing...' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => setShowConfirmation(null)}
              className="flex-1 border border-gray-300 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
      {/* Accept Proposal Button */}
      <button
        onClick={() => setShowConfirmation('accept')}
        disabled={accepting || rejecting}
        className="w-full bg-[#eb1966] hover:bg-[#d1175a] text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        <Check size={16} />
        Accept Proposal
      </button>

      {/* Reject Proposal Button */}
      <button
        onClick={() => setShowConfirmation('reject')}
        disabled={accepting || rejecting}
        className="w-full border border-gray-300 text-gray-700 text-sm font-medium px-6 py-3 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <X className="w-4 h-4 stroke-[2.2]" />
        Reject Proposal
      </button>

      {/* Payment Information */}
      {proposalData?.executionMethod === 'completion' && proposalData?.upfrontAmount && (
        <div className="bg-[#FCD5E3] rounded-xl p-3 border border-[#eb1966]/20 mt-2">
          <div className="text-xs text-gray-700">
            <div className="font-medium mb-1">💳 Payment Information</div>
            <div className="text-xs">
              Upfront payment of <span className="font-semibold">${proposalData.upfrontAmount.toLocaleString()}</span> will be processed immediately upon acceptance.
            </div>
          </div>
        </div>
      )}

      {proposalData?.executionMethod === 'milestone' && (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 mt-2">
          <div className="text-xs text-gray-700">
            <div className="font-medium mb-1">📋 Milestone Payment</div>
            <div className="text-xs">
              Payment will be processed per milestone completion and approval.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
