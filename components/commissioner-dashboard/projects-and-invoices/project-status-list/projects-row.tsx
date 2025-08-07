'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

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
  const filteredProjects = projects
    .filter((project) => project.status === filterStatus)
    .sort((a, b) => {
      // Sort by nearest due date (earliest first)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const handleProjectClick = (projectId: number) => {
    router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking/${projectId}`);
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
        <div className="w-1/5">Project ID</div>
        <div className="w-1/5">Freelancer</div>
        <div className="w-1/5">{getDateColumnHeader()}</div>
        <div className="w-1/10 text-center">Total Tasks</div>
        <div className="w-1/10 text-center">% Completion</div>
      </div>
      <div className="max-h-[480px] overflow-y-auto custom-scrollbar w-full">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project.projectId}
              onClick={() => handleProjectClick(project.projectId)}
              className="w-full flex items-center justify-between py-2 border-b border-gray-200 text-[10px] md:text-[12px] cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="w-1/5 font-medium text-gray-800 flex flex-col">
                <span className="text-gray-800 font-semibold text-[11px] md:text-[13px]">
                  #{project.projectId}
                </span>
                <span className="text-gray-800 text-[13px] md:text-[15px] leading-tight">{project.title}</span>
              </div>
              <div className="w-1/5 text-gray-600">{getFreelancerName(project.freelancerId)}</div>
              <div className="w-1/5 text-gray-600">
                {getDisplayDate(project)}
              </div>
              <div className="w-1/10 text-center text-gray-600">{project.totalTasks}</div>
              <div className="w-1/10 text-center">
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
    </div>
  );
}
