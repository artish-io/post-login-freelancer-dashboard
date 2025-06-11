'use client';

import React, { useEffect, useState } from 'react';

type ProgressRingProps = {
  value: number;
  status: 'Delayed' | 'At risk' | 'Completed';
};

const ProgressRing: React.FC<ProgressRingProps> = ({ value, status }) => {
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);

  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedValue(clamped), 100);
    return () => clearTimeout(timeout);
  }, [clamped]);

  const offset = clamped === 100 ? 0 : circumference - (animatedValue / 100) * circumference;

  const statusColor = {
    'Delayed': 'stroke-red-500',
    'At risk': 'stroke-yellow-500',
    'Completed': 'stroke-green-600',
  }[status];

  return (
    <div className="relative w-8 h-8">
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 36 36"
      >
        {/* Background */}
        <circle
          className="text-gray-200"
          stroke="currentColor"
          fill="none"
          strokeWidth="4"
          cx="18"
          cy="18"
          r={radius}
        />
        {/* Progress */}
        <circle
          className={`${statusColor} transition-all duration-700 ease-out`}
          stroke="currentColor"
          fill="none"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          cx="18"
          cy="18"
          r={radius}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-gray-800">
        {animatedValue}%
      </div>
    </div>
  );
};

export default ProgressRing;