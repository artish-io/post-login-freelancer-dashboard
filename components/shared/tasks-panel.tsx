'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { startOfDay } from 'date-fns';
import { NotesTab } from '../freelancer-dashboard/notes-tab';
import ProjectNotesExpansion from '../freelancer-dashboard/project-notes-expansion';
import TaskDetailsModal from '../freelancer-dashboard/projects-and-invoices/projects/task-details-modal';
import TaskReviewModal from '../commissioner-dashboard/projects-and-invoices/tasks-to-review/task-review-modal';

export type TasksPanelProps = {
  viewType: 'freelancer' | 'commissioner';
  title: string;
  showNotesTab?: boolean;
  maxHeight?: string;
  className?: string;
};

export type BaseTask = {
  id: number;
  title: string;
  status: string;
  important: boolean;
  projectId: number;
  projectTitle: string;
  taskDescription: string;
};

export type FreelancerTask = BaseTask & {
  notes: number;
  projectLogo?: string;
  projectTags?: string[];
  briefUrl?: string;
  workingFileUrl?: string;
  columnId: 'todo' | 'upcoming' | 'review';
  completed?: boolean;
  dueDateRaw?: string;
  rejected?: boolean;
  feedbackCount?: number;
  pushedBack?: boolean;
  taskIndex?: number;
  totalTasks?: number;
};

export type CommissionerTask = BaseTask & {
  freelancer: string;
  submittedDate: string;
  version?: number;
  reviewed?: boolean;
};

export type TaskToReview = {
  id: number;
  title: string;
  projectId: number;
  projectTitle: string;
  submittedDate: string;
  freelancer: {
    id: number;
    name: string;
    avatar: string;
  };
  version: number;
  description: string;
  link: string;
  briefUrl?: string;
  workingFileUrl?: string;
  projectLogo: string;
  projectTags: string[];
  taskIndex?: number;
  totalTasks?: number;
};

const statusColors: Record<string, string> = {
  'Approved': 'bg-green-100 text-green-700',
  'In review': 'bg-red-100 text-red-700',
  'Ongoing': 'bg-yellow-100 text-yellow-800',
  'Submitted': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-gray-100 text-gray-600',
  'Completed': 'bg-green-100 text-green-800',
  'Paused': 'bg-gray-100 text-gray-800',
};

