/**
 * Unified project status and progress calculation utilities
 * This ensures consistent logic across all components
 */

export interface Task {
  id: number;
  title: string;
  status: 'Ongoing' | 'In review' | 'Approved' | 'Rejected';
  completed: boolean;
  order: number;
  dueDate: string;
  rejected?: boolean;
  pushedBack?: boolean;
  feedbackCount?: number;
}

export interface ProjectTaskData {
  projectId: number;
  title: string;
  organizationId: number;
  tasks: Task[];
}

export interface Project {
  projectId: number;
  title: string;
  status: 'Ongoing' | 'Paused' | 'Completed';
  totalTasks: number;
  freelancerId: number;
  commissionerId: number;
  dueDate: string;
  invoicingMethod?: string;
}

/**
 * Calculate project progress based on approved tasks
 * This is the unified logic used across all components
 */
export function calculateProjectProgress(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0;
  
  const approvedTasks = tasks.filter(task => task.status === 'Approved').length;
  return Math.round((approvedTasks / tasks.length) * 100);
}

/**
 * Determine project status based on task completion
 * This ensures consistent status logic across the application
 */
export function calculateProjectStatus(tasks: Task[]): 'ongoing' | 'paused' | 'completed' {
  if (!tasks || tasks.length === 0) return 'paused';
  
  const approvedTasks = tasks.filter(task => task.status === 'Approved').length;
  const totalTasks = tasks.length;
  
  // All tasks approved = completed
  if (approvedTasks === totalTasks) return 'completed';
  
  // Check if project has recent activity
  const hasRecentActivity = tasks.some(task =>
    task.status === 'In review' || task.status === 'Ongoing'
  );
  
  return hasRecentActivity ? 'ongoing' : 'paused';
}

/**
 * Get progress ring styles based on completion percentage
 * Consistent with the design system requirements
 */
export function getProgressRingStyles(progress: number) {
  if (progress < 50) {
    return {
      strokeColor: '#EF4444', // red-500
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    };
  } else if (progress < 75) {
    return {
      strokeColor: '#F59E0B', // yellow-500
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    };
  } else if (progress < 100) {
    return {
      strokeColor: '#84CC16', // lime-500 (yellow-green)
      bgColor: 'bg-lime-50',
      textColor: 'text-lime-700'
    };
  } else {
    return {
      strokeColor: '#10B981', // green-500
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    };
  }
}

/**
 * Calculate progress ring SVG properties
 */
export function getProgressRingProps(progress: number, radius: number = 14) {
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return {
    radius,
    circumference,
    strokeDasharray,
    strokeDashoffset
  };
}

/**
 * Sync project status between project-tasks.json and projects.json
 * This function should be called whenever task status changes
 */
export async function syncProjectStatus(projectId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/projects/sync-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });

    if (response.ok) {
      const result = await response.json();
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('Error syncing project status:', error);
    return false;
  }
}

/**
 * Transform project data with unified calculations
 * Use this function to ensure consistent data transformation
 */
export function transformProjectData(projectTaskData: ProjectTaskData, projectInfo?: Project) {
  const tasks = projectTaskData.tasks || [];
  const progress = calculateProjectProgress(tasks);
  const calculatedStatus = calculateProjectStatus(tasks);
  
  // Use project info status if available, otherwise use calculated status
  const status = projectInfo?.status?.toLowerCase() || calculatedStatus;
  
  return {
    projectId: projectTaskData.projectId,
    title: projectTaskData.title || projectInfo?.title || 'Untitled Project',
    status: status as 'ongoing' | 'paused' | 'completed',
    progress,
    totalTasks: tasks.length,
    approvedTasks: tasks.filter(task => task.status === 'Approved').length,
    completedTasks: tasks.filter(task => task.completed).length,
    inReviewTasks: tasks.filter(task => task.status === 'In review').length,
    ongoingTasks: tasks.filter(task => task.status === 'Ongoing').length,
    tasks,
    organizationId: projectTaskData.organizationId,
    freelancerId: projectInfo?.freelancerId,
    commissionerId: projectInfo?.commissionerId,
    dueDate: projectInfo?.dueDate,
    invoicingMethod: projectInfo?.invoicingMethod
  };
}

/**
 * Validate data consistency between projects.json and project-tasks.json
 */
export function validateProjectDataConsistency(project: Project, projectTaskData: ProjectTaskData): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if totalTasks matches actual task count
  if (project.totalTasks !== projectTaskData.tasks.length) {
    issues.push(`totalTasks mismatch: projects.json has ${project.totalTasks}, but project-tasks.json has ${projectTaskData.tasks.length} tasks`);
  }
  
  // Check if status is consistent with task completion
  const calculatedStatus = calculateProjectStatus(projectTaskData.tasks);
  const normalizedProjectStatus = project.status.toLowerCase();
  
  if (normalizedProjectStatus !== calculatedStatus) {
    issues.push(`Status mismatch: projects.json has "${project.status}", but calculated status is "${calculatedStatus}"`);
  }
  
  return {
    isConsistent: issues.length === 0,
    issues
  };
}
