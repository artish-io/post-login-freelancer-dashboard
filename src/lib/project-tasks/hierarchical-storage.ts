/**
 * Hierarchical Project Tasks Storage Utilities
 * 
 * Manages project tasks in a hierarchical file structure:
 * data/project-tasks/[year]/[month]/[day]/[projectId]/[taskId]-task.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format, parse } from 'date-fns';

export interface HierarchicalTask {
  taskId: number;
  projectId: number;
  projectTitle: string;
  organizationId: number;
  projectTypeTags: string[];
  title: string;
  status: string;
  completed: boolean;
  order: number;
  link: string;
  dueDate: string;
  rejected: boolean;
  feedbackCount: number;
  pushedBack: boolean;
  version: number;
  description: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  createdDate: string;
  lastModified: string;
}

export interface LegacyProject {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
  tasks: LegacyTask[];
}

export interface LegacyTask {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  order: number;
  link: string;
  dueDate: string;
  rejected: boolean;
  feedbackCount: number;
  pushedBack: boolean;
  version: number;
  description: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
}

/**
 * Generate file path for a task based on project creation date (NOT due date)
 * This ensures tasks are stored with their parent project
 */
export function generateTaskFilePath(projectCreatedAt: string, projectId: number, taskId: number): string {
  const date = new Date(projectCreatedAt);
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  return path.join(
    process.cwd(),
    'data',
    'project-tasks',
    year,
    month,
    day,
    projectId.toString(),
    `${taskId}-task.json`
  );
}

/**
 * Generate directory path for a project's tasks based on project creation date
 */
export function generateProjectTasksDir(projectCreatedAt: string, projectId: number): string {
  const date = new Date(projectCreatedAt);
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  return path.join(
    process.cwd(),
    'data',
    'project-tasks',
    year,
    month,
    day,
    projectId.toString()
  );
}

/**
 * DEPRECATED: Legacy function that used due date - kept for migration purposes
 */
export function generateTaskFilePathByDueDate(dueDate: string, projectId: number, taskId: number): string {
  const date = new Date(dueDate);
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  return path.join(
    process.cwd(),
    'data',
    'project-tasks',
    year,
    month,
    day,
    projectId.toString(),
    `${taskId}-task.json`
  );
}

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Find existing task file location by searching through the hierarchical structure
 */
