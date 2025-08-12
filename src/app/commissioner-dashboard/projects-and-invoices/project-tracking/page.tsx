'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import CommissionerProjectPageHeader from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-page-header';
import CommissionerProjectMetaLinks from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-meta-links';
import CommissionerProjectTimeline from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-timeline';
import CommissionerProjectActionButtons from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/project-action-buttons';
import PauseRequestHandler from '../../../../../components/commissioner-dashboard/projects-and-invoices/project-details/pause-request-handler';
import ProjectNotesExpansion from '../../../../../components/freelancer-dashboard/project-notes-expansion';
import RatingModal from '../../../../../components/common/rating/rating-modal';

export default function CommissionerProjectTrackingPage() {
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get('id')) || 0;

  const [projectDetails, setProjectDetails] = useState<{
    title: string;
    summary: string;
    logoUrl: string;
    tags: string[];
    status: string;
  } | null>(null);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pauseRequestKey, setPauseRequestKey] = useState(0); // Force re-render of pause request handler
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [freelancerInfo, setFreelancerInfo] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleShowNotes = () => setShowNotesModal(true);
  const handleCloseNotes = () => setShowNotesModal(false);

  useEffect(() => {
    async function fetchProjectDetails() {
      try {
        // Fetch project details
        const res = await fetch(`/api/dashboard/project-details?projectId=${projectId}`);
        const json = await res.json();
        setProjectDetails({
          title: json.title,
          summary: json.summary,
          logoUrl: json.logoUrl,
          tags: json.typeTags,
          status: json.status,
        });

        // Check if project is completed by fetching project tasks
        const tasksRes = await fetch(`/api/projects/${projectId}`);
        if (tasksRes.ok) {
          const projectData = await tasksRes.json();
          const tasks = projectData.tasks || [];
          const allTasksCompleted = tasks.length > 0 && tasks.every((task: any) => task.status === 'Approved' && task.completed);
          setProjectCompleted(allTasksCompleted);

          // Get freelancer info for rating
          if (allTasksCompleted && projectData.freelancerId) {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const users = await usersRes.json();
              const freelancer = users.find((user: any) => user.id === projectData.freelancerId && user.type === 'freelancer');
              if (freelancer) {
                setFreelancerInfo({
                  id: freelancer.id,
                  name: freelancer.name
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      }
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
          <div className="lg:sticky lg:top-[200px] flex flex-col gap-4 justify-center lg:justify-start">
            <CommissionerProjectActionButtons projectId={projectId} onNotesClick={handleShowNotes} />

            {/* Rating Button for Completed Projects */}
            {projectCompleted && freelancerInfo && (
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full bg-[#eb1966] text-white px-4 py-2 rounded-lg hover:bg-[#d1175a] transition-colors font-medium"
              >
                Rate Freelancer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <ProjectNotesExpansion projectId={projectId} onClose={handleCloseNotes} />
      )}

      {/* Rating Modal */}
      {showRatingModal && freelancerInfo && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          projectId={projectId}
          projectTitle={title}
          subjectUserId={freelancerInfo.id}
          subjectUserType="freelancer"
          subjectName={freelancerInfo.name}
          onRatingSubmitted={() => {
            setShowRatingModal(false);
            // Optionally show success message
          }}
        />
      )}
    </main>
  );
}