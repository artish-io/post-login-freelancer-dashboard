

import path from 'path';
import { readFile } from 'fs/promises';

const TASKS_PATH = path.join(process.cwd(), 'data', 'project-tasks.json');

export async function getProjectTasks(projectId: number) {
  try {
    const data = await readFile(TASKS_PATH, 'utf-8');
    const allTasks = JSON.parse(data);
    const tasksForProject = allTasks.filter((task: any) => task.projectId === projectId);
    return tasksForProject;
  } catch (error) {
    console.error('Error reading project tasks:', error);
    return [];
  }
}