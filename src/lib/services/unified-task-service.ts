/**
 * Unified Task Service
 * 
 * Single service for all task operations with consistent status workflows.
 * Replaces multiple task endpoints with unified business logic.
 */

import { UnifiedStorageService, UnifiedTask, UnifiedProject } from '../storage/unified-storage-service';

export type TaskStatus = 'Ongoing' | 'Submitted' | 'In review' | 'Rejected' | 'Approved';

export interface TaskSubmissionData {
  referenceUrl?: string;
  workingFileUrl?: string;
  notes?: string;
}

export interface TaskOperationResult {
  success: boolean;
  task: UnifiedTask;
  shouldNotify: boolean;
  notificationTarget?: number;
  message: string;
  invoiceGenerated?: boolean;
}

export class UnifiedTaskService {
  
  /**
   * Submit a task for review
   */
  static async submitTask(
    taskId: number, 
    actorId: number, 
    submissionData?: TaskSubmissionData
  ): Promise<TaskOperationResult> {
    const task = await UnifiedStorageService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const project = await UnifiedStorageService.getProjectById(task.projectId);
    if (!project) {
      throw new Error(`Project ${task.projectId} not found for task ${taskId}`);
    }

    // Validate actor is the freelancer
    if (project.freelancerId !== actorId) {
      throw new Error('Only the assigned freelancer can submit tasks');
    }

    // Validate current status allows submission
    if (!['Ongoing', 'Rejected'].includes(task.status)) {
      throw new Error(`Cannot submit task with status: ${task.status}`);
    }

    // Update task for submission
    const updatedTask: UnifiedTask = {
      ...task,
      status: 'In review',
      completed: false, // Only true when approved
      rejected: false,
      submittedDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: task.version + 1,
      link: submissionData?.referenceUrl || task.link
    };

    await UnifiedStorageService.saveTask(updatedTask);

    return {
      success: true,
      task: updatedTask,
      shouldNotify: true,
      notificationTarget: project.commissionerId,
      message: `Task "${task.title}" submitted for review`
    };
  }

  /**
   * Approve a task
   */
  static async approveTask(
    taskId: number, 
    actorId: number,
    generateInvoice: boolean = false
  ): Promise<TaskOperationResult> {
    const task = await UnifiedStorageService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const project = await UnifiedStorageService.getProjectById(task.projectId);
    if (!project) {
      throw new Error(`Project ${task.projectId} not found for task ${taskId}`);
    }

    // Validate actor is the commissioner
    if (project.commissionerId !== actorId) {
      throw new Error('Only the project commissioner can approve tasks');
    }

    // Validate current status allows approval
    if (task.status !== 'In review') {
      throw new Error(`Cannot approve task with status: ${task.status}`);
    }

    // Update task for approval
    const updatedTask: UnifiedTask = {
      ...task,
      status: 'Approved',
      completed: true,
      rejected: false,
      approvedDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await UnifiedStorageService.saveTask(updatedTask);

    // Check if invoice should be generated
    let invoiceGenerated = false;
    let generatedInvoiceId: string | null = null;

    if (project.invoicingMethod === 'milestone') {
      // For milestone invoicing, generate invoice for each approved task
      try {
        const invoiceId = `MILESTONE-${project.projectId}-${task.taskId}`;
        console.log(`📄 Generating milestone invoice: ${invoiceId}`);

        // Calculate invoice amount (total budget divided by number of tasks)
        const projectTasks = await UnifiedStorageService.getTasksByProject(project.projectId);
        const taskCount = projectTasks.length;
        const invoiceAmount = taskCount > 0 ? (project.budget?.upper || project.budget?.lower || 1000) / taskCount : 1000;

        // Create invoice data
        const invoiceData = {
          invoiceId,
          projectId: project.projectId,
          taskId: task.taskId,
          freelancerId: project.freelancerId,
          commissionerId: project.commissionerId,
          amount: Math.round(invoiceAmount * 100) / 100, // Round to 2 decimal places
          currency: 'USD',
          status: 'sent',
          type: 'milestone',
          description: `Milestone payment for: ${task.title}`,
          createdAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };

        // Save invoice using hierarchical storage
        await this.saveInvoice(invoiceData);
        invoiceGenerated = true;
        generatedInvoiceId = invoiceId;
        console.log(`✅ Generated milestone invoice: ${invoiceId} for $${invoiceAmount}`);

      } catch (invoiceError) {
        console.error('Failed to generate milestone invoice:', invoiceError);
        // Don't fail the task approval if invoice generation fails
      }
    } else if (generateInvoice && project.invoicingMethod === 'completion') {
      // Invoice generation will be handled by transaction service
      invoiceGenerated = true;
    }

    return {
      success: true,
      task: updatedTask,
      shouldNotify: true,
      notificationTarget: project.freelancerId,
      message: `Task "${task.title}" approved successfully`,
      invoiceGenerated,
      invoiceId: generatedInvoiceId
    };
  }

  /**
   * Reject a task
   */
  static async rejectTask(
    taskId: number, 
    actorId: number,
    feedback?: string
  ): Promise<TaskOperationResult> {
    const task = await UnifiedStorageService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const project = await UnifiedStorageService.getProjectById(task.projectId);
    if (!project) {
      throw new Error(`Project ${task.projectId} not found for task ${taskId}`);
    }

    // Validate actor is the commissioner
    if (project.commissionerId !== actorId) {
      throw new Error('Only the project commissioner can reject tasks');
    }

    // Validate current status allows rejection
    if (task.status !== 'In review') {
      throw new Error(`Cannot reject task with status: ${task.status}`);
    }

    // Update task for rejection
    const updatedTask: UnifiedTask = {
      ...task,
      status: 'Ongoing', // Back to ongoing for freelancer to work on
      completed: false,
      rejected: true,
      rejectedDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      feedbackCount: task.feedbackCount + 1
    };

    await UnifiedStorageService.saveTask(updatedTask);

    return {
      success: true,
      task: updatedTask,
      shouldNotify: true,
      notificationTarget: project.freelancerId,
      message: `Task "${task.title}" rejected and returned for revision`
    };
  }

  /**
   * Save invoice to hierarchical storage
   */
  private static async saveInvoice(invoiceData: any): Promise<void> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    // Create hierarchical path based on creation date
    const createdDate = new Date(invoiceData.createdAt);
    const year = createdDate.getFullYear();
    const month = String(createdDate.getMonth() + 1).padStart(2, '0');
    const day = String(createdDate.getDate()).padStart(2, '0');

    const invoiceDir = path.join(
      process.cwd(),
      'data',
      'invoices',
      year.toString(),
      month,
      day
    );

    // Ensure directory exists
    await fs.mkdir(invoiceDir, { recursive: true });

    // Save invoice file
    const invoiceFile = path.join(invoiceDir, `${invoiceData.invoiceId}.json`);
    await fs.writeFile(invoiceFile, JSON.stringify(invoiceData, null, 2));

    console.log(`💾 Saved invoice to: ${invoiceFile}`);
  }

