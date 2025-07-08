'use client';

import { useEffect, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import TaskCard from './task-card';
import { getTaskCounts } from '@/lib/task-submission-rules';
import { checkAndExecuteAutoMovement } from '@/lib/auto-task-movement';
import { isThisWeek, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  columnId: 'todo' | 'upcoming' | 'review';
  title: string;
};

type Project = {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
  tasks: {
    id: number;
    title: string;
    description?: string; // ← Add this line
    status: string;
    completed: boolean;
    order: number;
    link: string;
    dueDate: string;
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
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projectsInfo, setProjectsInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState({
    todayUrgent: 0,
    todayTotal: 0,
    upcoming: 0,
    review: 0
  });

  // Helper function to check if a project is paused
  const isProjectPaused = (projectId: number): boolean => {
    if (!projectsInfo || projectsInfo.length === 0) return false;
    const projectInfo = projectsInfo.find(p => p.projectId === projectId);
    return projectInfo?.status?.toLowerCase() === 'paused';
  };

  // Fetch data dynamically
  const fetchData = async () => {
    try {
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

        // Check for auto-movement after data refresh
        try {
          const result = await checkAndExecuteAutoMovement();
          if (result.moved) {
            console.log('🔄 Auto-movement after refresh:', result.message);
            // Refetch data to show the moved tasks
            setTimeout(() => {
              fetchData();
            }, 1000);
          }
        } catch (error) {
          console.error('Error in auto-movement during refresh:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to static imports if API fails
      import('../../../../data/project-tasks.json').then(data => setProjects(data.default));
      import('../../../../data/organizations.json').then(data => setOrganizations(data.default));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add refresh mechanism - refetch data every 2 seconds to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 2000); // Reduced to 2 seconds for faster task movement

    return () => clearInterval(interval);
  }, []);

  // Enhanced auto-movement trigger - check more frequently for today's column
  useEffect(() => {
    if (columnId === 'todo') {
      const checkMovement = async () => {
        try {
          const result = await checkAndExecuteAutoMovement();
          if (result.moved) {
            console.log('🔄 Scheduled auto-movement:', result.message);
            // Trigger immediate refresh
            fetchData();
          }
        } catch (error) {
          console.error('Error in scheduled auto-movement:', error);
        }
      };

      // Check for movement every 5 seconds for today's column
      const movementInterval = setInterval(checkMovement, 5000);
      return () => clearInterval(movementInterval);
    }
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
        // Extract just the date part from the UTC string and create a local date
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

        // Business Logic: All incomplete tasks are "today's work", regardless of due date
        // Today's Tasks: Show first 3 incomplete tasks
        // Upcoming: Show remaining incomplete tasks (overflow from today)
        // Review: Show all tasks in review

        const isIncompleteTask = !task.completed && task.status === 'Ongoing';
        const isInReview = task.status === 'In review';
        const isPaused = isProjectPaused(project.projectId);

        // Paused project tasks should NEVER appear in today's column
        // They can only appear in upcoming column
        const shouldInclude =
          (columnId === 'todo' && isIncompleteTask && !isPaused) ||
          (columnId === 'upcoming' && isIncompleteTask) ||
          (columnId === 'review' && isInReview);

        // Log paused project task exclusion from today's column
        if (columnId === 'todo' && isIncompleteTask && isPaused) {
          console.log(`🚫 Excluding paused project task from today's column: ${task.title} (Project: ${project.title})`);
        }

        if (!shouldInclude) return;

        let tag = project.typeTags[0] ?? 'General';
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
          // Only include incomplete tasks (regardless of due date)
          if (!task.completed && task.status === 'Ongoing') {
            const isPaused = isProjectPaused(project.projectId);

            let tag = project.typeTags[0] ?? 'General';
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
                  onTaskSubmitted={fetchData}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}