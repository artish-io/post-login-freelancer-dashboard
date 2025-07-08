/**
 * Auto Task Movement System
 * Automatically moves tasks from "Upcoming This Week" to "Today's Tasks" 
 * when today's urgent task count drops below 3
 */

import { startOfDay } from 'date-fns';

export type TaskMovementResult = {
  moved: boolean;
  movedTasks: any[];
  message: string;
  newTodayCount: number;
  newUpcomingCount: number;
};

/**
 * Check if auto-movement is needed and execute it
 */
export async function checkAndExecuteAutoMovement(): Promise<TaskMovementResult> {
  try {
    // Fetch current project data and project status information
    const [projectTasksRes, projectsRes] = await Promise.all([
      fetch('/api/project-tasks'),
      fetch('/api/projects')
    ]);

    if (!projectTasksRes.ok) {
      throw new Error('Failed to fetch project-tasks data');
    }

    const projects = await projectTasksRes.json();
    let projectsInfo: any[] = [];

    // Handle projects.json API failure gracefully
    if (projectsRes.ok) {
      try {
        projectsInfo = await projectsRes.json();
        console.log('✅ Successfully fetched project status information');
      } catch (error) {
        console.warn('⚠️ Failed to parse projects.json, proceeding without project status info:', error);
        projectsInfo = [];
      }
    } else {
      console.warn('⚠️ Failed to fetch projects.json, proceeding without project status info. Status:', projectsRes.status);
      projectsInfo = [];
    }
    
    // Count current urgent tasks in today's column (excluding paused projects)
    const todayUrgentCount = countTodayUrgentTasks(projects, projectsInfo);
    const todayTotalCount = countTodayTasks(projects, projectsInfo);
    const upcomingCount = countUpcomingTasks(projects, projectsInfo);

    console.log('🔍 Auto-movement check:', {
      todayUrgentCount,
      todayTotalCount,
      upcomingCount,
      needsMovement: todayUrgentCount < 3
    });

    // Strategy: Maintain optimal task distribution
    // Priority 1: If today is empty, always move at least 1 task
    // Priority 2: If today has < 3 tasks, try to fill it up

    let shouldMove = false;
    let maxToMove = 0;
    let reason = '';

    if (todayTotalCount === 0) {
      // Today is empty - always move at least 1 task
      shouldMove = true;
      maxToMove = Math.min(3, upcomingCount);
      reason = 'Today\'s column is empty';
    } else if (todayTotalCount < 3) {
      // Today has space - try to fill it
      shouldMove = true;
      maxToMove = 3 - todayTotalCount;
      reason = `Today has space for ${maxToMove} more tasks`;
    }

    if (!shouldMove) {
      return {
        moved: false,
        movedTasks: [],
        message: `No movement needed. Today's column is at capacity (${todayTotalCount}/3 tasks).`,
        newTodayCount: todayTotalCount,
        newUpcomingCount: upcomingCount
      };
    }

    // Find tasks from upcoming that can be moved to today (excluding paused projects)
    const tasksToMove = findTasksToMove(projects, maxToMove, projectsInfo);

    console.log('📋 Tasks available to move:', tasksToMove.map(t => ({
      id: t.id,
      title: t.title,
      isUrgent: t.isUrgent,
      dueDate: t.dueDate
    })));

    if (tasksToMove.length === 0) {
      return {
        moved: false,
        movedTasks: [],
        message: `No suitable tasks found in upcoming to move to today. Need ${maxToMove} more tasks to reach capacity.`,
        newTodayCount: countTodayTasks(projects),
        newUpcomingCount: countUpcomingTasks(projects)
      };
    }
    
    // Execute the movement by updating due dates
    const moveResult = await moveTasksToToday(tasksToMove);
    
    if (moveResult.success) {
      return {
        moved: true,
        movedTasks: tasksToMove,
        message: `✅ Moved ${tasksToMove.length} task(s) from upcoming to today. Reason: ${reason}`,
        newTodayCount: moveResult.newTodayCount,
        newUpcomingCount: moveResult.newUpcomingCount
      };
    } else {
      return {
        moved: false,
        movedTasks: [],
        message: `❌ Failed to move tasks: ${moveResult.error}`,
        newTodayCount: countTodayTasks(projects),
        newUpcomingCount: countUpcomingTasks(projects)
      };
    }
    
  } catch (error) {
    console.error('Error in auto task movement:', error);
    return {
      moved: false,
      movedTasks: [],
      message: `Error: ${error}`,
      newTodayCount: 0,
      newUpcomingCount: 0
    };
  }
}

/**
 * Count urgent tasks due today
 */
