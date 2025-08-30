'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { validateDataIntegrity, logDataIntegrityReport } from '../../src/lib/data-integrity';
import { filterFreelancerProjects, getFreelancerId, requireValidSession } from '../../src/lib/freelancer-access-control';

export type ProjectSummaryItem = {
  projectId: number;
  name: string;
  person: string; // Either freelancer or manager depending on view type
  dueDate: string;
  dueDateRaw?: string;
  status: 'ongoing' | 'paused' | 'completed' | 'delayed';
  progress: number;
  totalTasks: number;
};

export type ProjectSummaryTableProps = {
  viewType: 'freelancer' | 'commissioner';
  title?: string;
  showStatus?: boolean;
  showViewAllButton?: boolean;
  maxItems?: number;
  className?: string;
};

const statusColors: Record<ProjectSummaryItem['status'], string> = {
  ongoing: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-800',
};

const statusLabels: Record<ProjectSummaryItem['status'], string> = {
  ongoing: 'Ongoing',
  paused: 'Paused',
  completed: 'Completed',
  delayed: 'Delayed',
};

// Helper function to calculate project status based on tasks and due dates
function calculateProjectStatus(project: any, earliestDueDate: string | null): 'ongoing' | 'paused' | 'completed' | 'delayed' {
  const tasks = project.tasks || [];
  // Tasks must be both approved AND completed to count as finished
  const completedTasks = tasks.filter((task: any) =>
    task.status === 'Approved' && task.completed === true
  ).length;
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

export default function ProjectSummaryTable({
  viewType,
  title = 'Project summary',
  showStatus = true,
  showViewAllButton = true,
  maxItems = 5,
  className = ''
}: ProjectSummaryTableProps) {
  const [projects, setProjects] = useState<ProjectSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  // Get ring color and stroke based on completion percentage
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

  // Calculate stroke dash array for progress ring
  const getProgressRing = (progress: number) => {
    const radius = 12;
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
        setLoading(true);

        if (viewType === 'commissioner') {
          // Commissioner view - fetch dynamic data
          const [projectTasksRes, projectsRes, userRes, orgRes] = await Promise.all([
            fetch('/api/project-tasks'),
            fetch('/api/projects'),
            fetch('/api/users'),
            fetch('/api/organizations')
          ]);

          // Proceed if we have at least projects, users, and organizations data
          // project-tasks is optional for basic project display
          if (projectsRes.ok && userRes.ok && orgRes.ok) {
            const projectTasksData = projectTasksRes.ok ? await projectTasksRes.json() : [];
            const projectsData = await projectsRes.json();
            const users = await userRes.json();
            await orgRes.json(); // Organizations data loaded but not used in commissioner view

            // Run data integrity check in development
            if (process.env.NODE_ENV === 'development') {
              const integrityReport = validateDataIntegrity(projectsData, projectTasksData);
              logDataIntegrityReport(integrityReport);
            }

            // Use current session user as commissioner
            const commissionerId = session?.user?.id ? parseInt(session.user.id) : null;
            if (!commissionerId) {
              setProjects([]);
              return;
            }

            // Filter projects directly by commissionerId
            const commissionerProjects = projectsData.filter((project: any) =>
              project.commissionerId === commissionerId
            );

            if (commissionerProjects.length > 0) {

              // Transform project data for commissioner view
              const transformedProjects = commissionerProjects.map((project: any) => {
                // Find corresponding project tasks
                const projectTasks = projectTasksData.find((pt: any) => pt.projectId === project.projectId);
                const tasks = projectTasks?.tasks || [];
                // Progress should be based on approved tasks, not just completed/submitted tasks
                const approvedTasks = tasks.filter((task: any) => task.status === 'Approved').length;
                const totalTasks = tasks.length;
                const progress = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

                // Find the freelancer assigned to this project
                const freelancer = users.find((user: any) =>
                  user.id === project.freelancerId && user.type === 'freelancer'
                );

                // Calculate project status - normalize status values
                let projectStatus = project.status?.toLowerCase() || calculateProjectStatus(projectTasks, project.dueDate);

                // Map status values to expected format
                if (projectStatus === 'active') {
                  projectStatus = 'ongoing';
                }

                return {
                  projectId: project.projectId,
                  name: project.title,
                  person: freelancer ? freelancer.name : 'Unassigned',
                  dueDate: project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'No due date',
                  dueDateRaw: project.dueDate,
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
                if (a.status === 'delayed' && b.status !== 'delayed') return -1;
                if (b.status === 'delayed' && a.status !== 'delayed') return 1;

                if (!a.dueDateRaw && !b.dueDateRaw) return 0;
                if (!a.dueDateRaw) return 1;
                if (!b.dueDateRaw) return -1;

                return new Date(a.dueDateRaw).getTime() - new Date(b.dueDateRaw).getTime();
              });

              setProjects(sortedProjects.slice(0, maxItems));
            }
          }
        } else {
          // Freelancer view - use session-based filtering
          const validSession = requireValidSession(session?.user as any);
          if (!validSession) {
            setProjects([]);
            return;
          }

          // Only freelancers should see this view
          const userType = validSession.userType || validSession.type;
          if (userType !== 'freelancer') {
            setProjects([]);
            return;
          }

          const freelancerId = getFreelancerId(validSession);
          if (!freelancerId) {
            setProjects([]);
            return;
          }

          const [projectTasksRes, projectsRes, userRes, orgRes] = await Promise.all([
            fetch('/api/project-tasks'),
            fetch('/api/projects'),
            fetch('/api/users'),
            fetch('/api/organizations')
          ]);

          // Proceed if we have at least projects, users, and organizations data
          // project-tasks is optional for basic project display
          if (projectsRes.ok && userRes.ok && orgRes.ok) {
            const projectTasksData = projectTasksRes.ok ? await projectTasksRes.json() : [];
            const projectsData = await projectsRes.json();
            const users = await userRes.json();
            const organizations = await orgRes.json();

            // Filter projects to only include those belonging to this freelancer
            const freelancerProjects = filterFreelancerProjects(projectsData, validSession);
            const freelancerProjectIds = freelancerProjects.map(p => p.projectId);

            // Filter project tasks to only include those for freelancer's projects
            const freelancerProjectTasks = projectTasksData.filter((pt: any) =>
              freelancerProjectIds.includes(pt.projectId)
            );

            let transformedProjects;

            if (freelancerProjectTasks.length > 0) {
              // Transform project-tasks data when available
              transformedProjects = freelancerProjectTasks.map((project: any) => {
              const tasks = project.tasks || [];
              // Progress should be based on approved tasks, not just completed/submitted tasks
              const approvedTasks = tasks.filter((task: any) => task.status === 'Approved').length;
              const totalTasks = tasks.length;
              const progress = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

              // Get due date from projects.json
              const projectInfo = freelancerProjects.find((p: any) => p.projectId === project.projectId);
              const dueDate = (projectInfo as any)?.dueDate || null;

              // Find the organization and its contact person (commissioner)
              const organization = organizations.find((org: any) => org.id === project.organizationId);
              const commissioner = users.find((user: any) =>
                user.id === organization?.contactPersonId && user.type === 'commissioner'
              );

              // Calculate project status
              const projectStatus = projectInfo?.status?.toLowerCase() || calculateProjectStatus(project, dueDate);

              return {
                projectId: project.projectId,
                name: project.title,
                person: commissioner ? commissioner.name : 'Unknown',
                dueDate: dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }) : 'No due date',
                dueDateRaw: dueDate,
                status: projectStatus,
                progress,
                totalTasks
              };
              });
            } else {
              // Fallback: use projects.json data when project-tasks API fails
              transformedProjects = freelancerProjects.map((project: any) => {
                // Use project status from projects.json
                const projectStatus = project.status?.toLowerCase() || 'ongoing';

                // Find the commissioner using the commissionerId from the project
                const commissioner = users.find((user: any) =>
                  user.id === project.commissionerId && user.type === 'commissioner'
                );

                return {
                  projectId: project.projectId,
                  name: project.title,
                  person: commissioner ? commissioner.name : 'Unknown',
                  dueDate: project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'No due date',
                  dueDateRaw: project.dueDate,
                  status: projectStatus,
                  progress: 0, // No task data available
                  totalTasks: 0
                };
              });
            }

            // Filter out completed projects - only show ongoing, paused, and delayed
            const activeProjects = transformedProjects.filter((project: any) =>
              project.status === 'ongoing' || project.status === 'paused' || project.status === 'delayed'
            );

            // Sort by priority: delayed first, then by due date (earliest first)
            const sortedProjects = activeProjects.sort((a: any, b: any) => {
              if (a.status === 'delayed' && b.status !== 'delayed') return -1;
              if (b.status === 'delayed' && a.status !== 'delayed') return 1;

              if (!a.dueDateRaw && !b.dueDateRaw) return 0;
              if (!a.dueDateRaw) return 1;
              if (!b.dueDateRaw) return -1;

              return new Date(a.dueDateRaw).getTime() - new Date(b.dueDateRaw).getTime();
            });

            setProjects(sortedProjects.slice(0, maxItems));
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [viewType, maxItems, session]);

  const handleProjectClick = (projectId: number | string) => {
    // Guard against invalid project IDs
    if (!projectId || (typeof projectId !== 'string' && typeof projectId !== 'number')) {
      console.warn('[PROJECT_NAV:BAD_ID]', { projectId });
      return;
    }

    // Keep projectId as string for navigation
    const projectIdStr = projectId.toString();

    // Log navigation attempt
    fetch('/api/logs/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'data/logs/project-nav.log',
        entry: `[${new Date().toISOString()}] [PROJECT_NAV:CLICK] ${JSON.stringify({ projectId: projectIdStr, viewType })}`
      })
    }).catch(console.warn);

    if (viewType === 'freelancer') {
      router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${encodeURIComponent(projectIdStr)}`);
    } else {
      router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking/${encodeURIComponent(projectIdStr)}`);
    }
  };

  const handleViewAllClick = () => {
    if (viewType === 'commissioner') {
      router.push('/commissioner-dashboard/projects-and-invoices/project-list');
    } else {
      router.push('/freelancer-dashboard/projects-and-invoices/project-list');
    }
  };

  if (loading) {
    return (
      <div className={clsx("bg-white rounded-xl shadow-sm border p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const personColumnLabel = viewType === 'commissioner' ? 'Freelancer' : 'Project manager';

  return (
    <div className={clsx("bg-white rounded-xl shadow-sm p-4 sm:p-6", className)}>
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">{personColumnLabel}</th>
              <th className="py-3 pr-6">Due date</th>
              {showStatus && (
                <th className="py-3 pr-6">Status</th>
              )}
              <th className="py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr
                key={index}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleProjectClick(project.projectId)}
              >
                <td className="py-3 pr-6">{project.name}</td>
                <td className="py-3 pr-6">{project.person}</td>
                <td className="py-3 pr-6">{project.dueDate}</td>
                {showStatus && (
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
                )}
                <td className="py-3">
                  {/* Both views now use circular progress rings */}
                  <div className="flex items-center justify-center">
                    {(() => {
                      const ringStyles = getRingStyles(project.progress);
                      const progressRing = getProgressRing(project.progress);

                      return (
                        <div className="relative w-7 h-7">
                          <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                            <circle
                              cx="14"
                              cy="14"
                              r={progressRing.radius}
                              stroke="#E5E7EB"
                              strokeWidth="2"
                              fill="none"
                            />
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
      
      {projects.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          No active projects found
        </div>
      )}

      {/* CTA */}
      {showViewAllButton && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleViewAllClick}
            className="text-sm px-4 py-2 rounded-full border text-gray-800 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
}
