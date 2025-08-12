/**
 * Task Store - Canonical read/write for tasks/tasks.json
 * 
 * Provides unified access to project tasks with on-demand consolidation fallback.
 * All task operations should go through this store to ensure consistency.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { writeJsonAtomic, readJson, fileExists, ensureDir } from '../fs-json';
import { resolveCanonicalTasksPath } from '../storage/tasks-paths';

export interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  milestoneId: number | null;
  completedAt: string | null; // ISO string
  links: {
    brief: string;
    work: string;
  };
  // Additional fields for compatibility
  projectId?: number;
  description?: string;
  dueDate?: string;
  order?: number;
  version?: number;
  createdDate?: string;
  lastModified?: string;
}

export interface TasksContainer {
  tasks: Task[];
  updatedAt: string;
  version: number;
}

export class TaskStoreError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'INVALID_DATA' | 'IO_ERROR' | 'CONSOLIDATION_FAILED',
    public projectId?: number
  ) {
    super(message);
    this.name = 'TaskStoreError';
  }
}

/**
 * Get the canonical tasks file path for a project using resolvers
 */
async function getTasksFilePath(projectId: number): Promise<string> {
  const resolution = await resolveCanonicalTasksPath(projectId);
  return resolution.filePath;
}

/**
 * Get the project tasks directory path
 */
function getProjectTasksDir(projectId: number): string {
  return path.join(process.cwd(), 'data', 'project-tasks');
}

/**
 * Get the archive directory path for a project
 */
function getArchiveDir(projectId: number): string {
  return path.join(process.cwd(), 'data', 'projects', projectId.toString(), 'tasks', '_archive');
}

/**
 * Read tasks from canonical location using resolvers
 */
export async function getTasks(projectId: number): Promise<Task[]> {
  try {
    const resolution = await resolveCanonicalTasksPath(projectId);
    const tasksPath = resolution.filePath;

    if (await fileExists(tasksPath)) {
      const container = await readJson<TasksContainer>(tasksPath, { tasks: [], updatedAt: new Date().toISOString(), version: 1 });
      return container.tasks;
    }

    // If we get here, the resolver should have created an empty file
    // Try reading again
    const container = await readJson<TasksContainer>(tasksPath, { tasks: [], updatedAt: new Date().toISOString(), version: 1 });
    return container.tasks;

  } catch (error) {
    // Fallback: try consolidation for legacy projects
    try {
      console.log(`📋 Canonical tasks failed for project ${projectId}, attempting consolidation...`);
      const consolidatedTasks = await consolidateTaskFiles(projectId);

      // Save consolidated tasks using canonical path
      await saveTasks(projectId, consolidatedTasks);

      return consolidatedTasks;
    } catch (consolidationError) {
      throw new TaskStoreError(
        `Failed to read tasks for project ${projectId}: ${error}. Consolidation also failed: ${consolidationError}`,
        'IO_ERROR',
        projectId
      );
    }
  }
}

/**
 * Save tasks to canonical location using resolvers
 */
export async function saveTasks(projectId: number, tasks: Task[]): Promise<void> {
  try {
    const resolution = await resolveCanonicalTasksPath(projectId);
    const tasksPath = resolution.filePath;

    const container: TasksContainer = {
      tasks: tasks.sort((a, b) => a.id - b.id), // Sort by id ascending
      updatedAt: new Date().toISOString(),
      version: 1
    };

    await writeJsonAtomic(tasksPath, container);
  } catch (error) {
    throw new TaskStoreError(
      `Failed to save tasks for project ${projectId}: ${error}`,
      'IO_ERROR',
      projectId
    );
  }
}

/**
 * Get a single task by ID
 */
export async function getTask(projectId: number, taskId: number): Promise<Task | null> {
  const tasks = await getTasks(projectId);
  return tasks.find(task => task.id === taskId) || null;
}

/**
 * Update a single task
 */
export async function updateTask(projectId: number, taskId: number, updates: Partial<Task>): Promise<Task> {
  const tasks = await getTasks(projectId);
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  
  if (taskIndex === -1) {
    throw new TaskStoreError(
      `Task ${taskId} not found in project ${projectId}`,
      'NOT_FOUND',
      projectId
    );
  }
  
  const updatedTask = { ...tasks[taskIndex], ...updates };
  tasks[taskIndex] = updatedTask;
  
  await saveTasks(projectId, tasks);
  return updatedTask;
}

