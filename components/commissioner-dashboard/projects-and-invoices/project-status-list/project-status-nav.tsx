'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const statusOptions = [
  { label: 'Ongoing Projects', value: 'ongoing', color: 'bg-pink-500' },
  { label: 'Paused Projects', value: 'paused', color: 'bg-yellow-400' },
  { label: 'Completed Projects', value: 'completed', color: 'bg-emerald-400' },
];

export default function CommissionerProjectStatusNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ongoing';
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);

  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  const handleClick = (status: string) => {
    setSelectedStatus(status);
    const query = new URLSearchParams(searchParams.toString());
    query.set('status', status);
    router.push(`/commissioner-dashboard/projects-and-invoices/project-list?${query.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {statusOptions.map((option) => (
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
    </div>
  );
}