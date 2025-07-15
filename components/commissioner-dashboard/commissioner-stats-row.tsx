'use client';

import CommissionerStatsCard from './commissioner-stats-card';

interface CommissionerStatsRowProps {
  activeProjects: number;
  totalProjects: number;
  tasksAwaitingReview: number;
  monthlyChange: {
    value: string;
    direction: 'up' | 'down';
    percentage: number;
  };
}

export default function CommissionerStatsRow({
  activeProjects,
  totalProjects,
  tasksAwaitingReview,
  monthlyChange
}: CommissionerStatsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CommissionerStatsCard
        title="Active Projects"
        value={activeProjects}
        changeValue={monthlyChange.value}
        changeDirection={monthlyChange.direction}
        bgColor="bg-[#FCD5E3]"
      />

      <CommissionerStatsCard
        title="Project Tasks Awaiting Review"
        value={tasksAwaitingReview}
        bgColor="bg-[#FCD5E3]"
      />
    </div>
  );
}