  /**
   * Create a new task for a project
   */
  static async createTask(
    projectId: number,
    taskData: {
      title: string;
      description: string;
      dueDate: string;
      order?: number;
    }
  ): Promise<UnifiedTask> {
    const project = await UnifiedStorageService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get existing tasks to determine order
    const existingTasks = await UnifiedStorageService.getTasksByProject(projectId);
    const maxOrder = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.order)) : 0;

    // Generate unique task ID
    const taskId = Date.now() + Math.floor(Math.random() * 10000);

    const newTask: UnifiedTask = {
      taskId,
      projectId,
      projectTitle: project.title,
      organizationId: project.organizationId || 0,
      projectTypeTags: project.typeTags || [],
      title: taskData.title,
      description: taskData.description,
      status: 'Ongoing',
      completed: false,
      order: taskData.order || (maxOrder + 1),
      link: '',
      dueDate: taskData.dueDate,
      rejected: false,
      feedbackCount: 0,
      pushedBack: false,
      version: 1,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await UnifiedStorageService.saveTask(newTask);
    return newTask;
  }

  /**
   * Get task status summary for a project
   */
  static async getProjectTaskSummary(projectId: number): Promise<{
    total: number;
    ongoing: number;
    submitted: number;
    inReview: number;
    approved: number;
    rejected: number;
    completionPercentage: number;
  }> {
    const tasks = await UnifiedStorageService.getTasksByProject(projectId);
    
    const summary = {
      total: tasks.length,
      ongoing: 0,
      submitted: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      completionPercentage: 0
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'Ongoing':
          summary.ongoing++;
          break;
        case 'Submitted':
          summary.submitted++;
          break;
        case 'In review':
          summary.inReview++;
          break;
        case 'Approved':
          summary.approved++;
          break;
        case 'Rejected':
          summary.rejected++;
          break;
      }
    });

    summary.completionPercentage = summary.total > 0 
      ? Math.round((summary.approved / summary.total) * 100) 
      : 0;

    return summary;
  }

  /**
   * Check if project is ready for completion
   */
  static async isProjectReadyForCompletion(projectId: number): Promise<{
    ready: boolean;
    reason?: string;
    tasksSummary: Awaited<ReturnType<typeof this.getProjectTaskSummary>>;
  }> {
    const summary = await this.getProjectTaskSummary(projectId);
    
    if (summary.total === 0) {
      return {
        ready: false,
        reason: 'No tasks found for project',
        tasksSummary: summary
      };
    }

    if (summary.approved === summary.total) {
      return {
        ready: true,
        tasksSummary: summary
      };
    }

    return {
      ready: false,
      reason: `${summary.total - summary.approved} tasks still pending approval`,
      tasksSummary: summary
    };
  }

  /**
   * Validate task status transition
   */
  static validateStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      'Ongoing': ['Submitted'],
      'Submitted': ['In review'],
      'In review': ['Approved', 'Rejected'],
      'Rejected': ['Submitted'],
      'Approved': [] // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