function countTodayUrgentTasks(projects: any[], projectsInfo: any[]): number {
  let count = 0;
  const today = startOfDay(new Date());

  projects.forEach(project => {
    // Check if project is paused (only if projectsInfo is available)
    if (projectsInfo && projectsInfo.length > 0) {
      const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
      const isProjectPaused = projectInfo?.status?.toLowerCase() === 'paused';

      if (isProjectPaused) {
        console.log(`🚫 Skipping paused project: ${project.title} (ID: ${project.projectId})`);
        return; // Skip paused projects
      }
    }

    project.tasks.forEach((task: any) => {
      if (task.completed || task.status === 'In review') return;

      const dueDateString = task.dueDate.split('T')[0];
      const localDueDate = new Date(dueDateString + 'T00:00:00');
      const dueDay = startOfDay(localDueDate);
      const isTaskToday = dueDay.getTime() === today.getTime();

      const isUrgent = task.rejected || task.pushedBack || (task.feedbackCount && task.feedbackCount > 0);

      if (isTaskToday && isUrgent) {
        count++;
      }
    });
  });

  return count;
}

/**
 * Count all tasks due today
 */
function countTodayTasks(projects: any[], projectsInfo: any[]): number {
  let count = 0;
  const today = startOfDay(new Date());

  projects.forEach(project => {
    // Check if project is paused (only if projectsInfo is available)
    if (projectsInfo && projectsInfo.length > 0) {
      const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
      const isProjectPaused = projectInfo?.status?.toLowerCase() === 'paused';

      if (isProjectPaused) {
        return; // Skip paused projects
      }
    }

    project.tasks.forEach((task: any) => {
      if (task.completed || task.status === 'In review') return;

      const dueDateString = task.dueDate.split('T')[0];
      const localDueDate = new Date(dueDateString + 'T00:00:00');
      const dueDay = startOfDay(localDueDate);

      if (dueDay.getTime() === today.getTime()) {
        count++;
      }
    });
  });

  return count;
}

/**
 * Count upcoming tasks
 */
function countUpcomingTasks(projects: any[], projectsInfo: any[]): number {
  let count = 0;
  const today = startOfDay(new Date());

  projects.forEach(project => {
    // Check if project is paused (only if projectsInfo is available)
    if (projectsInfo && projectsInfo.length > 0) {
      const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
      const isProjectPaused = projectInfo?.status?.toLowerCase() === 'paused';

      if (isProjectPaused) {
        return; // Skip paused projects
      }
    }

    project.tasks.forEach((task: any) => {
      if (task.completed || task.status === 'In review') return;

      const dueDateString = task.dueDate.split('T')[0];
      const localDueDate = new Date(dueDateString + 'T00:00:00');
      const dueDay = startOfDay(localDueDate);

      if (dueDay.getTime() > today.getTime()) {
        count++;
      }
    });
  });

  return count;
}

/**
 * Find tasks from upcoming that should be moved to today
 * Prioritizes urgent tasks first
 */
function findTasksToMove(projects: any[], maxToMove: number, projectsInfo: any[]): any[] {
  const today = startOfDay(new Date());
  const candidates: any[] = [];

  projects.forEach(project => {
    // Check if project is paused (only if projectsInfo is available)
    if (projectsInfo && projectsInfo.length > 0) {
      const projectInfo = projectsInfo.find(p => p.projectId === project.projectId);
      const isProjectPaused = projectInfo?.status?.toLowerCase() === 'paused';

      if (isProjectPaused) {
        console.log(`🚫 Excluding paused project from task movement: ${project.title} (ID: ${project.projectId})`);
        return; // Skip paused projects
      }
    }

    project.tasks.forEach((task: any) => {
      if (task.completed || task.status === 'In review') return;

      const dueDateString = task.dueDate.split('T')[0];
      const localDueDate = new Date(dueDateString + 'T00:00:00');
      const dueDay = startOfDay(localDueDate);

      // Only consider upcoming tasks (not today)
      if (dueDay.getTime() > today.getTime()) {
        const isUrgent = task.rejected || task.pushedBack || (task.feedbackCount && task.feedbackCount > 0);
        
        candidates.push({
          ...task,
          projectId: project.projectId,
          projectTitle: project.title,
          isUrgent,
          originalDueDate: task.dueDate
        });
      }
    });
  });

  // Sort by urgency first, then by due date (earliest first)
  candidates.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return candidates.slice(0, maxToMove);
}

/**
 * Move tasks to today by updating their due dates
 */
async function moveTasksToToday(tasksToMove: any[]): Promise<{
  success: boolean;
  error?: string;
  newTodayCount: number;
  newUpcomingCount: number;
}> {
  try {
    // Call API to update task due dates
    const response = await fetch('/api/project-tasks/move-to-today', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskIds: tasksToMove.map(task => task.id),
        newDueDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task due dates');
    }

    const result = await response.json();
    
    return {
      success: true,
      newTodayCount: result.newTodayCount || 0,
      newUpcomingCount: result.newUpcomingCount || 0
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      newTodayCount: 0,
      newUpcomingCount: 0
    };
  }
}
