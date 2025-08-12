/**
 * Project-Task Consistency Validator
 * 
 * Validates consistency between project creation dates and task directory dates.
 * Emits warnings (not fatal) for inconsistencies and logs canonical paths.
 */

import * as path from 'path';
import { readJson, fileExists } from '../fs-json';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  canonicalPath: string;
  projectCreatedAt?: string;
  taskDateSpan?: {
    earliest: string;
    latest: string;
    dayCount: number;
  };
}

export interface ValidationOptions {
  logWarnings?: boolean;
  throwOnErrors?: boolean;
}

/**
 * Validate project-task consistency for a given project
 */
export async function validateProjectTaskConsistency(
  projectId: number,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const { logWarnings = true, throwOnErrors = false } = options;
  const warnings: string[] = [];
  const canonicalPath = path.join(process.cwd(), 'data', 'projects', projectId.toString(), 'tasks', 'tasks.json');
  
  try {
    // Get project creation date
    const projectCreatedAt = await getProjectCreationDate(projectId);
    if (!projectCreatedAt) {
      const warning = `Project ${projectId} not found or missing creation date`;
      warnings.push(warning);
      if (logWarnings) console.warn(`⚠️ ${warning}`);
      
      return {
        isValid: false,
        warnings,
        canonicalPath
      };
    }
    
    // Check if canonical tasks file exists
    const canonicalExists = await fileExists(canonicalPath);
    if (canonicalExists) {
      if (logWarnings) {
        console.log(`✅ Project ${projectId} uses canonical tasks file: ${canonicalPath}`);
      }
      
      return {
        isValid: true,
        warnings,
        canonicalPath,
        projectCreatedAt
      };
    }
    
    // Scan for scattered task files and check date consistency
    const taskDateSpan = await scanTaskDirectoryDates(projectId);
    if (!taskDateSpan) {
      const warning = `Project ${projectId} has no task files found`;
      warnings.push(warning);
      if (logWarnings) console.warn(`⚠️ ${warning}`);
      
      return {
        isValid: false,
        warnings,
        canonicalPath,
        projectCreatedAt
      };
    }
    
    // Validate date consistency
    const projectDate = new Date(projectCreatedAt);
    const earliestTaskDate = new Date(taskDateSpan.earliest);
    const latestTaskDate = new Date(taskDateSpan.latest);
    
    // Check if tasks predate project
    if (earliestTaskDate < projectDate) {
      const daysDiff = Math.ceil((projectDate.getTime() - earliestTaskDate.getTime()) / (1000 * 60 * 60 * 24));
      const warning = `Project ${projectId} has tasks that predate project creation by ${daysDiff} days (earliest: ${taskDateSpan.earliest}, project: ${projectCreatedAt})`;
      warnings.push(warning);
      if (logWarnings) console.warn(`⚠️ ${warning}`);
    }
    
    // Check if tasks span multiple days
    if (taskDateSpan.dayCount > 1) {
      const warning = `Project ${projectId} has tasks spanning ${taskDateSpan.dayCount} days (${taskDateSpan.earliest} to ${taskDateSpan.latest})`;
      warnings.push(warning);
      if (logWarnings) console.warn(`⚠️ ${warning}`);
    }
    
    // Log canonical path recommendation
    if (logWarnings) {
      console.log(`📋 Project ${projectId} should consolidate tasks to: ${canonicalPath}`);
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      canonicalPath,
      projectCreatedAt,
      taskDateSpan
    };
    
  } catch (error) {
    const errorMessage = `Failed to validate project ${projectId}: ${error}`;
    warnings.push(errorMessage);
    
    if (logWarnings) console.error(`❌ ${errorMessage}`);
    
    if (throwOnErrors) {
      throw new Error(errorMessage);
    }
    
    return {
      isValid: false,
      warnings,
      canonicalPath
    };
  }
}

/**
 * Get project creation date from hierarchical storage
 */