export default function TasksPanel({
  viewType,
  title,
  showNotesTab = false,
  maxHeight = 'max-h-96', // Default max height
  className = ''
}: TasksPanelProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<(FreelancerTask | CommissionerTask)[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState<{all: number, important: number, notes: number} | null>(null);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskToReview | null>(null);
  
  // Dynamic tabs based on view type
  const tabs = showNotesTab && viewType === 'freelancer' 
    ? ['All', 'Important', 'Notes'] as const
    : ['All', 'Important'] as const;
  
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projectsInfo, setProjectsInfo] = useState<any[]>([]);

  // Helper function to check if a project is paused (aligned with task-column.tsx)
  const isProjectPaused = (projectId: number): boolean => {
    if (!projectsInfo || projectsInfo.length === 0) return false;
    const projectInfo = projectsInfo.find(p => p.projectId === projectId);
    return projectInfo?.status?.toLowerCase() === 'paused';
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        if (viewType === 'freelancer') {
          if (!session?.user?.id) return;

          // Get read notes from localStorage for accurate unread count
          const readNotesData = typeof window !== 'undefined' ? localStorage.getItem('readNotes') : null;
          const readNotesParam = readNotesData ? encodeURIComponent(readNotesData) : '';

          const [taskRes, notesRes, projectsRes, organizationsRes, projectInfoRes] = await Promise.all([
            fetch(`/api/dashboard/tasks-summary?id=${session.user.id}`),
            fetch(`/api/dashboard/project-notes/count?userId=${session.user.id}&readNotes=${readNotesParam}`),
            fetch('/api/projects'),
            fetch('/api/organizations'),
            fetch('/api/projects') // Fetch project status info for paused project filtering
          ]);

          const taskData = await taskRes.json();
          const notes = await notesRes.json();
          const projectsData = await projectsRes.json();
          const organizationsData = await organizationsRes.json();

          // Fetch project status info for paused project filtering (aligned with task-column.tsx)
          let projectInfoData: any[] = [];
          if (projectInfoRes.ok) {
            try {
              projectInfoData = await projectInfoRes.json();
              console.log('✅ Successfully fetched project status information for task filtering');
            } catch (error) {
              console.warn('⚠️ Failed to parse project status info:', error);
              projectInfoData = [];
            }
          } else {
            console.warn('⚠️ Failed to fetch project status info. Status:', projectInfoRes.status);
            projectInfoData = [];
          }

          // Store projects and organizations data in state for modal enrichment
          setProjects(projectsData);
          setOrganizations(organizationsData);
          setProjectsInfo(projectInfoData);



          // Filter out tasks from completed projects and apply paused project logic (aligned with task-column.tsx)
          const filteredTasks = taskData.filter((task: FreelancerTask) => {
            const projectInfo = projectsData.find((p: any) => p.projectId === task.projectId);
            // Only exclude completed projects, but handle paused projects in the next step
            return projectInfo && projectInfo.status !== 'Completed';
          });

          // Filter to only show tasks that should be in "Today's Tasks" based on urgency hierarchy
          // Exclude tasks from paused projects (aligned with task-column.tsx logic)
          // Note: This component handles "Today's Tasks" panel only. "Upcoming This Week" filtering
          // is handled in task-column.tsx with isThisWeek() from date-fns
          const todaysTasks = filteredTasks.filter((task: FreelancerTask) => {
            // Only show incomplete, ongoing tasks (not in review, not completed)
            const isIncompleteTask = !task.completed && task.status === 'Ongoing';
            const isPaused = isProjectPaused(task.projectId);

            // Paused project tasks should NEVER appear in "Today's Tasks" (aligned with task-column.tsx)
            // EXCEPTION: Rejected tasks should appear even if project is paused (freelancer needs to address feedback)
            const isRejectedTask = task.rejected === true;
            if (isPaused && isIncompleteTask && !isRejectedTask) {
              console.log(`🚫 Excluding paused project task from today's tasks: ${task.title} (Project ID: ${task.projectId})`);
              return false;
            }
            if (isPaused && isIncompleteTask && isRejectedTask) {
              console.log(`✅ Including rejected task from paused project in today's tasks: ${task.title} (Project ID: ${task.projectId})`);
            }

            return isIncompleteTask;
          });

          // Sort by urgency hierarchy: rejected > feedback > pushed back > due today > others
          // (aligned with task-column.tsx sorting logic)
          const sortedByUrgency = todaysTasks.sort((a: FreelancerTask, b: FreelancerTask) => {
            // Get task details from project-tasks data to check urgency flags
            const getTaskUrgency = (task: FreelancerTask) => {
              let urgencyScore = 0;
              if (task.status === 'Rejected' || task.rejected) urgencyScore += 1000;
              if (task.important) urgencyScore += 500; // important flag indicates feedback/rejection
              if (task.feedbackCount && task.feedbackCount > 0) urgencyScore += 400;
              if (task.pushedBack) urgencyScore += 300;

              // Check if due today using proper date handling (aligned with task-column.tsx)
              if (task.dueDateRaw) {
                const dueDateString = task.dueDateRaw.split('T')[0]; // Gets "2025-08-04"
                const localDueDate = new Date(dueDateString + 'T00:00:00'); // Creates local midnight
                const today = startOfDay(new Date());
                const dueDay = startOfDay(localDueDate);

                if (dueDay.getTime() === today.getTime()) urgencyScore += 100;
              }

              return urgencyScore;
            };

            return getTaskUrgency(b) - getTaskUrgency(a); // Higher urgency first
          });

          // Take only the top 3 most urgent tasks for "Today's Tasks"
          const topUrgentTasks = sortedByUrgency.slice(0, 3);



          const enriched = topUrgentTasks.map((task: FreelancerTask) => {
            // Find project info to get organizationId
            const projectInfo = projectsData.find((p: any) => p.projectId === task.projectId);

            // Find organization to get logo (same approach as task-column.tsx)
            const organization = organizationsData.find((org: any) => org.id === projectInfo?.organizationId);
            const calculatedProjectLogo = organization?.logo || '/logos/fallback-logo.png';

            const enrichedTask = {
              ...task,
              notes: notes.taskIds.includes(task.id) ? 1 : 0,
              columnId: 'todo' as const, // Tasks in "Today's Tasks" panel should always be treated as 'todo' for submission
              // Override projectLogo with calculated value (same as task-column approach)
              projectLogo: calculatedProjectLogo,
              projectTags: projectInfo?.typeTags || task.projectTags || []
            };



            return enrichedTask;
          });

          // Calculate counts for freelancer view
          const totalCountAll = enriched.length;
          const totalCountImportant = enriched.filter((t: FreelancerTask) => t.important).length;
          const totalCountNotes = enriched.filter((t: FreelancerTask) => t.notes > 0).length;

          setTasks(enriched);
          setTaskCounts({
            all: totalCountAll,
            important: totalCountImportant,
            notes: totalCountNotes
          });
        } else {
          // Commissioner - fetch real data and filter by commissioner's organization
          if (!session?.user?.id) {
            console.log('No commissioner ID found in session');
            setTasks([]);
            return;
          }

          const [projectTasksRes, projectsRes, organizationsRes] = await Promise.all([
            fetch('/api/project-tasks'),
            fetch('/api/projects'),
            fetch('/api/organizations')
          ]);

          if (projectTasksRes.ok && projectsRes.ok && organizationsRes.ok) {
            const projectTasksData = await projectTasksRes.json();
            const projectsData = await projectsRes.json();
            const organizationsData = await organizationsRes.json();

            const currentCommissionerId = parseInt(session.user.id);

            // Find the organization where this commissioner is the contact person
            const commissionerOrg = organizationsData.find((org: any) => org.contactPersonId === currentCommissionerId);

            if (!commissionerOrg) {
              console.log(`No organization found for commissioner ${currentCommissionerId}`);
              setTasks([]);
              return;
            }

            console.log(`📋 Commissioner ${currentCommissionerId} accessing tasks for organization ${commissionerOrg.id} (${commissionerOrg.name})`);

            // Filter projects for this commissioner's organization
            const orgProjects = projectsData.filter((project: any) =>
              project.organizationId === commissionerOrg.id
            );

            // Extract all tasks that are "In review" from ongoing projects only
            const reviewTasks: CommissionerTask[] = [];

            projectTasksData.forEach((project: any) => {
              // Only include projects from this commissioner's organization
              const projectInfo = orgProjects.find((p: any) => p.projectId === project.projectId);

              // Only include tasks from ongoing projects (not Completed or Paused)
              if (projectInfo && !['Completed', 'Paused'].includes(projectInfo.status)) {
                project.tasks?.forEach((task: any) => {
                  if (task.status === 'In review') {
                    const hasBeenReviewed = task.feedbackCount > 0 || task.rejected;

                    reviewTasks.push({
                      id: task.id,
                      title: task.title,
                      status: task.status,
                      important: !hasBeenReviewed, // Important = NOT yet reviewed (awaiting first review)
                      projectId: project.projectId,
                      projectTitle: project.title,
                      freelancer: 'Freelancer', // Simplified for preview panel
                      taskDescription: task.description || '',
                      submittedDate: '',
                      version: task.version || 1, // Add version number
                      reviewed: hasBeenReviewed // Has been reviewed/responded to
                    });
                  }
                });
              }
            });

            // Calculate counts before capping for preview
            const totalCountAll = reviewTasks.length;
            const totalCountImportant = reviewTasks.filter((t) => t.important).length;

            // Cap at 5 items for preview
            setTasks(reviewTasks.slice(0, 5));

            // Store the full counts for display
            setTaskCounts({
              all: totalCountAll,
              important: totalCountImportant,
              notes: 0 // Commissioner view doesn't have notes
            });
          }
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [viewType, session?.user?.id]);

  // Calculate counts - use stored counts (calculated before slicing for preview)
  const countAll = taskCounts?.all ?? tasks.length;
  const countImportant = taskCounts?.important ?? tasks.filter((t) => t.important).length;
  const countNotes = taskCounts?.notes ?? (viewType === 'freelancer'
    ? tasks.filter((t) => (t as FreelancerTask).notes > 0).length
    : 0);

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    switch (activeTab) {
      case 'Important':
        return task.important;
      case 'Notes':
        return viewType === 'freelancer' && (task as FreelancerTask).notes > 0;
      default:
        return true;
    }
  });

  const displayedTasks = viewType === 'freelancer' ? filteredTasks.slice(0, 5) : filteredTasks;

  // Convert CommissionerTask to TaskToReview format for modal
  const convertToTaskToReview = async (commissionerTask: CommissionerTask, currentCommissionerId: number): Promise<TaskToReview | null> => {
    try {
      // Fetch additional data needed for the modal
      const [projectTasksRes, projectsRes, organizationsRes, usersRes] = await Promise.all([
        fetch('/api/project-tasks'),
        fetch('/api/projects'),
        fetch('/api/organizations'),
        fetch('/api/users')
      ]);

      if (projectTasksRes.ok && projectsRes.ok && organizationsRes.ok && usersRes.ok) {
        const projectTasksData = await projectTasksRes.json();
        const projectsData = await projectsRes.json();
        const organizationsData = await organizationsRes.json();
        const usersData = await usersRes.json();

        // Find the project and task details
        const projectData = projectTasksData.find((p: any) => p.projectId === commissionerTask.projectId);
        const projectInfo = projectsData.find((p: any) => p.projectId === commissionerTask.projectId);
        const organization = organizationsData.find((org: any) => org.id === projectInfo?.organizationId);

        // SECURITY CHECK: Verify this commissioner has access to this organization
        if (!organization || organization.contactPersonId !== currentCommissionerId) {
          console.error(`🚫 Access denied: Commissioner ${currentCommissionerId} attempted to access task from organization ${organization?.id} (${organization?.name})`);
          return null;
        }

        if (projectData && projectInfo) {
          const taskDetail = projectData.tasks?.find((t: any) => (t.taskId || t.id) === commissionerTask.id);
          const freelancer = usersData.find((u: any) => u.id === projectInfo.freelancerId);

          if (taskDetail && freelancer) {
            const taskId = taskDetail.taskId || taskDetail.id || commissionerTask.id;
            return {
              id: taskId,
              title: commissionerTask.title,
              projectId: commissionerTask.projectId,
              projectTitle: commissionerTask.projectTitle,
              submittedDate: taskDetail.submittedDate || taskDetail.dueDate || new Date().toISOString(),
              freelancer: {
                id: freelancer.id,
                name: freelancer.name,
                avatar: freelancer.avatar || '/default-avatar.png'
              },
              version: commissionerTask.version || 1,
              description: taskDetail.description || '',
              link: taskDetail.link || '',
              briefUrl: taskDetail.briefUrl,
              workingFileUrl: taskDetail.workingFileUrl,
              projectLogo: organization?.logo || '/logos/default-org.png',
              projectTags: projectInfo.typeTags || [],
              taskIndex: taskDetail.order || 1,
              totalTasks: projectData.tasks?.length || 1
            };
          }
        }
      }
    } catch (error) {
      console.error('Error converting task for review:', error);
    }
    return null;
  };

  // Handle commissioner task click
  const handleCommissionerTaskClick = async (task: CommissionerTask) => {
    if (!session?.user?.id) {
      console.error('No commissioner ID found in session');
      return;
    }

    const currentCommissionerId = parseInt(session.user.id);
    const taskToReview = await convertToTaskToReview(task, currentCommissionerId);
    if (taskToReview) {
      setSelectedTaskForReview(taskToReview);
    }
  };

  // Handle modal close
  const handleCloseReviewModal = () => {
    setSelectedTaskForReview(null);
  };

  // Handle task reviewed (refresh tasks)
  const handleTaskReviewed = () => {
    setSelectedTaskForReview(null);
    setLoading(true);
    // Trigger a re-fetch by updating the loading state
    setTimeout(() => {
      window.location.reload(); // Simple refresh for now
    }, 500);
  };

  const getViewAllLink = () => {
    if (viewType === 'freelancer') {
      return '/freelancer-dashboard/projects-and-invoices/task-board';
    } else {
      return '/commissioner-dashboard/projects-and-invoices/tasks-to-review';
    }
  };

  // Get project IDs for Notes tab (freelancer only)
  const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));

  // Get enriched task for modal (freelancer only)
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  let enrichedTask = null;
  if (activeTask && viewType === 'freelancer') {
    // Properly enrich with project and organization data
    const projectInfo = projects.find((p: any) => p.projectId === activeTask.projectId);
    const organization = organizations.find((org: any) => org.id === projectInfo?.organizationId);
    const calculatedProjectLogo = organization?.logo || '/logos/fallback-logo.png';

    enrichedTask = {
      ...activeTask,
      projectTags: projectInfo?.typeTags || [],
      projectLogo: calculatedProjectLogo,
      projectTitle: projectInfo?.title || 'Unknown Project',
      taskDescription: activeTask.taskDescription || 'No description provided for this task.',
    };


  }

  if (loading) {
    return (
      <div className={clsx("bg-white rounded-xl shadow-sm p-4 sm:p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("bg-white rounded-xl shadow-sm p-4 sm:p-6", className)}>
      {/* Header and Tabs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {title}
        </h2>

        {/* Tabs - Unified style for both view types */}
        <div className="flex items-end border-b mb-4">
          {tabs.map((tab) => {
            let pillCount = '00';
            if (tab === 'All') pillCount = countAll.toString().padStart(2, '0');
            if (tab === 'Important') pillCount = countImportant.toString().padStart(2, '0');
            if (tab === 'Notes') pillCount = countNotes.toString().padStart(2, '0');

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex items-center gap-2 pb-2 border-b-2 mr-6 text-sm font-medium',
                  activeTab === tab
                    ? 'text-black border-pink-500'
                    : 'text-gray-600 border-transparent hover:text-black'
                )}
              >
                {tab}
                <span
                  className="inline-block text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      tab === 'All'
                        ? 'rgba(235, 25, 102, 0.1)'
                        : 'rgba(220, 220, 220, 0.5)',
                  }}
                >
                  {pillCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div className={clsx("overflow-y-auto", maxHeight)}>
          <AnimatePresence mode="wait">
            {activeTab === 'Notes' && viewType === 'freelancer' ? (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <NotesTab
                  projectIds={projectIds}
                  onExpand={(projectId: number) => setExpandedProject(projectId)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Unified task list style for both view types */}
                <ul className="flex flex-col gap-y-2">
                  {displayedTasks.map((task, index) => (
                    <li
                      key={`${task.id || `task-${index}`}-${task.projectId}-${viewType}`}
                      className="flex justify-between items-center text-sm cursor-pointer"
                      onClick={() => {
                        if (viewType === 'freelancer') {
                          setActiveTaskId(task.id);
                        } else {
                          handleCommissionerTaskClick(task as CommissionerTask);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'w-5 h-5 rounded-full border flex items-center justify-center',
                            viewType === 'commissioner'
                              ? (task as CommissionerTask).reviewed
                                ? 'bg-pink-500 text-white border-pink-500'
                                : 'border-gray-400'
                              : ['Approved', 'In review'].includes(task.status)
                                ? 'bg-pink-500 text-white border-pink-500'
                                : 'border-gray-400'
                          )}
                        >
                          {((viewType === 'commissioner' && (task as CommissionerTask).reviewed) ||
                            (viewType === 'freelancer' && ['Approved', 'In review'].includes(task.status))) && (
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M5 10l3 3 7-7" />
                            </svg>
                          )}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium">{task.title}</span>
                        </div>
                        {task.important && (
                          <span className="text-red-500 text-sm">★</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            viewType === 'commissioner'
                              ? 'bg-gray-100 text-gray-700' // Show version for commissioner
                              : statusColors[task.status] // Show status for freelancer
                          )}
                        >
                          {viewType === 'commissioner'
                            ? `v${(task as CommissionerTask).version || 1}`
                            : task.status
                          }
                        </span>

                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {displayedTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>{viewType === 'freelancer' ? 'No tasks found' : 'No tasks awaiting review'}</p>
          </div>
        )}
      </div>

      {/* View All CTA */}
      <div className="flex justify-end mt-6">
        <Link
          href={getViewAllLink()}
          className="text-sm px-4 py-2 rounded-full border text-gray-800 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          View All
        </Link>
      </div>

      {/* Expansion modal - freelancer only */}
      {viewType === 'freelancer' && (
        <AnimatePresence>
          {expandedProject !== null && (
            <ProjectNotesExpansion
              projectId={expandedProject}
              onClose={() => setExpandedProject(null)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Task Details Modal - freelancer only */}
      {viewType === 'freelancer' && enrichedTask && (
        <TaskDetailsModal
          isOpen={true}
          onClose={() => setActiveTaskId(null)}
          projectLogo={(enrichedTask as FreelancerTask).projectLogo || '/logos/fallback-logo.png'}
          projectTitle={enrichedTask.projectTitle}
          projectTags={(enrichedTask as FreelancerTask).projectTags || []}
          taskIndex={(enrichedTask as FreelancerTask).taskIndex || 1}
          totalTasks={(enrichedTask as FreelancerTask).totalTasks || 1}
          taskTitle={enrichedTask.title}
          taskDescription={enrichedTask.taskDescription}
          briefUrl={(enrichedTask as FreelancerTask).briefUrl}
          workingFileUrl={(enrichedTask as FreelancerTask).workingFileUrl}
          columnId={(enrichedTask as FreelancerTask).columnId}
          status={enrichedTask.status as any}
          projectId={enrichedTask.projectId}
          taskId={enrichedTask.id}
          onTaskSubmitted={() => {
            // Close modal and refresh tasks
            setActiveTaskId(null);
          }}
        />
      )}

      {/* Task Review Modal - commissioner only */}
      {viewType === 'commissioner' && selectedTaskForReview && (
        <TaskReviewModal
          isOpen={true}
          onClose={handleCloseReviewModal}
          task={selectedTaskForReview}
          onTaskReviewed={handleTaskReviewed}
        />
      )}
    </div>
  );
}
