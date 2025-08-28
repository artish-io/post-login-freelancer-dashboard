// src/app/api/tasks/services/task-service.ts
// Pure business logic for task operations (no I/O)
// Routes handle persistence and event emission

import { TaskRecord } from '@/app/api/payments/repos/tasks-repo';
import { TaskStatus } from '@/app/api/payments/domain/types';

export interface TaskApprovalResult {
  taskPatch: Partial<TaskRecord>;
  shouldNotify: boolean;
  nextTaskId?: number | string;
}

export interface TaskRejectionResult {
  taskPatch: Partial<TaskRecord>;
  shouldNotify: boolean;
  rejectionReason?: string;
}

export interface TaskSubmissionResult {
  taskPatch: Partial<TaskRecord>;
  shouldNotify: boolean;
}

export class TaskService {
  /**
   * Approve a task - pure business logic
   * Returns the patch to apply and whether to send notifications
   */
  static approveTask(
    task: TaskRecord,
    actorId: number | string,
    actorType: 'freelancer' | 'commissioner'
  ): TaskApprovalResult {
    // Validate actor permissions
    if (actorType !== 'commissioner') {
      throw new Error('Only commissioners can approve tasks');
    }

    // Validate current status
    if (task.status !== 'In review') {
      throw new Error(`Cannot approve task with status: ${task.status}`);
    }

    // Create the patch
    const taskPatch: Partial<TaskRecord> = {
      status: 'Approved',
      completed: true,
      updatedAt: new Date().toISOString(),
      approvedBy: actorId,
      approvedAt: new Date().toISOString(),
    };

    return {
      taskPatch,
      shouldNotify: true,
    };
  }

  /**
   * Reject a task with optional reason
   */
  static rejectTask(
    task: TaskRecord,
    actorId: number | string,
    actorType: 'freelancer' | 'commissioner',
    rejectionReason?: string
  ): TaskRejectionResult {
    // Validate actor permissions
    if (actorType !== 'commissioner') {
      throw new Error('Only commissioners can reject tasks');
    }

    // Validate current status
    if (task.status !== 'In review') {
      throw new Error(`Cannot reject task with status: ${task.status}`);
    }

    // Create the patch
    const taskPatch: Partial<TaskRecord> = {
      status: 'Ongoing', // Reset to ongoing for rework
      completed: false,
      rejected: true,
      updatedAt: new Date().toISOString(),
      rejectedBy: actorId,
      rejectedAt: new Date().toISOString(),
      rejectionReason,
      // Increment feedback count if it exists
      feedbackCount: (task.feedbackCount || 0) + 1,
    };

    return {
      taskPatch,
      shouldNotify: true,
      rejectionReason,
    };
  }

  /**
   * Submit a task for review
   */
  static submitTask(
    task: TaskRecord,
    actorId: number | string,
    actorType: 'freelancer' | 'commissioner',
    submissionData?: {
      workingFileUrl?: string;
      notes?: string;
    }
  ): TaskSubmissionResult {
    // Validate actor permissions
    if (actorType !== 'freelancer') {
      throw new Error('Only freelancers can submit tasks');
    }

    // Validate current status
    if (task.status !== 'Ongoing') {
      throw new Error(`Cannot submit task with status: ${task.status}`);
    }

    // Create the patch
    const taskPatch: Partial<TaskRecord> = {
      status: 'In review',
      completed: false, // Not completed until approved
      rejected: false, // Clear any previous rejection
      updatedAt: new Date().toISOString(),
      submittedBy: actorId,
      submittedAt: new Date().toISOString(),
      workingFileUrl: submissionData?.workingFileUrl,
      submissionNotes: submissionData?.notes,
      // Only increment version if task was previously rejected (resubmission)
      version: task.rejected ? (task.version || 1) + 1 : (task.version || 1),
    };

    return {
      taskPatch,
      shouldNotify: true,
    };
  }

