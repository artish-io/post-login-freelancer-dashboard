import { isToday, parseISO, startOfDay } from 'date-fns';

export type TaskSubmissionRule = {
  canSubmit: boolean;
  reason?: string;
};

export type Task = {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  dueDate: string;
  rejected?: boolean;
  feedbackCount?: number;
  pushedBack?: boolean;
};

export type Project = {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
  tasks: Task[];
};

/**
 * Check if a task can be submitted based on business rules
 */
export async function checkTaskSubmissionRules(
  taskId: number,
  projectId: number,
  columnId: 'todo' | 'upcoming' | 'review'
): Promise<TaskSubmissionRule> {
  try {
    // Check if project is paused first
    try {
      const projectsRes = await fetch('/api/projects');
      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        const currentProject = projects.find((p: any) => p.projectId === projectId);

        if (currentProject?.status?.toLowerCase() === 'paused') {
          return {
            canSubmit: false,
            reason: 'This project is paused. Contact project commissioner for more information.'
          };
        }
      }
    } catch (error) {
      console.warn('Could not check project status, proceeding with normal rules');
    }

    // Rule 1: Tasks in "Today" column can always be submitted
    if (columnId === 'todo') {
      return { canSubmit: true };
    }

    // Rule 2: Review column submissions are always allowed (resubmissions)
    if (columnId === 'review') {
      return { canSubmit: true };
    }

    // Rule 3: Upcoming tasks cannot be submitted directly
    if (columnId === 'upcoming') {
      return {
        canSubmit: false,
        reason: "Tasks in the 'Upcoming This Week' column cannot be submitted. Please wait until they move to 'Today's Tasks'."
      };
    }

    return { canSubmit: false, reason: 'Invalid column for task submission.' };
  } catch (error) {
    console.error('Error checking task submission rules:', error);
    return { canSubmit: false, reason: 'Unable to verify submission rules. Please try again.' };
  }
}

/**
 * Count urgent tasks in today's column
 */
function countTodayUrgentTasks(projects: Project[]): number {
  let count = 0;
  const today = startOfDay(new Date());

  projects.forEach(project => {
    project.tasks.forEach(task => {
      if (task.completed || task.status === 'In review') return;

      // Handle timezone by extracting date part and creating local date
      const dueDateString = task.dueDate.split('T')[0];
      const localDueDate = new Date(dueDateString + 'T00:00:00');
      const dueDay = startOfDay(localDueDate);
      const isTaskToday = dueDay.getTime() === today.getTime();

      // Count as urgent if it's due today and has priority indicators
      const isUrgent = isTaskToday && (
        task.rejected ||
        task.pushedBack ||
        (task.feedbackCount && task.feedbackCount > 0)
      );

      if (isUrgent) {
        count++;
      }
    });
  });

  return count;
}

/**
 * Check if freelancer has active deadlines
 */
async function checkFreelancerActiveDeadlines(projects: Project[]): Promise<boolean> {
  // Check if there are any incomplete tasks with upcoming deadlines
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  for (const project of projects) {
    for (const task of project.tasks) {
      if (!task.completed && task.status !== 'In review') {
        const dueDate = parseISO(task.dueDate);
        if (dueDate >= today && dueDate <= nextWeek) {
          return true; // Has active deadlines
        }
      }
    }
  }

  return false;
}

/**
 * Get current task counts for display
 */
export async function getTaskCounts(): Promise<{
  todayUrgent: number;
  todayTotal: number;
  upcoming: number;
  review: number;
}> {
  try {
    // Use absolute URL for client-side fetch
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const projectsRes = await fetch(`${baseUrl}/api/project-tasks`);
    if (!projectsRes.ok) {
      throw new Error('Failed to fetch project data');
    }

    const projects: Project[] = await projectsRes.json();
    
    let todayUrgent = 0;
    let todayTotal = 0;
    let upcoming = 0;
    let review = 0;

    const today = startOfDay(new Date());

    projects.forEach(project => {
      project.tasks.forEach(task => {
        if (task.completed) return;

        // Handle timezone by extracting date part and creating local date
        const dueDateString = task.dueDate.split('T')[0];
        const localDueDate = new Date(dueDateString + 'T00:00:00');
        const dueDay = startOfDay(localDueDate);
        const isTaskToday = dueDay.getTime() === today.getTime();

        if (task.status === 'In review') {
          review++;
        } else if (isTaskToday) {
          todayTotal++;
          const isUrgent = task.rejected || task.pushedBack || (task.feedbackCount && task.feedbackCount > 0);
          if (isUrgent) {
            todayUrgent++;
          }
        } else if (localDueDate > new Date()) {
          upcoming++;
        }
      });
    });

    return { todayUrgent, todayTotal, upcoming, review };
  } catch (error) {
    console.error('Error getting task counts:', error);
    return { todayUrgent: 0, todayTotal: 0, upcoming: 0, review: 0 };
  }
}