export async function findExistingTaskFile(projectId: number, taskId: number): Promise<string | null> {
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');

  try {
    // Walk through year/month/day directories to find the existing file
    const years = await fs.readdir(basePath);

    for (const year of years) {
      const yearPath = path.join(basePath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const projectPath = path.join(dayPath, projectId.toString());

          try {
            const taskFiles = await fs.readdir(projectPath);
            const taskFileName = `${taskId}-task.json`;

            if (taskFiles.includes(taskFileName)) {
              return path.join(projectPath, taskFileName);
            }
          } catch {
            // Project directory doesn't exist for this date, continue
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Error searching for existing task file ${projectId}/${taskId}:`, error);
  }

  return null;
}

/**
 * Write a single task to hierarchical storage
 * Uses project creation date for consistent storage location
 */
export async function writeTask(task: HierarchicalTask, projectCreatedAt?: string): Promise<void> {
  let filePath: string;

  // First, try to find the existing file location
  const existingFilePath = await findExistingTaskFile(task.projectId, task.taskId);

  if (existingFilePath) {
    // Use the existing file location
    filePath = existingFilePath;
    console.log(`📝 Updating existing task ${task.taskId} at: ${filePath}`);
  } else {
    // For new tasks, we need the project creation date
    if (!projectCreatedAt) {
      // Try to get project creation date from project storage
      const { readProject } = await import('../projects-utils');
      const project = await readProject(task.projectId);
      projectCreatedAt = project?.createdAt;
    }

    if (projectCreatedAt) {
      // Use project creation date for storage location
      filePath = generateTaskFilePath(projectCreatedAt, task.projectId, task.taskId);
      console.log(`📝 Creating new task ${task.taskId} using project creation date at: ${filePath}`);
    } else {
      // Fallback to due date if project creation date is not available
      console.warn(`⚠️ Project creation date not found for project ${task.projectId}, falling back to due date`);
      filePath = generateTaskFilePathByDueDate(task.dueDate, task.projectId, task.taskId);
      console.log(`📝 Creating new task ${task.taskId} using due date fallback at: ${filePath}`);
    }
  }

  const dirPath = path.dirname(filePath);
  await ensureDirectoryExists(dirPath);

  const taskWithTimestamp = {
    ...task,
    lastModified: new Date().toISOString()
  };

  await fs.writeFile(filePath, JSON.stringify(taskWithTimestamp, null, 2));
}

/**
 * Read a single task from hierarchical storage
 * First tries to find by existing file location, then by project creation date
 */
export async function readTask(projectCreatedAt: string, projectId: number, taskId: number): Promise<HierarchicalTask | null> {
  try {
    // First try to find the existing file location
    const existingFilePath = await findExistingTaskFile(projectId, taskId);

    if (existingFilePath) {
      const content = await fs.readFile(existingFilePath, 'utf-8');
      return JSON.parse(content) as HierarchicalTask;
    }

    // Try using project creation date
    const filePath = generateTaskFilePath(projectCreatedAt, projectId, taskId);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as HierarchicalTask;
  } catch (error) {
    console.warn(`Task not found: ${projectCreatedAt}/${projectId}/${taskId}`, error);
    return null;
  }
}

/**
 * Read a single task by searching through all possible locations
 */
export async function readTaskById(projectId: number, taskId: number): Promise<HierarchicalTask | null> {
  try {
    const existingFilePath = await findExistingTaskFile(projectId, taskId);

    if (existingFilePath) {
      const content = await fs.readFile(existingFilePath, 'utf-8');
      return JSON.parse(content) as HierarchicalTask;
    }

    return null;
  } catch (error) {
    console.warn(`Task not found: ${projectId}/${taskId}`, error);
    return null;
  }
}

/**
 * Read all tasks for a specific project
 */
export async function readProjectTasks(projectId: number): Promise<HierarchicalTask[]> {
  const tasks: HierarchicalTask[] = [];
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');
  
  try {
    // Walk through year/month/day directories
    const years = await fs.readdir(basePath);
    
    for (const year of years) {
      const yearPath = path.join(basePath, year);
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);
        
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const projectPath = path.join(dayPath, projectId.toString());
          
          try {
            const taskFiles = await fs.readdir(projectPath);
            
            for (const taskFile of taskFiles) {
              if (taskFile.endsWith('-task.json')) {
                const taskPath = path.join(projectPath, taskFile);
                const content = await fs.readFile(taskPath, 'utf-8');
                const task = JSON.parse(content) as HierarchicalTask;
                tasks.push(task);
              }
            }
          } catch {
            // Project directory doesn't exist for this date, continue
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading project tasks for project ${projectId}:`, error);
  }
  
  return tasks.sort((a, b) => a.order - b.order);
}

/**
 * Read all tasks across all projects
 */
export async function readAllTasks(): Promise<HierarchicalTask[]> {
  const tasks: HierarchicalTask[] = [];
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');
  
  try {
    const years = await fs.readdir(basePath);

    for (const year of years) {
      // Skip files, only process directories (years should be like "2025")
      if (!year.match(/^\d{4}$/)) continue;

      const yearPath = path.join(basePath, year);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;

      const months = await fs.readdir(yearPath);

      for (const month of months) {
        // Skip files, only process directories (months should be like "01", "02", etc.)
        if (!month.match(/^\d{2}$/)) continue;

        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);
        if (!monthStat.isDirectory()) continue;

        const days = await fs.readdir(monthPath);

        for (const day of days) {
          // Skip files, only process directories (days should be like "01", "02", etc.)
          if (!day.match(/^\d{2}$/)) continue;

          const dayPath = path.join(monthPath, day);
          const dayStat = await fs.stat(dayPath);
          if (!dayStat.isDirectory()) continue;

          const projects = await fs.readdir(dayPath);
          
          for (const project of projects) {
            // Skip files, only process directories (projects should be numeric IDs)
            if (!project.match(/^\d+$/)) continue;

            const projectPath = path.join(dayPath, project);
            const projectStat = await fs.stat(projectPath);
            if (!projectStat.isDirectory()) continue;

            const taskFiles = await fs.readdir(projectPath);

            for (const taskFile of taskFiles) {
              if (taskFile.endsWith('-task.json')) {
                const taskPath = path.join(projectPath, taskFile);
                const content = await fs.readFile(taskPath, 'utf-8');
                const task = JSON.parse(content) as HierarchicalTask;
                tasks.push(task);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error reading all tasks:', error);
  }
  
  return tasks;
}

/**
 * Delete a task from hierarchical storage
 */
export async function deleteTask(dueDate: string, projectId: number, taskId: number): Promise<boolean> {
  try {
    const filePath = generateTaskFilePath(dueDate, projectId, taskId);
    await fs.unlink(filePath);
    
    // Try to clean up empty directories
    const dirPath = path.dirname(filePath);
    try {
      const files = await fs.readdir(dirPath);
      if (files.length === 0) {
        await fs.rmdir(dirPath);
      }
    } catch {
      // Directory not empty or other error, ignore
    }
    
    return true;
  } catch (error) {
    console.warn(`Error deleting task ${dueDate}/${projectId}/${taskId}:`, error);
    return false;
  }
}

/**
 * Move a task to a new due date (changes file location)
 */
export async function moveTaskToNewDate(
  oldDueDate: string, 
  newDueDate: string, 
  projectId: number, 
  taskId: number
): Promise<boolean> {
  try {
    // Read the existing task
    const task = await readTask(oldDueDate, projectId, taskId);
    if (!task) {
      return false;
    }
    
    // Update the due date
    const updatedTask = {
      ...task,
      dueDate: newDueDate,
      lastModified: new Date().toISOString()
    };
    
    // Write to new location
    await writeTask(updatedTask);
    
    // Delete from old location
    await deleteTask(oldDueDate, projectId, taskId);
    
    return true;
  } catch (error) {
    console.warn(`Error moving task ${oldDueDate}/${projectId}/${taskId} to ${newDueDate}:`, error);
    return false;
  }
}

/**
 * Convert legacy project structure to hierarchical tasks
 */
export function convertLegacyToHierarchical(legacyProject: LegacyProject): HierarchicalTask[] {
  const now = new Date().toISOString();
  
  return legacyProject.tasks.map(task => ({
    taskId: task.id,
    projectId: legacyProject.projectId,
    projectTitle: legacyProject.title,
    organizationId: legacyProject.organizationId,
    projectTypeTags: legacyProject.typeTags,
    title: task.title,
    status: task.status,
    completed: task.completed,
    order: task.order,
    link: task.link,
    dueDate: task.dueDate,
    rejected: task.rejected,
    feedbackCount: task.feedbackCount,
    pushedBack: task.pushedBack,
    version: task.version,
    description: task.description,
    submittedDate: task.submittedDate,
    approvedDate: task.approvedDate,
    rejectedDate: task.rejectedDate,
    createdDate: now,
    lastModified: now
  }));
}

/**
 * Convert hierarchical tasks back to legacy project structure
 */
export function convertHierarchicalToLegacy(tasks: HierarchicalTask[]): LegacyProject[] {
  const projectsMap = new Map<number, LegacyProject>();
  
  for (const task of tasks) {
    if (!projectsMap.has(task.projectId)) {
      projectsMap.set(task.projectId, {
        projectId: task.projectId,
        title: task.projectTitle,
        organizationId: task.organizationId,
        typeTags: task.projectTypeTags,
        tasks: []
      });
    }
    
    const project = projectsMap.get(task.projectId)!;
    project.tasks.push({
      id: task.taskId,
      title: task.title,
      status: task.status,
      completed: task.completed,
      order: task.order,
      link: task.link,
      dueDate: task.dueDate,
      rejected: task.rejected,
      feedbackCount: task.feedbackCount,
      pushedBack: task.pushedBack,
      version: task.version,
      description: task.description,
      submittedDate: task.submittedDate,
      approvedDate: task.approvedDate,
      rejectedDate: task.rejectedDate
    });
  }
  
  // Sort tasks within each project by order
  for (const project of projectsMap.values()) {
    project.tasks.sort((a, b) => a.order - b.order);
  }
  
  return Array.from(projectsMap.values());
}
