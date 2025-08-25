// src/app/api/projects/services/project-service.ts
// Pure business logic for project operations (no I/O)
// Routes handle persistence and event emission

import { ProjectRecord } from '@/app/api/payments/repos/projects-repo';
import { TaskRecord } from '@/app/api/payments/repos/tasks-repo';
import { InvoicingMethod, ProjectStatus } from '@/app/api/payments/domain/types';
import { generateProjectId, generateTaskId, generateOrganizationProjectId } from '@/lib/utils/id-generation';

export interface GigLike {
  id: number;
  title: string;
  organizationId: number;
  commissionerId?: number;
  category: string;
  subcategory?: string;
  tags: string[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  description: string;
  deliveryTimeWeeks: number;
  estimatedHours: number;
  status: 'Available' | 'Unavailable' | 'Closed';
  toolsRequired: string[];
  executionMethod?: 'completion' | 'milestone';
  invoicingMethod?: 'completion' | 'milestone';
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>;
  startType?: 'Immediately' | 'Custom';
  customStartDate?: string;
  endDate?: string;
  lowerBudget?: number;
  upperBudget?: number;
  postedDate: string;
  notes?: string;
  isPublic?: boolean;
  isTargetedRequest?: boolean;
}

export interface AcceptGigResult {
  project: ProjectRecord;
  tasks: TaskRecord[];
  gigUpdate: Partial<GigLike>;
}

export interface AcceptGigParams {
  gig: GigLike;
  freelancerId: number;
  commissionerId?: number;
  projectId?: string;
  organizationName?: string;
  existingProjectIds?: Set<string>;
}

export class ProjectService {
  /**
   * Accept a gig and create a project with default tasks
   * Pure business logic - caller handles persistence and events
   */
  static acceptGig(params: AcceptGigParams): AcceptGigResult {
    const { gig, freelancerId, commissionerId, projectId, organizationName, existingProjectIds } = params;

    // Validate gig is available
    if (gig.status !== 'Available') {
      throw new Error(`Cannot accept gig with status: ${gig.status}`);
    }

    // Determine commissioner (from gig or parameter)
    const finalCommissionerId = commissionerId ?? gig.commissionerId;
    if (!finalCommissionerId) {
      throw new Error('Commissioner ID is required to accept gig');
    }

    // Generate project ID if not provided
    const finalProjectId = projectId ?? this.generateProjectId(organizationName, existingProjectIds);

    // Calculate due date from activation time (now) to preserve project duration
    const activationDate = new Date();
    const dueDate = this.calculateDueDate(gig.deliveryTimeWeeks, gig.endDate, activationDate);

    // Create project record with clear date separation and duration persistence
    const project: ProjectRecord = {
      projectId: finalProjectId,
      title: gig.title,
      status: 'ongoing' as ProjectStatus,
      invoicingMethod: (gig.invoicingMethod || gig.executionMethod || 'completion') as InvoicingMethod,
      currency: 'USD', // Default currency - could be configurable
      commissionerId: finalCommissionerId,
      freelancerId,
      totalBudget: gig.upperBudget || gig.lowerBudget,
      paidToDate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Additional metadata from gig
      organizationId: gig.organizationId,
      description: gig.description,
      // Note: category/subcategory not in ProjectRecord type, stored in typeTags instead
      typeTags: gig.tags,
      dueDate,

      // 🛡️ DURATION GUARD: Clear date separation and duration persistence
      gigId: gig.id,
      gigPostedDate: gig.postedDate,
      projectActivatedAt: activationDate.toISOString(),
      originalDuration: {
        deliveryTimeWeeks: gig.deliveryTimeWeeks,
        estimatedHours: gig.estimatedHours,
        originalStartDate: gig.startType === 'Custom' ? gig.customStartDate : undefined,
        originalEndDate: gig.endDate,
      },
      // Legacy fields for backward compatibility
      deliveryTimeWeeks: gig.deliveryTimeWeeks,
      estimatedHours: gig.estimatedHours,
    };

    // Generate default tasks based on gig type
    const tasks = this.generateDefaultTasks(finalProjectId, gig, activationDate);

    // Add totalTasks to project based on generated tasks count
    const projectWithTotalTasks = {
      ...project,
      totalTasks: tasks.length
    };

    // Mark gig as unavailable
    const gigUpdate: Partial<GigLike> = {
      status: 'Unavailable',
    };

    return {
      project: projectWithTotalTasks,
      tasks,
      gigUpdate,
    };
  }

  /**
   * Generate a unique project ID using organization-based format or fallback to numeric
   * Delegates to centralized ID generation utility
   */
  private static generateProjectId(organizationName?: string, existingProjectIds?: Set<string>): string {
    if (organizationName && existingProjectIds) {
      return generateOrganizationProjectId(organizationName, existingProjectIds);
    }
    // Fallback to numeric ID for backward compatibility
    return generateProjectId().toString();
  }

