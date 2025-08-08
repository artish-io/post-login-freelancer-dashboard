
import { listTasksByProject } from '@/app/api/payments/repos/tasks-repo';

export async function getProjectTasks(projectId: number) {
  try {
    // Read tasks from tasks repo
    const tasks = await listTasksByProject(projectId);

    // Return in legacy format for backward compatibility
    return [{
      projectId,
      tasks
    }];
  } catch (error) {
    console.error('Error reading project tasks from repo:', error);
    return [];
  }
}