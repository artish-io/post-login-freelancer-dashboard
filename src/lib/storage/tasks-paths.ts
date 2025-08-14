/**
 * Task Path Utilities
 *
 * Provides utilities for resolving hierarchical task storage paths.
 * Tasks are stored as individual files in data/project-tasks/YYYY/MM/DD/<projectId>/<taskId>-task.json
 */

import { fileExists, readJson, writeJsonAtomic } from '../fs-json';
import { readProject } from '../projects-utils';
import path from 'path';
import { promises as fs } from 'fs';

// Throttle warnings to prevent spam
const warnedProjects = new Set<number>();

export interface Task {
  id?: number;
  taskId?: number;
  projectId: number;
  title: string;
  status: string;
  completed: boolean;
  rejected?: boolean;
  feedbackCount?: number;
  version?: number;
  description?: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  createdDate?: string;
  lastModified?: string;
  link?: string;
  dueDate?: string;
  order?: number;
  [key: string]: any;
}

/**
 * Resolve the canonical directory path for a project's tasks
 * Uses project creation date to determine hierarchical path
 */
export async function resolveCanonicalTasksDir(projectId: number): Promise<string | null> {
  try {
    // Get project to find its creation date
    const project = await readProject(projectId);
    if (!project || !project.createdAt) {
      // Graceful handling - project may have been deleted/archived
      if (!warnedProjects.has(projectId)) {
        console.info(`[TasksPaths] Project ${projectId} not found (may have been deleted/archived)`);
        warnedProjects.add(projectId);
        // Clear the warning after 5 minutes to allow retry
        setTimeout(() => warnedProjects.delete(projectId), 5 * 60 * 1000);
      }
      return null;
    }

    // Parse creation date to get hierarchical path components
    const date = new Date(project.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Build path to task directory (existing structure)
    const tasksDir = path.join(
      process.cwd(),
      'data',
      'project-tasks',
      year.toString(),
      month,
      day,
      projectId.toString()
    );

    return tasksDir;
  } catch (error) {
    console.error(`Error resolving canonical tasks directory for project ${projectId}:`, error);
    return null;
  }
}

/**
 * Get the file path for a specific task
 */
export function getTaskFilePath(tasksDir: string, taskId: number): string {
  return path.join(tasksDir, `${taskId}-task.json`);
}

/**
 * Read all tasks for a specific project from hierarchical storage
 */
export async function readProjectTasks(projectId: number): Promise<Task[]> {
  try {
    const tasksDir = await resolveCanonicalTasksDir(projectId);
    if (!tasksDir) {
      return [];
    }

    if (!(await fileExists(tasksDir))) {
      return [];
    }

    // Read all task files in the directory
    const files = await fs.readdir(tasksDir);
    const taskFiles = files.filter(file => file.endsWith('-task.json'));

    const tasks: Task[] = [];
    for (const file of taskFiles) {
      try {
        const taskPath = path.join(tasksDir, file);
        const task = await readJson<Task>(taskPath, {} as Task);
        if (task.taskId || task.id) {
          tasks.push(task);
        }
      } catch (error) {
        console.warn(`Error reading task file ${file}:`, error);
      }
    }

    return tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error(`Error reading project tasks for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Write all tasks for a specific project to hierarchical storage
 * Uses atomic write to ensure data consistency
 */
export async function writeProjectTasks(projectId: number, tasks: Task[]): Promise<void> {
  try {
    const tasksDir = await resolveCanonicalTasksDir(projectId);
    if (!tasksDir) {
      throw new Error(`Cannot resolve tasks directory for project ${projectId}`);
    }

    // Ensure directory exists
    await fs.mkdir(tasksDir, { recursive: true });

    // Write each task to its individual file
    for (const task of tasks) {
      const taskWithTimestamp = {
        ...task,
        lastModified: new Date().toISOString(),
        createdDate: task.createdDate || new Date().toISOString()
      };

      const taskId = task.taskId || task.id;
      if (taskId) {
        const taskPath = getTaskFilePath(tasksDir, taskId);
        await writeJsonAtomic(taskPath, taskWithTimestamp);
      }
    }
  } catch (error) {
    console.error(`Error writing project tasks for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get a specific task by composite ID (projectId, taskId)
 */
export async function getTaskByCompositeId(projectId: number, taskId: number): Promise<Task | null> {
  try {
    const tasks = await readProjectTasks(projectId);
    const task = tasks.find(t => (t.id ?? t.taskId) === taskId);
    return task ?? null;
  } catch (error) {
    console.error(`Error getting task ${taskId} from project ${projectId}:`, error);
    return null;
  }
}

/**
 * Update a specific task in the project's task storage
 */
export async function updateTaskInProject(projectId: number, taskId: number, updates: Partial<Task>): Promise<Task | null> {
  try {
    const tasksDir = await resolveCanonicalTasksDir(projectId);
    if (!tasksDir) {
      throw new Error(`Cannot resolve tasks directory for project ${projectId}`);
    }

    const taskPath = getTaskFilePath(tasksDir, taskId);

    // Read the existing task
    if (!(await fileExists(taskPath))) {
      console.warn(`Task file ${taskPath} not found`);
      return null;
    }

    const existingTask = await readJson<Task>(taskPath, {} as Task);

    // Apply updates
    const updatedTask = {
      ...existingTask,
      ...updates,
      lastModified: new Date().toISOString()
    };

    // Write back to storage atomically
    await writeJsonAtomic(taskPath, updatedTask);

    return updatedTask;
  } catch (error) {
    console.error(`Error updating task ${taskId} in project ${projectId}:`, error);
    throw error;
  }
}