/**
 * Consolidate scattered task files into a single array
 * This is the fallback mechanism when canonical tasks.json doesn't exist
 */
async function consolidateTaskFiles(projectId: number): Promise<Task[]> {
  const projectTasksDir = getProjectTasksDir(projectId);
  const tasksMap = new Map<number, { task: Task; mtime: number }>();
  
  try {
    // Scan for task files in hierarchical structure
    await scanTaskFiles(projectTasksDir, projectId, tasksMap);
    
    // Convert map to sorted array (last write wins by mtime)
    const tasks = Array.from(tasksMap.values())
      .sort((a, b) => a.task.id - b.task.id)
      .map(item => item.task);
    
    // Archive original files if any were found
    if (tasks.length > 0) {
      await archiveOriginalFiles(projectId, tasksMap);
    }
    
    return tasks;
  } catch (error) {
    throw new TaskStoreError(
      `Failed to consolidate task files for project ${projectId}: ${error}`,
      'CONSOLIDATION_FAILED',
      projectId
    );
  }
}

/**
 * Recursively scan for task files
 */
async function scanTaskFiles(
  dir: string,
  projectId: number,
  tasksMap: Map<number, { task: Task; mtime: number }>
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanTaskFiles(fullPath, projectId, tasksMap);
      } else if (entry.name.includes('task') && entry.name.endsWith('.json')) {
        try {
          const taskData = await readJson<any>(fullPath, null);
          if (taskData && taskData.projectId === projectId && typeof taskData.id === 'number') {
            const stats = await fs.stat(fullPath);
            const normalizedTask = normalizeTask(taskData);
            
            // Last write wins by mtime
            const existing = tasksMap.get(normalizedTask.id);
            if (!existing || stats.mtime.getTime() > existing.mtime) {
              tasksMap.set(normalizedTask.id, {
                task: normalizedTask,
                mtime: stats.mtime.getTime()
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Skipping invalid task file ${fullPath}: ${error}`);
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - that's okay
    console.log(`📋 No task files found in ${dir} for project ${projectId}`);
  }
}

/**
 * Normalize task data to canonical format
 */
function normalizeTask(taskData: any): Task {
  return {
    id: taskData.id || taskData.taskId,
    title: taskData.title || 'Untitled Task',
    status: mapStatus(taskData.status),
    milestoneId: taskData.milestoneId || null,
    completedAt: taskData.completedAt || (taskData.completed ? taskData.lastModified || new Date().toISOString() : null),
    links: {
      brief: taskData.links?.brief || '',
      work: taskData.links?.work || taskData.link || ''
    },
    // Preserve additional fields for compatibility
    projectId: taskData.projectId,
    description: taskData.description,
    dueDate: taskData.dueDate,
    order: taskData.order,
    version: taskData.version,
    createdDate: taskData.createdDate,
    lastModified: taskData.lastModified
  };
}

/**
 * Map various status formats to canonical format
 */
function mapStatus(status: string): Task['status'] {
  const normalized = status?.toLowerCase() || 'todo';
  
  if (normalized.includes('ongoing') || normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('review') || normalized.includes('submitted')) return 'review';
  if (normalized.includes('approved') || normalized.includes('done') || normalized.includes('completed')) return 'done';
  
  return 'todo';
}

/**
 * Archive original task files after consolidation
 */
async function archiveOriginalFiles(
  projectId: number,
  tasksMap: Map<number, { task: Task; mtime: number }>
): Promise<void> {
  const archiveDir = getArchiveDir(projectId);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const archivePath = path.join(archiveDir, today);
  
  await ensureDir(archivePath);
  
  // Create archive manifest
  const manifest = {
    archivedAt: new Date().toISOString(),
    projectId,
    taskCount: tasksMap.size,
    reason: 'Consolidated into canonical tasks.json'
  };
  
  await writeJsonAtomic(path.join(archivePath, 'manifest.json'), manifest);
  
  console.log(`📦 Archived ${tasksMap.size} task files for project ${projectId} to ${archivePath}`);
}