  /**
   * Validate task status transition
   */
  static canTransitionStatus(
    currentStatus: string,
    newStatus: string,
    actorType: 'freelancer' | 'commissioner'
  ): { ok: boolean; reason?: string } {
    const validTransitions: Record<string, string[]> = {
      'Ongoing': ['In review'],
      'In review': ['Approved', 'Ongoing'], // Ongoing = rejected/needs rework
      'Approved': [], // Final state
      'Rejected': ['Ongoing'], // Can restart work
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        ok: false,
        reason: `Invalid transition from ${currentStatus} to ${newStatus}`,
      };
    }

    // Additional business rules based on actor type
    if (newStatus === 'In review' && actorType !== 'freelancer') {
      return {
        ok: false,
        reason: 'Only freelancers can submit tasks for review',
      };
    }

    if ((newStatus === 'Approved' || (newStatus === 'Ongoing' && currentStatus === 'In review')) && actorType !== 'commissioner') {
      return {
        ok: false,
        reason: 'Only commissioners can approve or reject tasks',
      };
    }

    return { ok: true };
  }

  /**
   * Check if a task is eligible for submission
   */
  static canSubmitTask(task: TaskRecord): { ok: boolean; reason?: string } {
    if (task.status !== 'Ongoing') {
      return {
        ok: false,
        reason: `Task must be in 'Ongoing' status to submit (current: ${task.status})`,
      };
    }

    // Check if task has required fields (could be extended)
    if (!task.title || task.title.trim() === '') {
      return {
        ok: false,
        reason: 'Task must have a title to be submitted',
      };
    }

    return { ok: true };
  }

  /**
   * Check if a task is eligible for approval
   */
  static canApproveTask(task: TaskRecord): { ok: boolean; reason?: string } {
    if (task.status !== 'In review') {
      return {
        ok: false,
        reason: `Task must be in 'In review' status to approve (current: ${task.status})`,
      };
    }

    return { ok: true };
  }

  /**
   * Calculate task priority based on due date and status
   */
  static calculateTaskPriority(task: TaskRecord): 'high' | 'medium' | 'low' {
    if (!task.dueDate) return 'low';

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // High priority: overdue or due within 2 days
    if (daysUntilDue <= 2) return 'high';
    
    // Medium priority: due within a week
    if (daysUntilDue <= 7) return 'medium';
    
    // Low priority: due later
    return 'low';
  }

  /**
   * Check if a task is overdue
   */
  static isTaskOverdue(task: TaskRecord): boolean {
    if (!task.dueDate) return false;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    
    return now > dueDate && task.status !== 'Approved';
  }

  /**
   * Get next task in sequence (for workflow automation)
   */
  static getNextTaskInSequence(
    currentTask: TaskRecord,
    allProjectTasks: TaskRecord[]
  ): TaskRecord | undefined {
    // Sort tasks by order
    const sortedTasks = allProjectTasks
      .filter(t => t.projectId === currentTask.projectId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = sortedTasks.findIndex(t => t.id === currentTask.id);
    
    if (currentIndex === -1 || currentIndex === sortedTasks.length - 1) {
      return undefined; // No next task
    }

    return sortedTasks[currentIndex + 1];
  }

  /**
   * Calculate project completion percentage based on tasks
   */
  static calculateProjectProgress(tasks: TaskRecord[]): number {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.status === 'Approved');
    return Math.round((completedTasks.length / tasks.length) * 100);
  }

  /**
   * Get task summary statistics for a project
   */
  static getTaskSummary(tasks: TaskRecord[]): {
    total: number;
    ongoing: number;
    inReview: number;
    approved: number;
    overdue: number;
  } {
    const summary = {
      total: tasks.length,
      ongoing: 0,
      inReview: 0,
      approved: 0,
      overdue: 0,
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'Ongoing':
          summary.ongoing++;
          break;
        case 'In review':
          summary.inReview++;
          break;
        case 'Approved':
          summary.approved++;
          break;
      }

      if (this.isTaskOverdue(task)) {
        summary.overdue++;
      }
    });

    return summary;
  }
}
