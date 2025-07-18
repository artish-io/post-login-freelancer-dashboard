'use client';

import React from 'react';

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
      className={`rounded-2xl shadow-sm p-6 w-full max-w-[280px] flex flex-col justify-between items-center text-center ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full flex justify-center">
        <span className="text-base font-semibold text-black border border-black px-4 py-2 rounded-xl">
          {label}
        </span>
      </div>

      {/* Fixed height container to keep numbers aligned */}
      <div className="flex flex-col items-center mt-4 min-h-[80px] justify-center">
        <div className="text-[56px] leading-none font-bold text-black">{value}</div>
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