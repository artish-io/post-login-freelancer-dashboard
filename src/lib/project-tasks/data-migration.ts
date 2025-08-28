/**
 * Data Migration Utilities for Project Tasks
 * 
 * Fixes inconsistencies in task storage locations and ensures
 * tasks are stored with their parent project creation dates
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { 
  HierarchicalTask, 
  readAllTasks, 
  generateTaskFilePath, 
  generateTaskFilePathByDueDate,
  ensureDirectoryExists 
} from './hierarchical-storage';
import { readProject } from '../projects-utils';

export interface MigrationResult {
  totalTasks: number;
  migratedTasks: number;
  errors: Array<{
    taskId: number;
    projectId: number;
    error: string;
  }>;
  inconsistencies: Array<{
    taskId: number;
    projectId: number;
    currentLocation: string;
    correctLocation: string;
    issue: string;
  }>;
}

/**
 * Analyze task storage inconsistencies without making changes
 */
export async function analyzeTaskStorageInconsistencies(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalTasks: 0,
    migratedTasks: 0,
    errors: [],
    inconsistencies: []
  };

  try {
    console.log('🔍 Analyzing task storage inconsistencies...');
    
    // Read all tasks from current storage
    const allTasks = await readAllTasks();
    result.totalTasks = allTasks.length;

    console.log(`📊 Found ${allTasks.length} tasks to analyze`);

    for (const task of allTasks) {
      try {
        // Get the project creation date
        const project = await readProject(task.projectId);
        
        if (!project?.createdAt) {
          result.errors.push({
            taskId: task.taskId,
            projectId: Number(task.projectId),
            error: 'Project not found or missing creation date'
          });
          continue;
        }

        // Calculate where the task should be stored
        const correctLocation = generateTaskFilePath(project.createdAt, Number(task.projectId), task.taskId);

        // Find where the task is currently stored
        const currentLocation = await findCurrentTaskLocation(Number(task.projectId), task.taskId);
        
        if (!currentLocation) {
          result.errors.push({
            taskId: task.taskId,
            projectId: Number(task.projectId),
            error: 'Task file not found in storage'
          });
          continue;
        }

        // Check if locations match
        if (currentLocation !== correctLocation) {
          result.inconsistencies.push({
            taskId: task.taskId,
            projectId: Number(task.projectId),
            currentLocation,
            correctLocation,
            issue: 'Task stored in wrong date directory'
          });
        }

      } catch (error) {
        result.errors.push({
          taskId: task.taskId,
          projectId: Number(task.projectId),
          error: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    console.log(`✅ Analysis complete: ${result.inconsistencies.length} inconsistencies found`);
    return result;

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

/**
 * Migrate tasks to correct storage locations
 */
export async function migrateTaskStorageLocations(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalTasks: 0,
    migratedTasks: 0,
    errors: [],
    inconsistencies: []
  };

  try {
    console.log('🚀 Starting task storage migration...');
    
    // First analyze to get the inconsistencies
    const analysis = await analyzeTaskStorageInconsistencies();
    result.totalTasks = analysis.totalTasks;
    result.errors = [...analysis.errors];
    result.inconsistencies = [...analysis.inconsistencies];

    console.log(`📋 Found ${analysis.inconsistencies.length} tasks to migrate`);

    // Migrate each inconsistent task
    for (const inconsistency of analysis.inconsistencies) {
      try {
        await migrateTaskToCorrectLocation(
          inconsistency.taskId,
          inconsistency.projectId,
          inconsistency.currentLocation,
          inconsistency.correctLocation
        );
        
        result.migratedTasks++;
        console.log(`✅ Migrated task ${inconsistency.taskId} from project ${inconsistency.projectId}`);

      } catch (error) {
        result.errors.push({
          taskId: inconsistency.taskId,
          projectId: inconsistency.projectId,
          error: `Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        console.error(`❌ Failed to migrate task ${inconsistency.taskId}:`, error);
      }
    }

    console.log(`🎉 Migration complete: ${result.migratedTasks} tasks migrated`);
    return result;

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

/**
 * Find the current storage location of a task
 */
async function findCurrentTaskLocation(projectId: number, taskId: number): Promise<string | null> {
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');

  try {
    const years = await fs.readdir(basePath);

    for (const year of years) {
      if (!year.match(/^\d{4}$/)) continue;

      const yearPath = path.join(basePath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        if (!month.match(/^\d{2}$/)) continue;

        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          if (!day.match(/^\d{2}$/)) continue;

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

    return null;
  } catch (error) {
    console.warn(`Error finding task location for ${projectId}/${taskId}:`, error);
    return null;
  }
}

/**
 * Migrate a single task to its correct location
 */
async function migrateTaskToCorrectLocation(
  taskId: number,
  projectId: number,
  currentLocation: string,
  correctLocation: string
): Promise<void> {
  // Read the task from current location
  const taskContent = await fs.readFile(currentLocation, 'utf-8');
  const task = JSON.parse(taskContent) as HierarchicalTask;

  // Update the lastModified timestamp
  const updatedTask = {
    ...task,
    lastModified: new Date().toISOString()
  };

  // Ensure the correct directory exists
  const correctDir = path.dirname(correctLocation);
  await ensureDirectoryExists(correctDir);

  // Write to correct location
  await fs.writeFile(correctLocation, JSON.stringify(updatedTask, null, 2));

  // Remove from old location
  await fs.unlink(currentLocation);

  // Try to clean up empty directories
  await cleanupEmptyDirectories(path.dirname(currentLocation));
}

/**
 * Clean up empty directories after migration
 */
async function cleanupEmptyDirectories(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      await fs.rmdir(dirPath);
      
      // Recursively clean up parent directories if they're empty
      const parentDir = path.dirname(dirPath);
      const basePath = path.join(process.cwd(), 'data', 'project-tasks');
      
      if (parentDir !== basePath && parentDir.startsWith(basePath)) {
        await cleanupEmptyDirectories(parentDir);
      }
    }
  } catch {
    // Directory not empty or other error, ignore
  }
}

/**
 * Validate task storage consistency after migration
 */
export async function validateTaskStorageConsistency(): Promise<{
  isConsistent: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    const analysis = await analyzeTaskStorageInconsistencies();
    
    if (analysis.inconsistencies.length > 0) {
      issues.push(`Found ${analysis.inconsistencies.length} tasks in wrong storage locations`);
    }
    
    if (analysis.errors.length > 0) {
      issues.push(`Found ${analysis.errors.length} tasks with errors`);
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
    
  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isConsistent: false,
      issues
    };
  }
}
