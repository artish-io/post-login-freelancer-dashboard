'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getProgressRingStyles, getProgressRingProps } from '../../../../../src/lib/project-status-sync';

type Project = {
  projectId: number;
  title: string;
  status: 'ongoing' | 'paused' | 'completed';
  managerId: number;
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

export default function ProjectsRow({ projects, users, filterStatus }: Props) {
  const router = useRouter();
  const filteredProjects = projects.filter((project) => project.status === filterStatus);

  const handleProjectClick = (projectId: number) => {
    router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking?id=${projectId}`);
  };

  const getCommissionerName = (id: number) => {
    const commissioner = users.find((user) => user.id === id && user.type === 'commissioner');
    return commissioner ? commissioner.name : 'Unknown';
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
      year: 'numeric',
    });
  };

  // Get the appropriate date to display based on project status
  const getDisplayDate = (project: Project) => {
    if (project.status === 'completed' && project.completionDate) {
      return formatDate(project.completionDate);
    }
    return formatDate(project.dueDate);
  };

  // Get the appropriate column header for the date column
  const getDateColumnHeader = () => {
    return filterStatus === 'completed' ? 'Completion Date' : 'Due Date';
  };

  // Get ring color and stroke based on completion percentage
  const getRingStyles = (progress: number) => {
    if (progress === 100) {
      return {
        strokeColor: '#10B981', // Green for 100% completion
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
        <div className="w-1/5">Project Commissioner</div>
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
              <div className="w-1/5 text-gray-600">{getCommissionerName(project.managerId)}</div>
              <div className="w-1/5 text-gray-600">
                {getDisplayDate(project)}
              </div>
              <div className="w-1/10 text-center text-gray-600">{project.totalTasks}</div>
              <div className="w-1/10 text-center">
                <div className="relative flex items-center justify-center">
                  {(() => {
                    const ringStyles = getProgressRingStyles(project.progress);
                    const progressRing = getProgressRingProps(project.progress);

                    return (
                      <div className="relative w-8 h-8">
                        {/* Background circle */}
                        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r={progressRing.radius}
                            stroke="#E5E7EB"
                            strokeWidth="2"
                            fill="none"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="16"
                            cy="16"
                            r={progressRing.radius}
                            stroke={ringStyles.strokeColor}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={progressRing.strokeDasharray}
                            strokeDashoffset={progressRing.strokeDashoffset}
                            style={{
                              transition: 'stroke-dashoffset 0.5s ease-in-out'
                            }}
                          />
                        </svg>
                        {/* Percentage text */}
                        <div className={`absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] font-bold ${ringStyles.textColor}`}>
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
          <div className="py-4 text-center text-sm text-gray-500">No projects found for this status.</div>
        )}
      </div>
    </div>
  );
}