'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const gigStatusOptions = [
  { label: 'All Gigs Requests', value: 'all', color: 'bg-pink-600' },
  { label: 'Accepted Gigs', value: 'accepted', color: 'bg-emerald-400' },
  { label: 'Pending Offers', value: 'pending', color: 'bg-yellow-400' },
  { label: 'Rejected Offers', value: 'rejected', color: 'bg-red-600' },
];

export default function GigRequestsSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);

  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  const handleClick = (status: string) => {
    setSelectedStatus(status);
    const query = new URLSearchParams(searchParams.toString());
    query.set('status', status);
    router.push(`/freelancer-dashboard/gig-requests?${query.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 bg-white">
      {gigStatusOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className={clsx(
            'flex items-center justify-between rounded-full px-4 py-3 transition-all text-left shadow-sm',
            selectedStatus === option.value
              ? 'bg-pink-100'
              : 'bg-gray-50 hover:bg-gray-100'
          )}
        >
          <div className="flex items-center gap-3">
            <span className={clsx('w-4 h-4 rounded-full', option.color)} />
            <span className="text-sm font-medium text-gray-900">{option.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      ))}
      <Link
        href="/freelancer-dashboard/projects-and-invoices/create-proposal"
        className="flex items-center gap-2 text-sm font-medium text-pink-500 hover:text-pink-600 transition-all mt-2"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FCD5E3' }}>
          <Plus className="w-3 h-3" />
        </div>
        Create New Proposal
      </Link>
    </div>
  );
}