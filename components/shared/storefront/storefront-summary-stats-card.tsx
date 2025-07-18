'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';

export type StorefrontSummaryStatsCardProps = {
  label: string;
  value: number | string;
  change?: number; // e.g. 1.78
  changeDirection?: 'up' | 'down';
  className?: string;
  bgColor?: string;
};

export default function StorefrontSummaryStatsCard({
  label,
  value,
  change,
  changeDirection,
  className = '',
  bgColor = '#FEE7F0',
}: StorefrontSummaryStatsCardProps) {
  const isPositive = changeDirection === 'up';

  return (
    <div
      className={clsx(
        'rounded-2xl px-8 py-8 w-full h-full min-w-[320px] max-w-[400px] flex flex-col justify-between',
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-sm font-medium text-black mb-2">{label}</span>
      <div className="flex justify-between items-center">
        <span className="text-[40px] font-bold text-black leading-none">{value}</span>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-sm font-medium text-black opacity-75">
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}
              {change.toFixed(2)}%
            </span>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}