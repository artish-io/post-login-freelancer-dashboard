'use client';

// NOTE TO DEV TEAM:
// This component dynamically fetches dashboard-specific project summaries based on the current user's session ID.
// It uses useSession() to access the client session and loads data from /api/dashboard/projects-summary.
// If no session is available, a warning is logged to help debug dev hydration or login state issues.
// Ensure file is named correctly as 'project-summary-table.tsx' to match imports.

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

export type Project = {
  projectId: number;
  name: string;
  manager: string;
  dueDate: string;
  dueDateRaw?: string; // Raw date for sorting
  status: 'ongoing' | 'paused' | 'completed' | 'delayed';
  progress: number;
  totalTasks: number;
};

const statusColors: Record<Project['status'], string> = {
  ongoing: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-800',
};

const statusLabels: Record<Project['status'], string> = {
  ongoing: 'Ongoing',
  paused: 'Paused',
  completed: 'Completed',
  delayed: 'Delayed',
};

// Helper function to calculate project status based on tasks and due dates
function calculateProjectStatus(project: any, earliestDueDate: string | null): 'ongoing' | 'paused' | 'completed' | 'delayed' {
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((task: any) => task.completed).length;
  const totalTasks = tasks.length;

  if (totalTasks === 0) return 'paused';
  if (completedTasks === totalTasks) return 'completed';

  // Check if project has recent activity (tasks in review or recently updated)
  const hasRecentActivity = tasks.some((task: any) =>
    task.status === 'In review' || task.status === 'Ongoing'
  );

  const baseStatus = hasRecentActivity ? 'ongoing' : 'paused';

  // Check if project is delayed (past due date)
  if (earliestDueDate && baseStatus === 'ongoing') {
    const dueDate = new Date(earliestDueDate);
    const today = new Date();

    // Set both dates to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return 'delayed';
    }
  }

  return baseStatus;
}

export default function ProjectSummaryTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  // Get ring color and stroke based on completion percentage (same as projects-row)
  const getRingStyles = (progress: number) => {
    if (progress === 100) {
      return {
        strokeColor: '#10B981', // Green for 100% completion
        textColor: 'text-green-700'
      };
    } else if (progress >= 75) {
      return {
        strokeColor: '#84CC16', // Yellow-green for 75%+
        textColor: 'text-lime-700'
      };
    } else if (progress >= 50) {
      return {
        strokeColor: '#EAB308', // Yellow for 50-74%
        textColor: 'text-yellow-700'
      };
    } else {
      return {
        strokeColor: '#EF4444', // Red for below 50%
        textColor: 'text-red-700'
      };
    }
  };

  // Calculate stroke dash array for progress ring (same as projects-row)
  const getProgressRing = (progress: number) => {
    const radius = 12; // Slightly smaller for table
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

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Use the same data sources as projects-row.tsx
        const [projectRes, userRes, orgRes] = await Promise.all([
          fetch('/api/project-tasks'),
          fetch('/api/users'),
          fetch('/api/organizations')
        ]);

        if (projectRes.ok && userRes.ok && orgRes.ok) {
          const projectData = await projectRes.json();
          const users = await userRes.json();
          const organizations = await orgRes.json();

          // Transform project-tasks data using the same logic as projects-row.tsx
          const transformedProjects = projectData.map((project: any) => {
            const tasks = project.tasks || [];
            const completedTasks = tasks.filter((task: any) => task.completed).length;
            const totalTasks = tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Get earliest due date from incomplete tasks
            const incompleteTasks = tasks.filter((task: any) => !task.completed);
            const dueDate = incompleteTasks.length > 0
              ? incompleteTasks.map((task: any) => task.dueDate).sort()[0]
              : null;

            // Find the organization and its contact person (commissioner)
            const organization = organizations.find((org: any) => org.id === project.organizationId);
            const commissioner = users.find((user: any) =>
              user.id === organization?.contactPersonId && user.type === 'commissioner'
            );

            // Calculate project status using the same logic, including delay check
            const projectStatus = calculateProjectStatus(project, dueDate);

            return {
              projectId: project.projectId,
              name: project.title,
              manager: commissioner ? commissioner.name : 'Unknown',
              dueDate: dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) : 'No due date',
              dueDateRaw: dueDate, // Keep raw date for sorting
              status: projectStatus,
              progress,
              totalTasks
            };
          });

          // Filter out completed projects - only show ongoing, paused, and delayed
          const activeProjects = transformedProjects.filter((project: any) =>
            project.status === 'ongoing' || project.status === 'paused' || project.status === 'delayed'
          );

          // Sort by priority: delayed first, then by due date (earliest first)
          const sortedProjects = activeProjects.sort((a: any, b: any) => {
            // Delayed projects always come first
            if (a.status === 'delayed' && b.status !== 'delayed') return -1;
            if (b.status === 'delayed' && a.status !== 'delayed') return 1;

            // If both are delayed or both are not delayed, sort by due date
            // Projects with no due date go to the end
            if (!a.dueDateRaw && !b.dueDateRaw) return 0;
            if (!a.dueDateRaw) return 1;
            if (!b.dueDateRaw) return -1;

            // Sort by earliest due date first
            return new Date(a.dueDateRaw).getTime() - new Date(b.dueDateRaw).getTime();
          });

          // Take only the first 5 active projects for the summary table
          setProjects(sortedProjects.slice(0, 5));
        } else {
          console.error('Failed to fetch project data');
        }
      } catch (error) {
        console.error('❌ Failed to fetch project summary:', error);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Project summary</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">Project manager</th>
              <th className="py-3 pr-6">Due date</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="py-3 pr-6">{project.name}</td>
                <td className="py-3 pr-6">{project.manager}</td>
                <td className="py-3 pr-6">{project.dueDate}</td>
                <td className="py-3 pr-6">
                  <span
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      statusColors[project.status]
                    )}
                  >
                    {statusLabels[project.status]}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-center">
                    {(() => {
                      const ringStyles = getRingStyles(project.progress);
                      const progressRing = getProgressRing(project.progress);

                      return (
                        <div className="relative w-7 h-7">
                          {/* Background circle */}
                          <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                            <circle
                              cx="14"
                              cy="14"
                              r={progressRing.radius}
                              stroke="#E5E7EB"
                              strokeWidth="2"
                              fill="none"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="14"
                              cy="14"
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
                          <div className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${ringStyles.textColor}`}>
                            {project.progress}%
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => router.push('/freelancer-dashboard/projects-and-invoices/project-list')}
          className="text-sm px-4 py-2 rounded-full border text-gray-800 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          View All
        </button>
      </div>
    </div>
  );
}