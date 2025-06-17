'use client';

import FreelancerHeader from '../../../../components/freelancer-dashboard/freelancer-header';
import ProjectStatsRow from '../../../../components/freelancer-dashboard/project-stats-row';
import TodayTasksPanel from '../../../../components/freelancer-dashboard/today-tasks-panel';
import ProjectSummaryTable from '../../../../components/freelancer-dashboard/project-summary-table';
import FreelancerRatingCard from '../../../../components/freelancer-dashboard/projects-and-invoices/freelancer-rating-card';
import ProposalInvoiceButtons from '../../../../components/freelancer-dashboard/projects-and-invoices/proposal-invoice-buttons';
import InvoiceHistoryList from '../../../../components/freelancer-dashboard/projects-and-invoices/invoice-history-list';

export default function ProjectsAndInvoicesPage() {
  return (
    <section className="flex flex-col gap-3 p-4 md:p-6">
      {/* User Info Header */}
      <FreelancerHeader />

      {/* Stats + Rating Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
        <ProjectStatsRow />
        <div className="w-full max-w-sm">
          <FreelancerRatingCard />
        </div>
      </div>

      {/* Tasks + Invoice Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          <TodayTasksPanel />
          <ProjectSummaryTable />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <ProposalInvoiceButtons />
          <InvoiceHistoryList />
        </div>
      </div>
    </section>
  );
}