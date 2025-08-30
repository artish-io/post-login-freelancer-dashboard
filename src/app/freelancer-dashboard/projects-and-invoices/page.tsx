'use client';

import { useSession } from 'next-auth/react';
import FreelancerHeader from '../../../../components/freelancer-dashboard/freelancer-header';
import ProjectStatsRow from '../../../../components/freelancer-dashboard/project-stats-row';
import TasksPanel from '../../../../components/shared/tasks-panel';
import ProjectSummaryTable from '../../../../components/shared/project-summary-table';
import FreelancerRatingCard from '../../../../components/freelancer-dashboard/projects-and-invoices/freelancer-rating-card';
import ProposalInvoiceButtons from '../../../../components/freelancer-dashboard/projects-and-invoices/proposal-invoice-buttons';
import InvoiceHistoryList from '../../../../components/freelancer-dashboard/projects-and-invoices/invoice-history-list';

export default function ProjectsAndInvoicesPage() {
  const { data: session } = useSession();

  const freelancerId = session?.user?.id ? Number(session.user.id) : undefined;

  return (
    <section className="flex flex-col gap-3 p-4 md:p-6">
      {/* User Info Header */}
      <FreelancerHeader />

      {/* Stats + Rating Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
        <ProjectStatsRow />
        <div className="w-full max-w-sm flex flex-col gap-3">
          <FreelancerRatingCard
            freelancerId={freelancerId}
          />
          {/* Proposals Button */}
          <a
            href="/freelancer-dashboard/projects-and-invoices/proposals"
            className="w-full flex items-center justify-center gap-2 bg-white/80 text-gray-700 px-6 py-3 rounded-2xl text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:shadow-lg transition duration-200 backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Proposal Dashboard
          </a>
        </div>
      </div>

      {/* Tasks + Invoice Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          <TasksPanel viewType="freelancer" title="Today's Tasks" showNotesTab={true} />
          <ProjectSummaryTable viewType="freelancer" />
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