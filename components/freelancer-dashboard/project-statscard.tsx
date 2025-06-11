'use client';

import React from 'react';

export type ProjectStatsCardProps = {
  label: string;
  value: number;
  bgColor?: string;
  icon?: React.ReactNode;
  className?: string;
};

const ProjectStatsCard: React.FC<ProjectStatsCardProps> = ({
  label,
  value,
  bgColor = '#FCD5E3',
  icon,
  className = '',
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
      <div className="text-[56px] leading-none font-bold text-black mt-4">{value}</div>
    </div>
  );
};

export default ProjectStatsCard;