  /**
   * Calculate project due date based on delivery time and optional end date
   * 🛡️ DURATION GUARD: Always calculate from activation date to preserve project duration
   * regardless of when the project was originally scheduled to start/end
   */
  private static calculateDueDate(deliveryTimeWeeks: number, endDate?: string, activationDate?: Date): string {
    const activationTime = activationDate || new Date();

    // 🛡️ GUARD: Always calculate from activation date to preserve duration
    // This ensures that if a 3-day project was meant to run Jan 1-3 but gets activated on Jan 3,
    // it will now run Jan 3-6 (preserving the 3-day duration)
    if (deliveryTimeWeeks > 0) {
      const dueDate = new Date(activationTime.getTime() + deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000);
      return dueDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // Fallback: If no delivery time specified, use original endDate or default to 1 week
    if (endDate) {
      return endDate;
    }

    const defaultDueDate = new Date(activationTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    return defaultDueDate.toISOString().split('T')[0];
  }

  /**
   * Generate default tasks based on gig configuration
   */
  private static generateDefaultTasks(projectId: string, gig: GigLike, activationDate?: Date): TaskRecord[] {
    const tasks: TaskRecord[] = [];
    const now = new Date().toISOString();

    if (gig.milestones && gig.milestones.length > 0) {
      // Create tasks from milestones
      gig.milestones.forEach((milestone, index) => {
        const taskId = this.generateTaskId();
        tasks.push({
          id: taskId,
          taskId: taskId,
          projectId,
          title: milestone.title,
          status: index === 0 ? 'Ongoing' : 'Ongoing', // First task starts as ongoing
          completed: false,
          assigneeId: undefined, // Will be set by freelancer
          dueDate: milestone.endDate,
          createdAt: now,
          updatedAt: now,
          description: milestone.description,
          order: index + 1,
          // Note: milestoneId not in TaskRecord type, can be stored in description or custom field
        });
      });
    } else {
      // Create default tasks based on invoicing method
      if (gig.invoicingMethod === 'milestone' || gig.executionMethod === 'milestone') {
        // Create 3 default milestone tasks
        const milestoneCount = 3;
        const deliveryDays = gig.deliveryTimeWeeks * 7;
        const taskDuration = Math.floor(deliveryDays / milestoneCount);

        for (let i = 0; i < milestoneCount; i++) {
          const taskDueDate = new Date();
          taskDueDate.setDate(taskDueDate.getDate() + (i + 1) * taskDuration);
          const taskId = this.generateTaskId();

          tasks.push({
            id: taskId,
            taskId: taskId,
            projectId,
            title: `Milestone ${i + 1}`,
            status: i === 0 ? 'Ongoing' : 'Ongoing',
            completed: false,
            assigneeId: undefined,
            dueDate: taskDueDate.toISOString().split('T')[0],
            createdAt: now,
            updatedAt: now,
            description: `Milestone ${i + 1} for ${gig.title}`,
            order: i + 1,
          });
        }
      } else {
        // Create single completion task
        const taskId = this.generateTaskId();
        tasks.push({
          id: taskId,
          taskId: taskId,
          projectId,
          title: `Complete ${gig.title}`,
          status: 'Ongoing',
          completed: false,
          assigneeId: undefined,
          dueDate: this.calculateDueDate(gig.deliveryTimeWeeks, gig.endDate, activationDate),
          createdAt: now,
          updatedAt: now,
          description: gig.description,
          order: 1,

          // 🛡️ DURATION GUARD: Task-level duration information
          taskActivatedAt: now,
          originalTaskDuration: {
            estimatedHours: gig.estimatedHours,
            originalDueDate: gig.endDate,
          },
        });
      }
    }

    return tasks;
  }

  /**
   * Generate a unique task ID using enhanced crypto-random approach
   * Delegates to centralized ID generation utility
   */
  private static generateTaskId(): number {
    return generateTaskId();
  }

  /**
   * Validate project status transition
   */
  static canTransitionStatus(
    currentStatus: ProjectStatus,
    newStatus: ProjectStatus,
    actorType: 'freelancer' | 'commissioner'
  ): { ok: boolean; reason?: string } {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      proposed: ['ongoing', 'archived'],
      ongoing: ['paused', 'completed', 'archived'],
      paused: ['ongoing', 'archived'],
      completed: ['archived'],
      archived: [], // No transitions from archived
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        ok: false,
        reason: `Invalid transition from ${currentStatus} to ${newStatus}`,
      };
    }

    // Additional business rules based on actor type
    if (newStatus === 'completed' && actorType !== 'freelancer') {
      return {
        ok: false,
        reason: 'Only freelancers can mark projects as completed',
      };
    }

    if (newStatus === 'paused' && actorType !== 'commissioner') {
      return {
        ok: false,
        reason: 'Only commissioners can pause projects',
      };
    }

    return { ok: true };
  }

  /**
   * Calculate project progress based on task completion
   */
  static calculateProgress(tasks: TaskRecord[]): number {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => 
      task.status === 'Approved' || task.completed === true
    );

    return Math.round((completedTasks.length / tasks.length) * 100);
  }
}
