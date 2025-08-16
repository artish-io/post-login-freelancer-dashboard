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
  const projectId = searchParams.get('id') || '0';

  const [projectDetails, setProjectDetails] = useState<{
    title: string;
    summary: string;
    logoUrl: string;
    tags: string[];
    status: string;
  } | null>(null);

  const [showNotesModal, setShowNotesModal] = useState(false);

  const handleShowNotes = () => setShowNotesModal(true);
  const handleCloseNotes = () => setShowNotesModal(false);

  useEffect(() => {
    async function fetchProjectDetails() {
      const res = await fetch(`/api/dashboard/project-details?projectId=${projectId}`);
      const json = await res.json();
      setProjectDetails({
        title: json.title,
        summary: json.summary,
        logoUrl: json.logoUrl,
        tags: json.typeTags || [],
        status: json.status || 'Ongoing',
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
          <ProjectPageHeader projectId={projectId} title={title} summary={summary} logoUrl={logoUrl} tags={tags} />
          <ProjectMetaLinks projectId={projectId} />
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