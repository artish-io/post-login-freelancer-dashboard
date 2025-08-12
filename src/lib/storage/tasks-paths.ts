/**
 * Tasks Path Resolution
 * 
 * Resolves task file locations with preference for hierarchical storage.
 * Creates canonical tasks file if none exists.
 */

import path from 'path';
import { fileExists, writeJsonAtomic, ensureDir } from '../fs-json';
import { resolveCanonicalProjectPath, isHierarchicalPath } from './project-paths';

export interface TasksPathResolution {
  filePath: string; // Full file system path to tasks.json
  storage: 'hierarchical' | 'legacy';
}

const DATA_PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

/**
 * Resolve canonical tasks path for a project
 */
export async function resolveCanonicalTasksPath(projectId: number): Promise<TasksPathResolution> {
  // First resolve the project path
  const projectResolution = await resolveCanonicalProjectPath(projectId);
  
  if (!projectResolution) {
    throw new Error(`Project ${projectId} not found - cannot resolve tasks path`);
  }

  const { canonicalPath, source } = projectResolution;

  // Determine hierarchical tasks path
  let hierarchicalTasksPath: string;
  
  if (isHierarchicalPath(canonicalPath)) {
    // Project is already in hierarchical format
    hierarchicalTasksPath = path.join(DATA_PROJECTS_DIR, canonicalPath, 'tasks', 'tasks.json');
  } else {
    // Project is in legacy format, but we want to check for hierarchical tasks
    // This handles the case where project is legacy but tasks might be hierarchical
    const hierarchicalProjectPath = await getHierarchicalProjectPathForLegacy(projectId);
    if (hierarchicalProjectPath) {
      hierarchicalTasksPath = path.join(DATA_PROJECTS_DIR, hierarchicalProjectPath, 'tasks', 'tasks.json');
    } else {
      // No hierarchical equivalent, use legacy path for now
      hierarchicalTasksPath = path.join(DATA_PROJECTS_DIR, canonicalPath, 'tasks', 'tasks.json');
    }
  }

  // Check if hierarchical tasks exist
  if (await fileExists(hierarchicalTasksPath)) {
    return {
      filePath: hierarchicalTasksPath,
      storage: 'hierarchical'
    };
  }

  // Check legacy tasks path
  const legacyTasksPath = path.join(DATA_PROJECTS_DIR, String(projectId), 'tasks', 'tasks.json');
  if (await fileExists(legacyTasksPath)) {
    return {
      filePath: legacyTasksPath,
      storage: 'legacy'
    };
  }

  // Neither exists - create empty tasks file in hierarchical location
  await ensureDir(path.dirname(hierarchicalTasksPath));
  await writeJsonAtomic(hierarchicalTasksPath, {
    tasks: [],
    updatedAt: new Date().toISOString(),
    version: 1
  });

  return {
    filePath: hierarchicalTasksPath,
    storage: 'hierarchical'
  };
}

/**
 * Get hierarchical project path for a legacy project (if it exists)
 */
async function getHierarchicalProjectPathForLegacy(projectId: number): Promise<string | null> {
  try {
    const years = await import('fs').then(fs => fs.promises.readdir(DATA_PROJECTS_DIR));
    
    for (const year of years) {
      if (!/^\d{4}$/.test(year)) continue;
      
      const yearPath = path.join(DATA_PROJECTS_DIR, year);
      const months = await import('fs').then(fs => fs.promises.readdir(yearPath));
      
      for (const month of months) {
        if (!/^\d{2}$/.test(month)) continue;
        
        const monthPath = path.join(yearPath, month);
        const days = await import('fs').then(fs => fs.promises.readdir(monthPath));
        
        for (const day of days) {
          if (!/^\d{2}$/.test(day)) continue;
          
          const dayPath = path.join(monthPath, day);
          const projectPath = path.join(dayPath, String(projectId));
          
          if (await fileExists(path.join(projectPath, 'project.json'))) {
            return `${year}/${month}/${day}/${projectId}`;
          }
        }
      }
    }
  } catch (error) {
    // Ignore scan errors
  }
  
  return null;
}

/**
 * Get tasks directory path (without filename)
 */
export function getTasksDirectoryPath(canonicalPath: string): string {
  return path.join(DATA_PROJECTS_DIR, canonicalPath, 'tasks');
}

/**
 * Get full tasks file path from canonical project path
 */
export function getTasksFilePath(canonicalPath: string): string {
  return path.join(DATA_PROJECTS_DIR, canonicalPath, 'tasks', 'tasks.json');
}

/**
 * Check if tasks exist at hierarchical location
 */
export async function hasHierarchicalTasks(projectId: number): Promise<boolean> {
  const projectResolution = await resolveCanonicalProjectPath(projectId);
  
  if (!projectResolution || !isHierarchicalPath(projectResolution.canonicalPath)) {
    return false;
  }

  const tasksPath = getTasksFilePath(projectResolution.canonicalPath);
  return await fileExists(tasksPath);
}

/**
 * Check if tasks exist at legacy location
 */
export async function hasLegacyTasks(projectId: number): Promise<boolean> {
  const legacyTasksPath = path.join(DATA_PROJECTS_DIR, String(projectId), 'tasks', 'tasks.json');
  return await fileExists(legacyTasksPath);
}

/**
 * Create empty tasks file at hierarchical location
 */
export async function createHierarchicalTasks(projectId: number): Promise<string> {
  const projectResolution = await resolveCanonicalProjectPath(projectId);
  
  if (!projectResolution) {
    throw new Error(`Project ${projectId} not found - cannot create tasks`);
  }

  let hierarchicalPath: string;
  
  if (isHierarchicalPath(projectResolution.canonicalPath)) {
    hierarchicalPath = projectResolution.canonicalPath;
  } else {
    // For legacy projects, we need to determine where to create hierarchical tasks
    // This would require knowing the project's creation date
    throw new Error(`Cannot create hierarchical tasks for legacy project ${projectId} without migration`);
  }

  const tasksPath = getTasksFilePath(hierarchicalPath);
  await ensureDir(path.dirname(tasksPath));
  
  const emptyTasks = {
    tasks: [],
    updatedAt: new Date().toISOString(),
    version: 1
  };
  
  await writeJsonAtomic(tasksPath, emptyTasks);
  
  return tasksPath;
}
