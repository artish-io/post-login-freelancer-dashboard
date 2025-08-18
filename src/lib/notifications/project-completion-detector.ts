export interface ProjectCompletionStatus {
  isComplete: boolean;
  totalTasks: number;
  approvedTasks: number;
  remainingTasks: number;
  isFinalTask: boolean;
}

export async function detectProjectCompletion(
  projectId: string | number,
  currentTaskId?: number
): Promise<ProjectCompletionStatus> {
  try {
    const { UnifiedStorageService } = await import('../storage/unified-storage-service');

    // First check if the project exists to avoid unnecessary warnings
    try {
      const project = await UnifiedStorageService.getProjectById(projectId);
      if (!project) {
        // Project has been deleted - return default status silently
        return {
          isComplete: false,
          totalTasks: 0,
          approvedTasks: 0,
          remainingTasks: 0,
          isFinalTask: false
        };
      }
    } catch (projectError) {
      // Project doesn't exist or can't be accessed
      return {
        isComplete: false,
        totalTasks: 0,
        approvedTasks: 0,
        remainingTasks: 0,
        isFinalTask: false
      };
    }

    const tasks = await UnifiedStorageService.listTasks(projectId);

    if (!tasks || tasks.length === 0) {
      // Only log for existing projects with no tasks (which might be unusual)
      console.debug(`No tasks found for existing project ${projectId}`);
      return {
        isComplete: false,
        totalTasks: 0,
        approvedTasks: 0,
        remainingTasks: 0,
        isFinalTask: false
      };
    }

    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter(
      (task: any) => task.status === 'Approved' && task.completed
    );
    const approvedCount = approvedTasks.length;
    const remainingTasks = totalTasks - approvedCount;

    // If currentTaskId is provided, check if approving it would complete the project
    let isFinalTask = false;
    if (currentTaskId) {
      const unapprovedTasks = tasks.filter(
        (task: any) => task.taskId !== currentTaskId &&
                      (task.status !== 'Approved' || !task.completed)
      );
      isFinalTask = unapprovedTasks.length === 0;
    }

    return {
      isComplete: remainingTasks === 0,
      totalTasks,
      approvedTasks: approvedCount,
      remainingTasks,
      isFinalTask
    };
  } catch (error) {
    // Use debug level for deleted projects to reduce noise
    console.debug(`Error detecting project completion for project ${projectId}:`, error);
    return {
      isComplete: false,
      totalTasks: 0,
      approvedTasks: 0,
      remainingTasks: 0,
      isFinalTask: false
    };
  }
}
