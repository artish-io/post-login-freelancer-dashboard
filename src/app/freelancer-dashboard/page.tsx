'use client';

import FreelancerHeader from '../../../components/freelancer-dashboard/freelancer-header';
import ProjectStatsRow from '../../../components/freelancer-dashboard/project-stats-row';
import EarningsCard from '../../../components/freelancer-dashboard/earnings-card';
import ProjectSummaryTable from '../../../components/freelancer-dashboard/project-summary-table';
import TodayTasksPanel from '../../../components/freelancer-dashboard/today-tasks-panel';
import MessagesPreview from '../../../components/freelancer-dashboard/messages-preview';

export default function FreelancerDashboardPage() {
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Sticky Freelancer Header */}
      <section className="sticky top-[80px] z-40 bg-gray-50 px-4 sm:px-6 py-2">
        <FreelancerHeader />
      </section>

      {/* Responsive Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 px-4 sm:px-6 py-4">
        {/* Left column: Main content */}
        <div className="order-2 lg:order-1 space-y-6">
          {/* Earnings shown first on mobile */}
          <div className="lg:hidden flex justify-center">
            <EarningsCard />
          </div>
          <ProjectStatsRow />
          <ProjectSummaryTable />
          <TodayTasksPanel />

          {/* MessagesPreview only on mobile */}
          <div className="lg:hidden">
            <MessagesPreview />
          </div>
        </div>

        {/* Right column: Sidebar on large screens */}
        <div className="order-1 lg:order-2 hidden lg:flex flex-col gap-6">
          <EarningsCard />
          <MessagesPreview />
        </div>
      </section>
    </div>
  );
}