

'use client';

import React from 'react';

type Props = {
  status: 'Available' | 'Pending' | 'Accepted' | 'Rejected';
  estimatedDelivery: string;
  hoursOfWork: string;
  maxRate: string;
  minRate: string;
  onAccept?: () => void;
  onReject?: () => void;
};

export default function GigRequestMetaPanel({
  status,
  estimatedDelivery,
  hoursOfWork,
  maxRate,
  minRate,
  onAccept,
  onReject,
}: Props) {
  const statusDotColor = status === 'Available' ? 'bg-emerald-400' : 'bg-gray-400';

  return (
    <aside className="w-full rounded-2xl border border-gray-300 shadow-sm p-6 flex flex-col gap-6 justify-between">
      <div className="flex flex-col gap-4">
        {/* Status */}
        <div className="flex flex-col gap-2">
          <span className="text-[#eb1966] font-semibold">Status:</span>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
            {status}
          </span>
        </div>

        {/* Estimated Delivery Time */}
        <div className="flex flex-col gap-2">
          <span className="text-[#eb1966] font-semibold">Estimated Delivery Time:</span>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
            {estimatedDelivery}
          </span>
        </div>

        {/* Hours of Work */}
        <div className="flex flex-col gap-2">
          <span className="text-[#eb1966] font-semibold">Hours of Work:</span>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
            {hoursOfWork}
          </span>
        </div>

        {/* Max Rate */}
        <div className="flex flex-col gap-2">
          <span className="text-[#eb1966] font-semibold">Max Rate:</span>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
            ${maxRate}
          </span>
        </div>

        {/* Min Rate */}
        <div className="flex flex-col gap-2">
          <span className="text-[#eb1966] font-semibold">Min Rate:</span>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
            ${minRate}
          </span>
        </div>
      </div>

      {/* Conditionally render Accept/Reject buttons only for Available gigs */}
      {status === 'Available' && (
        <div className="space-y-2 mt-4">
          <button
            onClick={onAccept}
            className="w-full rounded-md bg-green-600 text-white font-semibold py-2 text-sm hover:bg-green-700 transition"
          >
            Accept Offer
          </button>
          <button
            onClick={onReject}
            className="w-full rounded-md bg-red-600 text-white font-semibold py-2 text-sm hover:bg-red-700 transition"
          >
            Reject Offer
          </button>
        </div>
      )}

      {/* Show status message for non-available gigs */}
      {status === 'Accepted' && (
        <div className="w-full rounded-md bg-green-50 border border-green-200 text-green-800 font-medium py-2 text-sm mt-4 text-center">
          ✓ Offer Accepted
        </div>
      )}

      {status === 'Pending' && (
        <div className="w-full rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 font-medium py-2 text-sm mt-4 text-center">
          ⏳ Response Pending
        </div>
      )}

      {status === 'Rejected' && (
        <div className="w-full rounded-md bg-red-50 border border-red-200 text-red-800 font-medium py-2 text-sm mt-4 text-center">
          ✗ Offer Declined
        </div>
      )}
    </aside>
  );
}

