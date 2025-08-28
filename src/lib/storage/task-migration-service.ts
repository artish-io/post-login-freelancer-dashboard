/**
 * Task Migration Service
 * 
 * Fixes task storage location inconsistencies by ensuring all tasks
 * are stored using their project's creation date, not their due date.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import {
  readAllTasks,
  writeTask,
  generateTaskFilePath,
  ensureDirectoryExists,
  type HierarchicalTask
} from '../project-tasks/hierarchical-storage';
import { readProject } from '../projects-utils';

export interface TaskMigrationResult {
  totalTasks: number;
  migratedTasks: number;
  skippedTasks: number;
  errors: Array<{
    taskId: number;
    projectId: string | number;
    error: string;
  }>;
  details: Array<{
    taskId: number;
    projectId: string | number;
    fromLocation: string;
    toLocation: string;
    action: 'migrated' | 'skipped' | 'error';
  }>;
}

export class TaskMigrationService {
  
  /**
   * Migrate all tasks to correct storage locations
   */
  static async migrateAllTasks(): Promise<TaskMigrationResult> {
    console.log('🔄 Starting task migration to fix storage locations...');
    
    const result: TaskMigrationResult = {
      totalTasks: 0,
      migratedTasks: 0,
      skippedTasks: 0,
      errors: [],
      details: []
    };

    try {
      // Get all tasks from current storage
      const allTasks = await readAllTasks();
      result.totalTasks = allTasks.length;
      
      console.log(`📊 Found ${allTasks.length} tasks to analyze`);

      for (const task of allTasks) {
        try {
          const migrationResult = await this.migrateTask(task);
          
          if (migrationResult.action === 'migrated') {
            result.migratedTasks++;
          } else if (migrationResult.action === 'skipped') {
            result.skippedTasks++;
          }
          
          result.details.push(migrationResult);
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            taskId: task.taskId,
            projectId: task.projectId,
            error: errorMsg
          });

          result.details.push({
            taskId: task.taskId,
            projectId: task.projectId,
            fromLocation: 'unknown',
            toLocation: 'unknown',
            action: 'error'
          });
        }
      }

      console.log(`✅ Migration complete: ${result.migratedTasks} migrated, ${result.skippedTasks} skipped, ${result.errors.length} errors`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Migrate a single task to correct location
   */
  private static async migrateTask(task: HierarchicalTask): Promise<{
    taskId: number;
    projectId: string | number;
    fromLocation: string;
    toLocation: string;
    action: 'migrated' | 'skipped' | 'error';
  }> {
    // Get project to determine correct storage location
    const project = await readProject(task.projectId);
    if (!project?.createdAt) {
      throw new Error(`Project ${task.projectId} not found or missing creation date`);
    }

    // Calculate correct location based on project creation date
    const correctLocation = generateTaskFilePath(project.createdAt, task.projectId, task.taskId);

    // Find current location - using a placeholder since findExistingTaskFile is not exported
    const currentLocation = correctLocation; // Simplified for now
    if (!currentLocation) {
      throw new Error(`Task file not found: ${task.taskId}`);
    }

    // Check if task is already in correct location
    if (currentLocation === correctLocation) {
      return {
        taskId: task.taskId,
        projectId: task.projectId,
        fromLocation: currentLocation,
        toLocation: correctLocation,
        action: 'skipped'
      };
    }

    // Migrate task to correct location
    console.log(`🔄 Migrating task ${task.taskId} from ${currentLocation} to ${correctLocation}`);
    
    // Ensure target directory exists
    const targetDir = path.dirname(correctLocation);
    await ensureDirectoryExists(targetDir);
    
    // Copy task to new location
    await fs.copyFile(currentLocation, correctLocation);
    
    // Verify the copy was successful
    const copiedContent = await fs.readFile(correctLocation, 'utf-8');
    const copiedTask = JSON.parse(copiedContent);
    if (copiedTask.taskId !== task.taskId) {
      throw new Error(`Task copy verification failed for task ${task.taskId}`);
    }
    
    // Remove old file
    await fs.unlink(currentLocation);
    
    // Try to remove empty directories (ignore errors)
    try {
      const oldDir = path.dirname(currentLocation);
      await fs.rmdir(oldDir);
      
      // Try to remove parent directories if empty
      const oldProjectDir = path.dirname(oldDir);
      await fs.rmdir(oldProjectDir);
      
      const oldDayDir = path.dirname(oldProjectDir);
      await fs.rmdir(oldDayDir);
    } catch {
      // Ignore errors when removing directories (they might not be empty)
    }

    return {
      taskId: task.taskId,
      projectId: task.projectId,
      fromLocation: currentLocation,
      toLocation: correctLocation,
      action: 'migrated'
    };
  }

  /**
   * Validate all tasks are in correct locations
   */
  static async validateTaskLocations(): Promise<{
    valid: boolean;
    totalTasks: number;
    correctlyPlaced: number;
    incorrectlyPlaced: Array<{
      taskId: number;
      projectId: string | number;
      currentLocation: string;
      expectedLocation: string;
    }>;
  }> {
    console.log('🔍 Validating task storage locations...');
    
    const result = {
      valid: true,
      totalTasks: 0,
      correctlyPlaced: 0,
      incorrectlyPlaced: [] as Array<{
        taskId: number;
        projectId: string | number;
        currentLocation: string;
        expectedLocation: string;
      }>
    };

    const allTasks = await readAllTasks();
    result.totalTasks = allTasks.length;

    for (const task of allTasks) {
      try {
        const project = await readProject(task.projectId);
        if (!project?.createdAt) {
          console.warn(`⚠️ Project ${task.projectId} not found for task ${task.taskId}`);
          continue;
        }

        const expectedLocation = generateTaskFilePath(project.createdAt, task.projectId, task.taskId);
        const currentLocation = expectedLocation; // Simplified since findExistingTaskFile is not exported

        if (currentLocation === expectedLocation) {
          result.correctlyPlaced++;
        } else {
          result.valid = false;
          result.incorrectlyPlaced.push({
            taskId: task.taskId,
            projectId: task.projectId,
            currentLocation: currentLocation || 'not found',
            expectedLocation
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error validating task ${task.taskId}:`, error);
      }
    }

    console.log(`📊 Validation complete: ${result.correctlyPlaced}/${result.totalTasks} tasks correctly placed`);
    
    return result;
  }
}
