'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Star } from 'lucide-react';
import RatingModal from '../../../shared/rating-modal';

type Project = {
  projectId: number;
  title: string;
  status: 'ongoing' | 'paused' | 'completed';
  freelancerId: number;
  dueDate: string;
  totalTasks: number;
  progress: number;
  completionDate?: string; // Optional completion date for completed projects
};

type User = {
  id: number;
  name: string;
  type: 'freelancer' | 'commissioner';
};

type Props = {
  projects: Project[];
  users: User[];
  filterStatus: 'ongoing' | 'paused' | 'completed';
};

export default function CommissionerProjectsRow({ projects, users, filterStatus }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    projectId: number;
    projectTitle: string;
    freelancerId: number;
    freelancerName: string;
  } | null>(null);
  const [ratedProjects, setRatedProjects] = useState<Set<number>>(new Set());

  // Check which projects have been rated
  useEffect(() => {
    const checkRatedProjects = async () => {
      if (!session?.user?.id) return;

      const completedProjects = projects.filter(p => p.status === 'completed' && p.progress === 100);
      const ratedProjectIds = new Set<number>();

      for (const project of completedProjects) {
        try {
          const response = await fetch(
            `/api/ratings/exists?projectId=${project.projectId}&subjectUserId=${project.freelancerId}&subjectUserType=freelancer`
          );
          const data = await response.json();
          if (data.success && data.data.exists) {
            ratedProjectIds.add(project.projectId);
          }
        } catch (error) {
          console.error('Error checking rating existence:', error);
        }
      }

      setRatedProjects(ratedProjectIds);
    };

    if (filterStatus === 'completed') {
      checkRatedProjects();
    }
  }, [projects, filterStatus, session?.user?.id]);

  const filteredProjects = projects
    .filter((project) => project.status === filterStatus)
    .sort((a, b) => {
      // Sort by latest to oldest (most recent first)
      if (filterStatus === 'completed') {
        // For completed projects, sort by completion date (latest first)
        if (!a.completionDate && !b.completionDate) return b.projectId - a.projectId;
        if (!a.completionDate) return 1;
        if (!b.completionDate) return -1;
        return new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime();
      } else {
        // For ongoing/paused projects, sort by project ID (higher ID = more recent)
        return b.projectId - a.projectId;
      }
    });

  const handleProjectClick = (projectId: number) => {
    router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking/${projectId}`);
  };

  const handleRateClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent project navigation
    const freelancer = users.find((user) => user.id === project.freelancerId && user.type === 'freelancer');
    setRatingModal({
      isOpen: true,
      projectId: project.projectId,
      projectTitle: project.title,
      freelancerId: project.freelancerId,
      freelancerName: freelancer?.name || 'Unknown Freelancer'
    });
  };

  const handleRatingSubmitted = (projectId: number) => {
    setRatedProjects(prev => new Set(prev).add(projectId));
    setRatingModal(null);
  };

  const canRate = (project: Project): boolean => {
    return (
      project.status === 'completed' &&
      project.progress === 100 &&
      !ratedProjects.has(project.projectId)
    );
  };

  const getFreelancerName = (id: number) => {
    const freelancer = users.find((user) => user.id === id && user.type === 'freelancer');
    return freelancer ? freelancer.name : 'Unknown';
  };

  // Safely format date and handle invalid dates
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'No due date') {
      return 'No date set';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDateColumnHeader = () => {
    switch (filterStatus) {
      case 'completed':
        return 'Completion Date';
      case 'paused':
        return 'Last Activity';
      default:
        return 'Due Date';
    }
  };

  const getDisplayDate = (project: Project) => {
    switch (filterStatus) {
      case 'completed':
        return project.completionDate ? formatDate(project.completionDate) : 'Unknown';
      case 'paused':
        return formatDate(project.dueDate);
      default:
        return formatDate(project.dueDate);
    }
  };

  const getRingStyles = (progress: number) => {
    if (progress === 100) {
      return {
        strokeColor: '#10B981', // Green for 100%
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      };
    } else if (progress >= 75) {
      return {
        strokeColor: '#84CC16', // Yellow-green for 75%+
        bgColor: 'bg-lime-50',
        textColor: 'text-lime-700'
      };
    } else if (progress >= 50) {
      return {
        strokeColor: '#EAB308', // Yellow for 50-74%
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700'
      };
    } else {
      return {
        strokeColor: '#EF4444', // Red for below 50%
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      };
    }
  };

  // Calculate stroke dash array for progress ring
  const getProgressRing = (progress: number) => {
    const radius = 14; // Ring radius
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return {
      radius,
      circumference,
      strokeDasharray,
      strokeDashoffset
    };
  };

  return (
    <div className="relative w-full">
      <div className="sticky top-0 bg-white z-10 flex items-center justify-between border-b border-gray-300 py-2 px-1 text-[10px] md:text-[12px] font-semibold text-gray-700">
        <div className="w-1/6">Project ID</div>
        <div className="w-1/6">Freelancer</div>
        <div className="w-1/6">{getDateColumnHeader()}</div>
        <div className="w-1/12 text-center">Total Tasks</div>
        <div className="w-1/12 text-center">% Completion</div>
        {filterStatus === 'completed' && <div className="w-1/12 text-center">Rating</div>}
      </div>
      <div className="max-h-[480px] overflow-y-auto custom-scrollbar w-full">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project.projectId}
              onClick={() => handleProjectClick(project.projectId)}
              className="w-full flex items-center justify-between py-2 border-b border-gray-200 text-[10px] md:text-[12px] cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="w-1/6 font-medium text-gray-800 flex flex-col">
                <span className="text-gray-800 font-semibold text-[11px] md:text-[13px]">
                  #{project.projectId}
                </span>
                <span className="text-gray-800 text-[13px] md:text-[15px] leading-tight">{project.title}</span>
              </div>
              <div className="w-1/6 text-gray-600">{getFreelancerName(project.freelancerId)}</div>
              <div className="w-1/6 text-gray-600">
                {getDisplayDate(project)}
              </div>
              <div className="w-1/12 text-center text-gray-600">{project.totalTasks}</div>
              <div className="w-1/12 text-center">
                <div className="relative flex items-center justify-center">
                  {(() => {
                    const ringStyles = getRingStyles(project.progress);
                    const progressRing = getProgressRing(project.progress);

                    return (
                      <div className={`relative w-8 h-8 ${ringStyles.bgColor} rounded-full flex items-center justify-center`}>
                        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                          {/* Background circle */}
                          <circle
                            cx="16"
                            cy="16"
                            r={progressRing.radius}
                            stroke="#E5E7EB"
                            strokeWidth="2"
                            fill="transparent"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="16"
                            cy="16"
                            r={progressRing.radius}
                            stroke={ringStyles.strokeColor}
                            strokeWidth="2"
                            fill="transparent"
                            strokeDasharray={progressRing.strokeDasharray}
                            strokeDashoffset={progressRing.strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-in-out"
                          />
                        </svg>
                        <div className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${ringStyles.textColor}`}>
                          {project.progress}%
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {filterStatus === 'completed' && (
                <div className="w-1/12 text-center">
                  {canRate(project) ? (
                    <button
                      onClick={(e) => handleRateClick(e, project)}
                      className="inline-flex items-center justify-center w-6 h-6 bg-[#eb1966] text-white rounded-full hover:bg-[#d1175a] transition-colors"
                      title="Rate Freelancer"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  ) : ratedProjects.has(project.projectId) ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full" title="Already rated">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  ) : (
                    <div className="w-6 h-6" /> // Empty space for non-completed projects
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">📋</div>
              <div className="text-sm">No {filterStatus} projects found</div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <RatingModal
          isOpen={ratingModal.isOpen}
          onClose={() => setRatingModal(null)}
          projectId={ratingModal.projectId}
          projectTitle={ratingModal.projectTitle}
          subjectUserId={ratingModal.freelancerId}
          subjectUserType="freelancer"
          subjectUserName={ratingModal.freelancerName}
          onRatingSubmitted={() => handleRatingSubmitted(ratingModal.projectId)}
        />
      )}
    </div>
  );
}
