'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ProjectPageHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-details/project-page-header';
import ProjectMetaLinks from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-details/project-meta-links';
import ProjectTimeline from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-details/project-timeline';
import ProjectActionButtons from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-details/project-action-buttons';
import ProjectNotesExpansion from '../../../../../components/freelancer-dashboard/project-notes-expansion';

export default function ProjectTrackingPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || '0';

  const [projectDetails, setProjectDetails] = useState<{
    title: string;
    summary: string;
    logoUrl: string;
    tags: string[];
    status: string;
  } | null>(null);

  const [trackingSummary, setTrackingSummary] = useState<{
    projectId: string;
    invoicingMethod: 'completion' | 'milestone';
    totalTasks: number;
    approvedTasks: number;
    pendingTasks: number;
    eligibleForManualInvoiceTaskIds: number[];
    eligibleForManualInvoiceCount: number;
    invoicesLeft: number;
    remainingBudget: number;
    isReadyForFinalPayout: boolean;
  } | null>(null);

  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  const [showNotesModal, setShowNotesModal] = useState(false);

  const handleShowNotes = () => setShowNotesModal(true);
  const handleCloseNotes = () => setShowNotesModal(false);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        console.log(`[TRACKING_UI] projectId=${projectId}, detailsLoaded=false, summary={}`);

        // Fetch project details (header/meta only)
        const detailsRes = await fetch(`/api/dashboard/project-details?projectId=${projectId}`);
        const detailsJson = await detailsRes.json();

        if (detailsRes.ok) {
          setProjectDetails({
            title: detailsJson.title,
            summary: detailsJson.summary,
            logoUrl: detailsJson.logoUrl,
            tags: detailsJson.typeTags || [],
            status: detailsJson.status || 'Ongoing',
          });
          setDetailsLoaded(true);
        }

        // Fetch tracking summary (progress data)
        const summaryRes = await fetch(`/api/projects/${projectId}/tracking-summary`);
        const summaryJson = await summaryRes.json();

        if (summaryRes.ok) {
          setTrackingSummary(summaryJson);
          setSummaryLoaded(true);

          console.log(`[TRACKING_UI] projectId=${projectId}, detailsLoaded=true, summary={approvedTasks:${summaryJson.approvedTasks},totalTasks:${summaryJson.totalTasks},invoicesLeft:${summaryJson.invoicesLeft},eligibleForManualInvoiceCount:${summaryJson.eligibleForManualInvoiceCount}}`);
        } else {
          console.error('Failed to fetch tracking summary:', summaryJson);
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
      }
    }

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  if (!projectDetails || !trackingSummary) return <div>Loading...</div>;

  const { title, summary, logoUrl, tags, status } = projectDetails;

  return (
    <main className="flex flex-col min-h-screen w-full max-w-6xl mx-auto bg-white">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white px-4 md:px-12 pt-4 pb-6">
        <div className="flex flex-col gap-6">
          <ProjectPageHeader projectId={projectId} title={title} summary={summary} logoUrl={logoUrl} tags={tags} />
          <ProjectMetaLinks projectId={projectId} />

          {/* Tracking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{trackingSummary.approvedTasks}/{trackingSummary.totalTasks}</div>
                <div className="text-sm text-gray-600">Tasks Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{trackingSummary.invoicesLeft}</div>
                <div className="text-sm text-gray-600">Invoices Left</div>
              </div>
              {trackingSummary.invoicingMethod === 'completion' && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{trackingSummary.eligibleForManualInvoiceCount}</div>
                    <div className="text-sm text-gray-600">Eligible for Invoice</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">${trackingSummary.remainingBudget.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Remaining Budget</div>
                  </div>
                </>
              )}
              {trackingSummary.invoicingMethod === 'milestone' && (
                <div className="text-center col-span-2">
                  <div className="text-lg font-medium text-gray-700">Milestone Project</div>
                  <div className="text-sm text-gray-600">Traditional milestone-based invoicing</div>
                </div>
              )}
            </div>

            {trackingSummary.invoicingMethod === 'completion' && trackingSummary.isReadyForFinalPayout && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                <div className="text-green-800 font-medium">🎉 Ready for Final Payout</div>
                <div className="text-green-700 text-sm">All tasks approved and invoiced. Project ready for completion.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-12 pb-8 bg-white">
        {/* Timeline Section - Full width on mobile, flex-1 on desktop */}
        <div className="flex-1 order-1 lg:order-1">
          <ProjectTimeline projectId={projectId} title={title} logoUrl={logoUrl} onNotesClick={handleShowNotes} />
        </div>

        {/* Action Buttons - Below timeline on mobile, sidebar on desktop */}
        <div className="w-full lg:w-[280px] shrink-0 order-2 lg:order-2">
          <div className="lg:sticky lg:top-[200px] flex justify-center lg:justify-start">
            <ProjectActionButtons projectId={projectId} onNotesClick={handleShowNotes} projectStatus={status} />
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <ProjectNotesExpansion projectId={projectId} onClose={handleCloseNotes} />
      )}
    </main>
  );
}