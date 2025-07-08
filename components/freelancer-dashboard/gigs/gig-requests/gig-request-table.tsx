

'use client';

import React from 'react';
import Image from 'next/image';

type GigRequest = {
  id: number;
  organizationLogo: string;
  organizationName: string;
  organizationVerified: boolean;
  commissionerName: string;
  skill: string;
  rate: string;
  onClick?: () => void;
};

type Props = {
  data?: GigRequest[];
};

export default function GigRequestTable({ data = [] }: Props) {
  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
      <div className="grid grid-cols-4 gap-4 px-2 py-3 border-b border-gray-200 font-medium text-sm text-gray-700">
        <div>Company</div>
        <div>Project Commissioner</div>
        <div>Required Skill</div>
        <div>Rate</div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Gig Requests</h3>
          <p className="text-gray-500">When you receive gig requests, they will appear here.</p>
        </div>
      ) : (
        data.map((gig) => (
        <div
          key={gig.id}
          onClick={gig.onClick}
          className="grid grid-cols-4 gap-4 px-2 py-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Image
              src={gig.organizationLogo}
              alt={gig.organizationName}
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium" style={{ color: '#eb1966' }}>{gig.organizationName}</span>
            </div>
          </div>
          <div className="text-sm text-gray-800">{gig.commissionerName}</div>
          <div className="text-sm text-gray-800">{gig.skill}</div>
          <div className="text-sm text-gray-800">{gig.rate}</div>
        </div>
        ))
      )}
    </div>
  );
}