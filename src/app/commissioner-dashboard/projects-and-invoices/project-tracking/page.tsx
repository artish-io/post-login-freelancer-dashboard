'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import CommissionerProjectPageHeader from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-page-header';
import CommissionerProjectMetaLinks from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-meta-links';
import CommissionerProjectTimeline from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-timeline';
import CommissionerProjectActionButtons from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-action-buttons';
import PauseRequestHandler from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/pause-request-handler';
import ProjectNotesExpansion from '../../../../../components/freelancer-dashboard/project-notes-expansion';

export default function CommissionerProjectTrackingPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id') || '0';

  const [projectDetails, setProjectDetails] = useState<{
    title: string;
    summary: string;
    logoUrl: string;
    tags: string[];
    status: string;
  } | null>(null);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pauseRequestKey, setPauseRequestKey] = useState(0); // Force re-render of pause request handler

  const handleShowNotes = () => setShowNotesModal(true);
  const handleCloseNotes = () => setShowNotesModal(false);

  useEffect(() => {
    async function fetchProjectDetails() {
      const res = await fetch(`/api/dashboard/project-details?projectId=${projectId}`);
      const json = await res.json();
      setProjectDetails({
        title: json.title || 'Unknown Project',
        summary: json.summary || 'No summary available',
        logoUrl: json.logoUrl || '/default-logo.png',
        tags: json.typeTags || [],
        status: json.status || 'unknown',
      });
    }
    fetchProjectDetails();
  }, [projectId]);

  if (!projectDetails) return <div>Loading...</div>;

  const { title, summary, logoUrl, tags, status } = projectDetails;

  return (
    <main className="flex flex-col min-h-screen w-full max-w-6xl mx-auto bg-white">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white px-4 md:px-12 pt-4 pb-6">
        <div className="flex flex-col gap-6">
          <CommissionerProjectPageHeader projectId={projectId} title={title} summary={summary} logoUrl={logoUrl} tags={tags} />
          <CommissionerProjectMetaLinks projectId={projectId} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-12 pb-8 bg-white">
        {/* Timeline Section - Full width on mobile, flex-1 on desktop */}
        <div className="flex-1 order-1 lg:order-1">
          {/* Pause Request Handler - Shows if there's a pending pause request */}
          <PauseRequestHandler
            key={pauseRequestKey}
            projectId={projectId}
            projectTitle={title}
            projectStatus={status}
            onRequestHandled={() => {
              // Force re-render to refresh the pause request status
              setPauseRequestKey(prev => prev + 1);
            }}
          />
          <CommissionerProjectTimeline projectId={projectId} title={title} logoUrl={logoUrl} onNotesClick={handleShowNotes} />
        </div>

        {/* Action Buttons - Below timeline on mobile, sidebar on desktop */}
        <div className="w-full lg:w-[280px] shrink-0 order-2 lg:order-2">
          <div className="lg:sticky lg:top-[200px] flex justify-center lg:justify-start">
            <CommissionerProjectActionButtons projectId={projectId} onNotesClick={handleShowNotes} />
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