'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { NotesTab } from '../freelancer-dashboard/notes-tab';
import ProjectNotesExpansion from '../freelancer-dashboard/project-notes-expansion';
import TaskDetailsModal from '../freelancer-dashboard/projects-and-invoices/projects/task-details-modal';

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
};

export type CommissionerTask = BaseTask & {
  freelancer: string;
  submittedDate: string;
  version?: number;
  reviewed?: boolean;
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
  
  // Dynamic tabs based on view type
  const tabs = showNotesTab && viewType === 'freelancer' 
    ? ['All', 'Important', 'Notes'] as const
    : ['All', 'Important'] as const;
  
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        if (viewType === 'freelancer') {
          if (!session?.user?.id) return;

          const [taskRes, notesRes, projectsRes] = await Promise.all([
            fetch(`/api/dashboard/tasks-summary?id=${session.user.id}`),
            fetch(`/api/dashboard/project-notes/count?userId=${session.user.id}`),
            fetch('/api/projects')
          ]);

          const taskData = await taskRes.json();
          const notes = await notesRes.json();
          const projectsData = await projectsRes.json();

          // Filter out tasks from completed or paused projects
          const filteredTasks = taskData.filter((task: FreelancerTask) => {
            const projectInfo = projectsData.find((p: any) => p.projectId === task.projectId);
            return projectInfo && !['Completed', 'Paused'].includes(projectInfo.status);
          });

          const enriched = filteredTasks.map((task: FreelancerTask) => ({
            ...task,
            notes: notes.taskIds.includes(task.id) ? 1 : 0,
          }));

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
          const [projectTasksRes, projectsRes, organizationsRes] = await Promise.all([
            fetch('/api/project-tasks'),
            fetch('/api/projects'),
            fetch('/api/organizations')
          ]);

          if (projectTasksRes.ok && projectsRes.ok && organizationsRes.ok) {
            const projectTasksData = await projectTasksRes.json();
            const projectsData = await projectsRes.json();
            const organizationsData = await organizationsRes.json();

            // For demo purposes, use organization 1 (Lagos Parks Services)
            // In production, this would use session?.user?.id to find the correct organization
            const commissionerOrg = organizationsData.find((org: any) => org.id === 1);

            if (!commissionerOrg) {
              console.log('No organization found for commissioner');
              setTasks([]);
              return;
            }

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

  const getViewAllLink = () => {
    if (viewType === 'freelancer') {
      return '/freelancer-dashboard/projects-and-invoices/task-board';
    } else {
      return '/commissioner-dashboard/tasks';
    }
  };

  // Get project IDs for Notes tab (freelancer only)
  const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));

  // Get enriched task for modal (freelancer only)
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  let enrichedTask = null;
  if (activeTask && viewType === 'freelancer') {
    // This would need to be enriched with project data - simplified for now
    enrichedTask = {
      ...activeTask,
      projectTags: [],
      projectLogo: '',
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
                  {displayedTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex justify-between items-center text-sm cursor-pointer"
                      onClick={() => viewType === 'freelancer' ? setActiveTaskId(task.id) : null}
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
                        {viewType === 'commissioner' && (
                          <Link
                            href={`/commissioner-dashboard/projects/${task.projectId}/tasks/${task.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded"
                          >
                            Review
                          </Link>
                        )}
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
          projectLogo={(enrichedTask as FreelancerTask).projectLogo || ''}
          projectTitle={enrichedTask.projectTitle}
          projectTags={(enrichedTask as FreelancerTask).projectTags || []}
          taskIndex={1}
          totalTasks={1}
          taskTitle={enrichedTask.title}
          taskDescription={enrichedTask.taskDescription}
          briefUrl={(enrichedTask as FreelancerTask).briefUrl}
          workingFileUrl={(enrichedTask as FreelancerTask).workingFileUrl}
          columnId={(enrichedTask as FreelancerTask).columnId}
          status={enrichedTask.status as any}
          projectId={enrichedTask.projectId}
          taskId={enrichedTask.id}
        />
      )}
    </div>
  );
}
