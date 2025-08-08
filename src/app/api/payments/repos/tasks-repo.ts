/**
 * Tasks Repository - Compatibility Wrapper
 * 
 * This file provides backward compatibility for the deprecated repository pattern.
 * It wraps the new unified storage system to maintain API compatibility.
 * 
 * @deprecated Use UnifiedStorageService directly for new code
 */

import { readAllTasks as readTasksFromStorage, writeTask } from '@/lib/project-tasks/hierarchical-storage';
import { UnifiedStorageService, UnifiedTask } from '@/lib/storage/unified-storage-service';

// Legacy task record interface for backward compatibility
export interface TaskRecord {
  id?: number;
  taskId: number;
  projectId: number;
  projectTitle?: string;
  organizationId?: number;
  projectTypeTags?: string[];
  freelancerId?: number;
  title: string;
  description?: string;
  status: 'Ongoing' | 'In review' | 'Approved' | 'Rejected' | 'Submitted';
  completed: boolean;
  order: number;
  link?: string;
  dueDate: string;
  rejected?: boolean;
  feedbackCount?: number;
  pushedBack?: boolean;
  version?: number;
  createdDate?: string;
  lastModified?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedBy?: number | string;
  submittedAt?: string;
  approvedBy?: number | string;
  approvedAt?: string;
  rejectedBy?: number | string;
  rejectedAt?: string;
  workingFileUrl?: string;
  submissionNotes?: string;
  rejectionReason?: string;
  assigneeId?: number;
}

/**
 * Read all tasks from hierarchical storage
 * @deprecated Use UnifiedStorageService.getAllTasks() instead
 */
export async function readAllTasks(): Promise<TaskRecord[]> {
  try {
    console.warn('⚠️ Using deprecated readAllTasks from tasks-repo. Consider migrating to UnifiedStorageService.');
    const tasks = await readTasksFromStorage();
    
    // Convert to legacy format for backward compatibility
    return tasks.map(task => ({
      id: task.taskId,
      taskId: task.taskId,
      projectId: task.projectId,
      projectTitle: task.projectTitle,
      organizationId: task.organizationId,
      projectTypeTags: task.projectTypeTags,
      freelancerId: task.freelancerId,
      title: task.title,
      description: task.description,
      status: task.status as any,
      completed: task.completed,
      order: task.order,
      link: task.link,
      dueDate: task.dueDate,
      rejected: task.rejected,
      feedbackCount: task.feedbackCount,
      pushedBack: task.pushedBack,
      version: task.version,
      createdDate: task.createdDate,
      lastModified: task.lastModified,
      createdAt: task.createdDate,
      updatedAt: task.lastModified
    }));
  } catch (error) {
    console.error('Error reading tasks from storage:', error);
    throw error;
  }
}

/**
 * Get tasks by project ID
 * @deprecated Use UnifiedStorageService.getTasksByProject() instead
 */
export async function listTasksByProject(projectId: number): Promise<TaskRecord[]> {
  try {
    console.warn('⚠️ Using deprecated listTasksByProject from tasks-repo. Consider migrating to UnifiedStorageService.');
    const allTasks = await readAllTasks();
    return allTasks.filter(task => task.projectId === projectId);
  } catch (error) {
    console.error(`Error reading tasks for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get task by ID
 * @deprecated Use UnifiedStorageService.getTaskById() instead
 */
export async function getTaskById(taskId: number): Promise<TaskRecord | null> {
  try {
    console.warn('⚠️ Using deprecated getTaskById from tasks-repo. Consider migrating to UnifiedStorageService.');
    const allTasks = await readAllTasks();
    return allTasks.find(task => task.taskId === taskId) || null;
  } catch (error) {
    console.error(`Error reading task ${taskId}:`, error);
    return null;
  }
}

/**
 * Create or update a task
 * @deprecated Use UnifiedStorageService.saveTask() instead
 */
export async function saveTask(task: TaskRecord): Promise<TaskRecord> {
  try {
    console.warn('⚠️ Using deprecated saveTask from tasks-repo. Consider migrating to UnifiedStorageService.');
    
    // Convert to unified format
    const unifiedTask: UnifiedTask = {
      taskId: task.taskId,
      projectId: task.projectId,
      projectTitle: task.projectTitle || '',
      organizationId: task.organizationId || 0,
      projectTypeTags: task.projectTypeTags || [],
      freelancerId: task.freelancerId,
      title: task.title,
      description: task.description || '',
      status: task.status,
      completed: task.completed,
      order: task.order,
      link: task.link || '',
      dueDate: task.dueDate,
      rejected: task.rejected || false,
      feedbackCount: task.feedbackCount || 0,
      pushedBack: task.pushedBack || false,
      version: task.version || 1,
      createdDate: task.createdDate || new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    await writeTask(unifiedTask);
    
    // Return in legacy format
    return {
      ...task,
      lastModified: unifiedTask.lastModified,
      updatedAt: unifiedTask.lastModified
    };
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
}

/**
 * Update task status
 * @deprecated Use UnifiedTaskService instead
 */
export async function updateTaskStatus(
  taskId: number, 
  status: TaskRecord['status'], 
  additionalUpdates?: Partial<TaskRecord>
): Promise<TaskRecord | null> {
  try {
    console.warn('⚠️ Using deprecated updateTaskStatus from tasks-repo. Consider migrating to UnifiedTaskService.');
    
    const existingTask = await getTaskById(taskId);
    if (!existingTask) {
      return null;
    }
    
    const updatedTask = {
      ...existingTask,
      status,
      ...additionalUpdates,
      lastModified: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return await saveTask(updatedTask);
  } catch (error) {
    console.error(`Error updating task ${taskId} status:`, error);
    throw error;
  }
}

/**
 * Delete a task
 * @deprecated Use UnifiedStorageService.deleteTask() instead
 */
export async function deleteTask(taskId: number): Promise<boolean> {
  try {
    console.warn('⚠️ Using deprecated deleteTask from tasks-repo. Consider migrating to UnifiedStorageService.');
    // Note: This would need to be implemented in the unified storage service
    console.warn('⚠️ Task deletion not implemented in compatibility layer. Use UnifiedStorageService directly.');
    return false;
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return false;
  }
}