async function getProjectCreationDate(projectId: number): Promise<string | null> {
  try {
    // First check the projects index
    const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
    const index = await readJson<Record<string, string>>(indexPath, {});
    
    const createdAt = index[projectId.toString()];
    if (!createdAt) {
      return null;
    }
    
    // Verify project file exists
    const projectDate = new Date(createdAt);
    const year = projectDate.getFullYear();
    const month = String(projectDate.getMonth() + 1).padStart(2, '0');
    const day = String(projectDate.getDate()).padStart(2, '0');
    
    const projectPath = path.join(
      process.cwd(),
      'data',
      'projects',
      year.toString(),
      month,
      day,
      projectId.toString(),
      'project.json'
    );
    
    if (await fileExists(projectPath)) {
      const project = await readJson<any>(projectPath, null);
      return project?.createdAt || createdAt;
    }
    
    return createdAt;
  } catch (error) {
    console.warn(`⚠️ Could not get creation date for project ${projectId}: ${error}`);
    return null;
  }
}

/**
 * Scan task directories to find date span
 */
async function scanTaskDirectoryDates(projectId: number): Promise<{
  earliest: string;
  latest: string;
  dayCount: number;
} | null> {
  const { readdir, stat } = await import('fs/promises');
  const projectTasksBase = path.join(process.cwd(), 'data', 'project-tasks');
  const dates: string[] = [];
  
  try {
    // Scan hierarchical task structure
    await scanDirectoryForDates(projectTasksBase, projectId, dates);
    
    if (dates.length === 0) {
      return null;
    }
    
    // Sort dates and calculate span
    dates.sort();
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    
    // Count unique days
    const uniqueDays = new Set(dates.map(date => date.split('T')[0]));
    
    return {
      earliest,
      latest,
      dayCount: uniqueDays.size
    };
  } catch (error) {
    console.warn(`⚠️ Could not scan task directories for project ${projectId}: ${error}`);
    return null;
  }
}

/**
 * Recursively scan directory for task files and collect dates
 */
async function scanDirectoryForDates(
  dir: string,
  projectId: number,
  dates: string[]
): Promise<void> {
  try {
    const { readdir, stat } = await import('fs/promises');
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectoryForDates(fullPath, projectId, dates);
      } else if (entry.name.includes('task') && entry.name.endsWith('.json')) {
        try {
          const taskData = await readJson<any>(fullPath, null);
          if (taskData && taskData.projectId === projectId) {
            // Extract date from file path or task data
            const fileStats = await stat(fullPath);
            const taskDate = taskData.createdDate || taskData.lastModified || fileStats.mtime.toISOString();
            dates.push(taskDate);
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - that's okay
  }
}

/**
 * Validate multiple projects at once
 */
export async function validateMultipleProjects(
  projectIds: number[],
  options: ValidationOptions = {}
): Promise<Record<number, ValidationResult>> {
  const results: Record<number, ValidationResult> = {};
  
  for (const projectId of projectIds) {
    results[projectId] = await validateProjectTaskConsistency(projectId, options);
  }
  
  return results;
}

/**
 * Get validation summary for reporting
 */
export function getValidationSummary(results: Record<number, ValidationResult>): {
  totalProjects: number;
  validProjects: number;
  projectsWithWarnings: number;
  totalWarnings: number;
  commonIssues: Record<string, number>;
} {
  const projectIds = Object.keys(results).map(Number);
  const validProjects = projectIds.filter(id => results[id].isValid);
  const projectsWithWarnings = projectIds.filter(id => results[id].warnings.length > 0);
  
  // Count common issues
  const commonIssues: Record<string, number> = {};
  for (const result of Object.values(results)) {
    for (const warning of result.warnings) {
      if (warning.includes('predate')) {
        commonIssues['Tasks predate project'] = (commonIssues['Tasks predate project'] || 0) + 1;
      } else if (warning.includes('spanning')) {
        commonIssues['Tasks span multiple days'] = (commonIssues['Tasks span multiple days'] || 0) + 1;
      } else if (warning.includes('not found')) {
        commonIssues['Project not found'] = (commonIssues['Project not found'] || 0) + 1;
      } else if (warning.includes('no task files')) {
        commonIssues['No task files'] = (commonIssues['No task files'] || 0) + 1;
      }
    }
  }
  
  return {
    totalProjects: projectIds.length,
    validProjects: validProjects.length,
    projectsWithWarnings: projectsWithWarnings.length,
    totalWarnings: Object.values(results).reduce((sum, result) => sum + result.warnings.length, 0),
    commonIssues
  };
}
