'use client';

import { useEffect, useState, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { useSession } from 'next-auth/react';
import TaskCard from './task-card';
import { getTaskCounts } from '@/lib/task-submission-rules';
import { checkAndExecuteAutoMovement } from '@/lib/auto-task-movement';
import { isThisWeek, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { requireFreelancerSession, isValidFreelancerTask } from '@/lib/freelancer-access-control';

type Props = {
  columnId: 'todo' | 'upcoming' | 'review';
  title: string;
};

type Project = {
  projectId: number;
  title?: string;
  organizationId?: number;
  typeTags?: string[];
  tasks: {
    id: number;
    title: string;
    description?: string; // ← Add this line
    status: string;
    completed: boolean;
    order: number;
    link: string;
    dueDate?: string; // Make optional to match schema
    rejected: boolean;
    feedbackCount: number;
    pushedBack: boolean;
    briefUrl?: string;
    workingFileUrl?: string;
  }[];
};

type Organization = {
  id: number;
  name: string;
  logo: string;
};

export default function TaskColumn({ columnId, title }: Props) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projectsInfo, setProjectsInfo] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const recentlySubmittedTasks = useRef(new Set<string>());
  const [taskCounts, setTaskCounts] = useState({
    todayUrgent: 0,
    todayTotal: 0,
    upcoming: 0,
    review: 0
  });

  // Ensure user is a freelancer before rendering
  const freelancerSession = requireFreelancerSession(session?.user as any);
  if (!freelancerSession) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="text-red-600 font-medium text-center">
          Access denied: Freelancer authentication required
        </div>
      </div>
    );
  }

  // Helper function to check if a project is paused
  const isProjectPaused = (projectId: number): boolean => {
    if (!projectsInfo || projectsInfo.length === 0) return false;
    const projectInfo = projectsInfo.find(p => p.projectId === projectId);
    return projectInfo?.status?.toLowerCase() === 'paused';
  };

  // Optimistic update function for smooth task transitions
  const handleOptimisticTaskUpdate = (projectId: number, taskId: number, newStatus: string) => {
    const taskKey = `${projectId}-${taskId}`;

    setTasks(currentTasks => {
      // Remove the task from current column if it's moving to review
      if (newStatus === 'In review' && columnId !== 'review') {
        // Track this task as recently submitted to prevent race conditions
        recentlySubmittedTasks.current.add(taskKey);

        // Remove from tracking after 10 seconds (enough time for API call and refresh)
        setTimeout(() => {
          recentlySubmittedTasks.current.delete(taskKey);
        }, 10000);

        console.log(`🚀 Optimistically removing task ${taskId} from ${columnId} column (moving to review)`);
        return currentTasks.filter(task => !(task.projectId === projectId && task.taskId === taskId));
      }
      return currentTasks;
    });

    // Note: Removed delayed refresh to prevent potential infinite loops
    // The scheduled refresh will sync with server state
  };

  // Fetch data dynamically
  const fetchData = async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log(`⏳ Fetch already in progress for column: ${columnId}`);
      return;
    }

    try {
      fetchingRef.current = true;
      const [projectsRes, orgsRes, projectInfoRes] = await Promise.all([
        fetch('/api/project-tasks'),
        fetch('/api/organizations'),
        fetch('/api/projects')
      ]);

      if (projectsRes.ok && orgsRes.ok) {
        const projectsData = await projectsRes.json();
        const orgsData = await orgsRes.json();

        // Fetch project status info for paused project filtering
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

        setProjects(projectsData);
        setOrganizations(orgsData);
        setProjectsInfo(projectInfoData);

        // Skip auto-movement during fetchData to prevent race conditions and resets
        // Auto-movement will be handled by the scheduled interval instead
        console.log(`✅ Data fetched successfully for ${columnId} column`);

        // Log task counts for debugging
        if (columnId === 'review') {
          const reviewTasks = projectsData.flatMap((p: any) =>
            p.tasks?.filter((t: any) => t.status === 'In review' && !t.completed) || []
          );
          console.log(`📊 Found ${reviewTasks.length} tasks in review status:`,
            reviewTasks.map((t: any) => ({ title: t.title, status: t.status, completed: t.completed }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Note: Fallback removed due to migration to hierarchical storage
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimized refresh mechanism - much less aggressive polling to prevent resets
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if not currently fetching and no recent submissions
      if (!fetchingRef.current) {
        console.log(`🔄 Scheduled refresh for ${columnId} column`);
        fetchData();
      }
    }, 30000); // Increased to 30 seconds to prevent overwriting recent submissions

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enhanced auto-movement trigger - check much less frequently to prevent resets
  useEffect(() => {
    if (columnId === 'todo') {
      const checkMovement = async () => {
        try {
          // Only check auto-movement if not currently fetching
          if (!fetchingRef.current) {
            const result = await checkAndExecuteAutoMovement();
            if (result.moved) {
              console.log('🔄 Scheduled auto-movement:', result.message);
              // Trigger immediate refresh only if tasks were actually moved
              fetchData();
            }
          }
        } catch (error) {
          console.error('Error in scheduled auto-movement:', error);
        }
      };

      // Reduced frequency to 60 seconds to prevent interfering with submissions
      const movementInterval = setInterval(checkMovement, 60000);
      return () => clearInterval(movementInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnId]);

  useEffect(() => {
    if (projects.length === 0 || organizations.length === 0) return;

    const collected: any[] = [];

    // Update task counts for submission rules
    getTaskCounts().then(setTaskCounts).catch(console.error);

    projects.forEach((project) => {
      const org = organizations.find(
        (o) => o.id === project.organizationId
      );

      const projectLogo = org?.logo || '/logos/fallback-logo.png';

      project.tasks.forEach((task, index) => {
        // Security check: Ensure this task belongs to the current freelancer
        const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
        if (!isValidFreelancerTask({
          project: {
            freelancerId: projectInfo?.freelancerId,
            assignedFreelancerId: projectInfo?.assignedFreelancerId
          }
        }, freelancerSession)) {
          console.warn(`🚫 Task ${task.id} filtered out - not assigned to current freelancer`);
          return; // Skip this task
        }

        // Extract just the date part from the UTC string and create a local date
        // Handle cases where dueDate might be undefined
        if (!task.dueDate) {
          console.warn(`Task ${task.id} has no dueDate, skipping date-based filtering`);
          return; // Skip tasks without due dates
        }

        const dueDateString = task.dueDate.split('T')[0]; // Gets "2025-07-05"
        const localDueDate = new Date(dueDateString + 'T00:00:00'); // Creates local midnight

        const today = startOfDay(new Date());
        const dueDay = startOfDay(localDueDate);

        // More precise date comparisons using local dates
        const isDueToday = dueDay.getTime() === today.getTime();
        const isDueThisWeek = isThisWeek(localDueDate, { weekStartsOn: 1 }) && !isDueToday;

        // Debug logging for upcoming column
        if (columnId === 'upcoming') {
          console.log(`Upcoming Column Debug - Task ${task.id}:`, {
            taskTitle: task.title,
            originalDueDate: task.dueDate,
            dueDateString: dueDateString,
            localDueDate: localDueDate,
            today: today,
            dueDay: dueDay,
            isDueToday,
            isDueThisWeek,
            completed: task.completed,
            status: task.status,
            shouldInclude: isDueThisWeek && !task.completed && task.status !== 'In review'
          });
        }

        // Business Logic: Proper task status filtering
        // Today's Tasks: Show ongoing tasks that are not paused
        // Upcoming: Show ongoing tasks (including paused project tasks)
        // Review: Show tasks that are submitted and awaiting review

        const isOngoingTask = task.status === 'Ongoing' && !task.completed;
        const isInReview = task.status === 'In review' && !task.completed;
        const isPaused = isProjectPaused(project.projectId);

        // Debug logging for review column to track missing tasks
        if (columnId === 'review') {
          console.log(`Review Column Debug - Task ${task.id}:`, {
            taskTitle: task.title,
            status: task.status,
            completed: task.completed,
            isInReview,
            shouldInclude: isInReview,
            projectTitle: project.title
          });
        }

        // Check if this task was recently submitted to prevent duplication
        const taskKey = `${project.projectId}-${task.id}`;
        const wasRecentlySubmitted = recentlySubmittedTasks.current.has(taskKey);

        // Paused project tasks should NEVER appear in today's column
        // They can only appear in upcoming column
        // Approved/completed tasks should not appear in any column
        // Recently submitted tasks should not appear in non-review columns
        const shouldInclude =
          (columnId === 'todo' && isOngoingTask && !isPaused && !wasRecentlySubmitted) ||
          (columnId === 'upcoming' && isOngoingTask && !wasRecentlySubmitted) ||
          (columnId === 'review' && isInReview);

        // Log exclusions for debugging
        if (columnId === 'todo' && isOngoingTask && isPaused) {
          console.log(`🚫 Excluding paused project task from today's column: ${task.title} (Project: ${project.title})`);
        }
        if (wasRecentlySubmitted && columnId !== 'review') {
          console.log(`🚫 Excluding recently submitted task from ${columnId} column: ${task.title} (preventing duplication)`);
        }

        if (!shouldInclude) return;

        let tag = (project.typeTags && project.typeTags.length > 0) ? project.typeTags[0] : 'General';
        if (task.completed) tag = 'Completed';
        else if (task.rejected) tag = 'Rejected';
        else if (task.feedbackCount > 0) tag = `Feedback ×${task.feedbackCount}`;
        else if (task.pushedBack) tag = 'Delayed';

        const cardData = {
          taskIndex: index + 1,
          totalTasks: project.tasks.length,
          taskTitle: task.title,
          description: task.description || '',
          avatarUrl: '',
          projectTitle: project.title,
          projectLogo,
          projectTags: project.typeTags,
          briefUrl: task.briefUrl,
          workingFileUrl: task.workingFileUrl,
          tag,
          columnId,
          projectId: project.projectId,
          taskId: task.id,
          status: task.status,
          completed: task.completed,
        };

        collected.push(cardData);
      });
    });

    // Handle task distribution between 'todo' and 'upcoming' columns
    if (columnId === 'todo') {
      // Sort tasks by priority (urgent first, then by due date)
      const sortedTasks = collected.sort((a, b) => {
        const aIsUrgent = a.tag === 'Rejected' || a.tag === 'Delayed' || a.tag.includes('Feedback');
        const bIsUrgent = b.tag === 'Rejected' || b.tag === 'Delayed' || b.tag.includes('Feedback');

        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
        return 0; // Keep original order for same priority
      });

      // Limit to maximum 3 tasks for Today's Tasks column
      const limitedTasks = sortedTasks.slice(0, 3);
      setTasks(limitedTasks);
    } else if (columnId === 'upcoming') {
      // For upcoming column, get all incomplete tasks and show the overflow (4th, 5th, 6th, etc.)
      const allIncompleteTasks: any[] = [];

      projects.forEach((project) => {
        const org = organizations.find((o) => o.id === project.organizationId);
        const projectLogo = org?.logo || '/logos/fallback-logo.png';

        project.tasks.forEach((task, index) => {
          // Security check: Ensure this task belongs to the current freelancer
          const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
          if (!isValidFreelancerTask({
            project: {
              freelancerId: projectInfo?.freelancerId,
              assignedFreelancerId: projectInfo?.assignedFreelancerId
            }
          }, freelancerSession)) {
            return; // Skip this task
          }

          // Only include ongoing tasks that are not completed or approved
          if (task.status === 'Ongoing' && !task.completed) {
            const isPaused = isProjectPaused(project.projectId);

            let tag = (project.typeTags && project.typeTags.length > 0) ? project.typeTags[0] : 'General';
            if (task.rejected) tag = 'Rejected';
            else if (task.feedbackCount > 0) tag = `Feedback ×${task.feedbackCount}`;
            else if (task.pushedBack) tag = 'Delayed';

            // Add paused indicator for paused project tasks
            if (isPaused) {
              tag = `${tag} (Paused Project)`;
            }

            allIncompleteTasks.push({
              taskIndex: index + 1,
              totalTasks: project.tasks.length,
              taskTitle: task.title,
              description: task.description || '',
              avatarUrl: '',
              projectTitle: project.title,
              projectLogo,
              projectTags: project.typeTags,
              briefUrl: task.briefUrl,
              workingFileUrl: task.workingFileUrl,
              tag,
              columnId: 'upcoming',
              projectId: project.projectId,
              taskId: task.id,
              status: task.status,
              completed: task.completed,
            });
          }
        });
      });

      // Sort all incomplete tasks by priority, but ensure paused project tasks don't take today's slots
      const sortedIncompleteTasks = allIncompleteTasks.sort((a, b) => {
        const aIsUrgent = a.tag === 'Rejected' || a.tag === 'Delayed' || a.tag.includes('Feedback');
        const bIsUrgent = b.tag === 'Rejected' || b.tag === 'Delayed' || b.tag.includes('Feedback');
        const aIsPaused = a.tag.includes('(Paused Project)');
        const bIsPaused = b.tag.includes('(Paused Project)');

        // Paused project tasks should never be in the first 3 positions (today's tasks)
        if (aIsPaused && !bIsPaused) return 1; // Move paused tasks to end
        if (!aIsPaused && bIsPaused) return -1; // Keep active tasks at start

        // For non-paused tasks, sort by urgency
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
        return 0;
      });

      // Get tasks that didn't make it into today's top 3 (overflow tasks) + all paused project tasks
      const overflowTasks = sortedIncompleteTasks.slice(3);
      setTasks(overflowTasks);
    } else {
      // No limits for 'review' column
      setTasks(collected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnId, projects, organizations]);

  return (
    <div className="flex flex-col w-[320px] xl:w-[360px] bg-pink-100 p-4 rounded-2xl shadow-sm shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {/* Submission Rules Indicator */}
          {columnId === 'todo' && (
            <div className="text-xs text-gray-600 mt-1">
              {taskCounts.todayUrgent >= 3 ? (
                <span className="text-red-600">⚠️ Max capacity (3/3 urgent)</span>
              ) : (
                <span className="text-green-600">✓ Can submit ({taskCounts.todayUrgent}/3 urgent)</span>
              )}
            </div>
          )}
          {columnId === 'upcoming' && (
            <div className="text-xs mt-1">
              <div className="text-gray-500 mb-1">🚫 Submissions disabled</div>
              <button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered for upcoming column');
                  fetchData();
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                🔄 Refresh Column
              </button>
            </div>
          )}

        </div>
        <button className="hover:opacity-80 transition" aria-label="More options">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>



      {/* Task list */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="h-[140px] bg-white rounded-xl border shadow-sm flex items-center justify-center text-sm text-gray-400"
            >
              Empty list
            </motion.div>
          ) : (
            tasks.map((task, index) => (
              <motion.div
                key={`${task.projectTitle}-${task.taskIndex}-${task.taskId}`}
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0.95
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  x: columnId === 'todo' ? 320 : columnId === 'upcoming' ? -320 : 0,
                  scale: 0.95
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                layout
              >
                <TaskCard
                  tag={task.tag}
                  title={task.taskTitle}
                  description={task.description}
                  avatarUrl={task.avatarUrl}
                  projectTitle={task.projectTitle}
                  projectLogo={task.projectLogo}
                  projectTags={task.projectTags}
                  taskIndex={task.taskIndex}
                  totalTasks={task.totalTasks}
                  briefUrl={task.briefUrl}
                  workingFileUrl={task.workingFileUrl}
                  columnId={columnId}
                  status={task.status as 'Ongoing' | 'In review' | 'Approved'}
                  projectId={task.projectId}
                  taskId={task.taskId}
                  completed={task.completed}
                  onTaskSubmitted={() => {
                    // Optimistic update for smooth transition
                    handleOptimisticTaskUpdate(task.projectId, task.taskId, 'In review');
                  }}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}