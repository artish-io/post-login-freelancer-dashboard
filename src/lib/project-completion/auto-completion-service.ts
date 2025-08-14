/**
 * Auto-Project Completion Service
 * 
 * Handles automatic project status updates when all tasks are approved,
 * with proper validation and state management
 */

import { UnifiedStorageService } from '../storage/unified-storage-service';
import { listTasksByProject } from '../../app/api/payments/repos/tasks-repo';
import { getProjectById, updateProject as updateProjectRepo } from '../../app/api/payments/repos/projects-repo';
import { normalizeTaskStatus } from '../../app/api/payments/domain/types';
import { readProject } from '../projects-utils';
import { readProjectTasks } from '../project-tasks/hierarchical-storage';

export interface ProjectCompletionResult {
  projectId: number;
  previousStatus: string;
  newStatus: string;
  allTasksApproved: boolean;
  totalTasks: number;
  approvedTasks: number;
  statusChanged: boolean;
  message: string;
}

export interface ProjectCompletionCheck {
  shouldComplete: boolean;
  reason: string;
  tasksSummary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

/**
 * Check if a project should be auto-completed based on task status
 */
export async function checkProjectCompletionEligibility(projectId: number): Promise<ProjectCompletionCheck> {
  try {
    // Get project information
    const project = await readProject(projectId);
    if (!project) {
      return {
        shouldComplete: false,
        reason: 'Project not found',
        tasksSummary: { total: 0, approved: 0, pending: 0, rejected: 0 }
      };
    }

    // Skip if project is already completed
    if (project.status?.toLowerCase() === 'completed') {
      return {
        shouldComplete: false,
        reason: 'Project already completed',
        tasksSummary: { total: 0, approved: 0, pending: 0, rejected: 0 }
      };
    }

    // Get tasks from hierarchical storage first (faster), fallback to repo if needed
    let tasks = await readProjectTasks(projectId);

    // Only query repo if hierarchical storage is empty
    if (tasks.length === 0) {
      tasks = await listTasksByProject(projectId);
    }

    if (tasks.length === 0) {
      return {
        shouldComplete: false,
        reason: 'No tasks found for project',
        tasksSummary: { total: 0, approved: 0, pending: 0, rejected: 0 }
      };
    }

    // Analyze task statuses
    const tasksSummary = {
      total: tasks.length,
      approved: 0,
      pending: 0,
      rejected: 0
    };

    for (const task of tasks) {
      const normalizedStatus = normalizeTaskStatus(task.status);
      
      if (normalizedStatus === 'approved' || task.completed === true) {
        tasksSummary.approved++;
      } else if (normalizedStatus === 'rejected' || task.rejected === true) {
        tasksSummary.rejected++;
      } else {
        tasksSummary.pending++;
      }
    }

    // Project should be completed if all tasks are approved
    const shouldComplete = tasksSummary.approved === tasksSummary.total && tasksSummary.total > 0;
    
    const reason = shouldComplete 
      ? 'All tasks are approved'
      : `${tasksSummary.pending} tasks pending, ${tasksSummary.rejected} tasks rejected`;

    return {
      shouldComplete,
      reason,
      tasksSummary
    };

  } catch (error) {
    console.error(`Error checking project completion eligibility for project ${projectId}:`, error);
    return {
      shouldComplete: false,
      reason: `Error checking eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tasksSummary: { total: 0, approved: 0, pending: 0, rejected: 0 }
    };
  }
}

/**
 * Auto-complete a project if all tasks are approved
 */
export async function autoCompleteProject(projectId: number): Promise<ProjectCompletionResult> {
  try {
    console.log(`🔍 Checking auto-completion for project ${projectId}...`);

    // Check eligibility first
    const eligibilityCheck = await checkProjectCompletionEligibility(projectId);
    
    if (!eligibilityCheck.shouldComplete) {
      return {
        projectId,
        previousStatus: 'unknown',
        newStatus: 'unknown',
        allTasksApproved: false,
        totalTasks: eligibilityCheck.tasksSummary.total,
        approvedTasks: eligibilityCheck.tasksSummary.approved,
        statusChanged: false,
        message: `Project not eligible for completion: ${eligibilityCheck.reason}`
      };
    }

    // Get current project status using unified storage
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const previousStatus = project.status || 'unknown';

    // Update project status to completed using unified storage
    await UnifiedStorageService.writeProject({
      ...project,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Also update in repo storage for consistency
    try {
      const repoProject = await getProjectById(projectId);
      if (repoProject) {
        await updateProjectRepo(projectId, { 
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (repoError) {
      console.warn(`Failed to update project ${projectId} in repo storage:`, repoError);
      // Don't fail the main operation if repo update fails
    }

    console.log(`✅ Auto-completed project ${projectId}: ${previousStatus} → completed`);

    return {
      projectId,
      previousStatus,
      newStatus: 'completed',
      allTasksApproved: true,
      totalTasks: eligibilityCheck.tasksSummary.total,
      approvedTasks: eligibilityCheck.tasksSummary.approved,
      statusChanged: true,
      message: `Project auto-completed: all ${eligibilityCheck.tasksSummary.total} tasks approved`
    };

  } catch (error) {
    console.error(`❌ Error auto-completing project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Check and auto-complete project if eligible (safe wrapper)
 */
export async function checkAndAutoCompleteProject(projectId: number): Promise<ProjectCompletionResult> {
  try {
    return await autoCompleteProject(projectId);
  } catch (error) {
    console.error(`Error in checkAndAutoCompleteProject for project ${projectId}:`, error);
    return {
      projectId,
      previousStatus: 'unknown',
      newStatus: 'unknown',
      allTasksApproved: false,
      totalTasks: 0,
      approvedTasks: 0,
      statusChanged: false,
      message: `Error during auto-completion: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Batch check and auto-complete multiple projects
 */
export async function batchAutoCompleteProjects(projectIds: number[]): Promise<ProjectCompletionResult[]> {
  const results: ProjectCompletionResult[] = [];
  
  for (const projectId of projectIds) {
    try {
      const result = await checkAndAutoCompleteProject(projectId);
      results.push(result);
    } catch (error) {
      console.error(`Error processing project ${projectId} in batch:`, error);
      results.push({
        projectId,
        previousStatus: 'unknown',
        newStatus: 'unknown',
        allTasksApproved: false,
        totalTasks: 0,
        approvedTasks: 0,
        statusChanged: false,
        message: `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  return results;
}

/**
 * Find all projects that are eligible for auto-completion
 */
export async function findProjectsEligibleForCompletion(): Promise<number[]> {
  try {
    // This would need to be implemented based on your project storage structure
    // For now, return empty array - this should be implemented when you have
    // a way to list all active projects
    console.log('🔍 Finding projects eligible for auto-completion...');
    
    // TODO: Implement project listing logic
    // const allProjects = await listAllActiveProjects();
    // const eligibleProjects = [];
    // 
    // for (const project of allProjects) {
    //   const check = await checkProjectCompletionEligibility(project.projectId);
    //   if (check.shouldComplete) {
    //     eligibleProjects.push(project.projectId);
    //   }
    // }
    // 
    // return eligibleProjects;
    
    return [];
  } catch (error) {
    console.error('Error finding projects eligible for completion:', error);
    return [];
  }
}
