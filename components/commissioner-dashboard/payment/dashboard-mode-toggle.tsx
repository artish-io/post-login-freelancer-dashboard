'use client';

import { useState } from 'react';
import clsx from 'clsx';

type DashboardMode = 'spending' | 'revenue';

type Props = {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  hasStorefront?: boolean;
};

export default function DashboardModeToggle({ mode, onModeChange, hasStorefront = true }: Props) {
  if (!hasStorefront) {
    // If no storefront, don't show toggle - just spending mode
    return null;
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => onModeChange('spending')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          mode === 'spending'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Spending
      </button>
      <button
        onClick={() => onModeChange('revenue')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          mode === 'revenue'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Revenue
      </button>
    </div>
  );
}
