'use client';

import React from 'react';
import CurrencyDisplay from '../ui/currency-display';

export type ProjectStatsCardProps = {
  label: string;
  value: number;
  bgColor?: string;
  icon?: React.ReactNode;
  className?: string;
  overdueCount?: number;
};

const ProjectStatsCard: React.FC<ProjectStatsCardProps> = ({
  label,
  value,
  bgColor = '#FCD5E3',
  icon,
  className = '',
  overdueCount,
}) => {
  return (
    <div
      className={`rounded-3xl shadow-lg border border-white/20 backdrop-blur-sm p-6 w-full flex flex-col justify-between items-center text-center transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${className}`}
      style={{
        backgroundColor: bgColor,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="w-full flex justify-center">
        <span className="text-base font-semibold text-black bg-white/30 backdrop-blur-sm border border-white/40 px-4 py-2 rounded-xl shadow-sm">
          {label}
        </span>
      </div>

      {/* Fixed height container to keep numbers aligned */}
      <div className="flex flex-col items-center mt-4 min-h-[80px] justify-center">
        <div
          className="text-[56px] leading-none font-semibold text-black font-bodoni-moda"
          style={{ fontFamily: "'Bodoni Moda SC', serif", fontWeight: 600 }}
        >
          {value}
        </div>
        {/* Reserve space for overdue notice to prevent layout shift */}
        <div className="h-[16px] flex items-center">
          {overdueCount !== undefined && overdueCount > 0 && (
            <div className="text-[12px] text-red-600 font-medium opacity-90">
              {overdueCount} Deadlines Overdue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectStatsCard;