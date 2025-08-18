/**
 * Lightweight reconciliation job to backfill missing notifications
 * This job identifies and creates missing notifications for milestone-based projects
 */

import { UnifiedStorageService } from '../storage/unified-storage-service';
import { NotificationStorage } from '../notifications/notification-storage';
import { detectProjectCompletion } from '../notifications/project-completion-detector';
import { emitMilestonePayment, emitTaskApproved, emitProjectComplete } from '../events/centralized-emitters';

export interface ReconciliationReport {
  totalProjectsChecked: number;
  missingNotifications: number;
  backfilledNotifications: number;
  errors: string[];
  completedAt: string;
}

export interface MissingNotification {
  type: 'task_approved' | 'milestone_payment' | 'project_completion' | 'rating_prompt';
  projectId: number;
  taskId?: number;
  invoiceNumber?: string;
  reason: string;
}

/**
 * Main reconciliation job
 */
export async function runNotificationReconciliation(
  options: {
    dryRun?: boolean;
    projectIds?: number[];
    maxAge?: number; // days
    batchSize?: number;
  } = {}
): Promise<ReconciliationReport> {
  const {
    dryRun = false,
    projectIds,
    maxAge = 30, // Check projects from last 30 days
    batchSize = 50
  } = options;

  const report: ReconciliationReport = {
    totalProjectsChecked: 0,
    missingNotifications: 0,
    backfilledNotifications: 0,
    errors: [],
    completedAt: new Date().toISOString()
  };

  console.log(`🔍 Starting notification reconciliation (dryRun: ${dryRun})`);

  try {
    // Get projects to check
    const projects = projectIds 
      ? await Promise.all(projectIds.map(id => UnifiedStorageService.getProjectById(id)))
      : await getRecentMilestoneProjects(maxAge);

    const validProjects = projects.filter(p => p !== null);
    report.totalProjectsChecked = validProjects.length;

    console.log(`📊 Checking ${validProjects.length} milestone projects`);

    // Process projects in batches
    for (let i = 0; i < validProjects.length; i += batchSize) {
      const batch = validProjects.slice(i, i + batchSize);
      
      for (const project of batch) {
        try {
          const missing = await checkProjectNotifications(project!);
          report.missingNotifications += missing.length;

          if (!dryRun && missing.length > 0) {
            const backfilled = await backfillMissingNotifications(project!, missing);
            report.backfilledNotifications += backfilled;
          }

          if (missing.length > 0) {
            console.log(`📝 Project ${project!.projectId}: Found ${missing.length} missing notifications`);
          }
        } catch (error) {
          const errorMsg = `Failed to reconcile project ${project!.projectId}: ${error}`;
          report.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < validProjects.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Reconciliation complete: ${report.backfilledNotifications} notifications backfilled`);
  } catch (error) {
    const errorMsg = `Reconciliation job failed: ${error}`;
    report.errors.push(errorMsg);
    console.error(errorMsg);
  }

  return report;
}

/**
 * Get recent milestone-based projects
 */
async function getRecentMilestoneProjects(maxAgeDays: number): Promise<any[]> {
  const allProjects = await UnifiedStorageService.listProjects();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  return allProjects.filter(project => {
    // Only check milestone-based projects
    if (project.invoicingMethod !== 'milestone') return false;

    // Check if project is recent enough
    const projectDate = new Date(project.createdAt || project.startDate || '2024-01-01');
    return projectDate >= cutoffDate;
  });
}

/**
 * Check a single project for missing notifications
 */
async function checkProjectNotifications(project: any): Promise<MissingNotification[]> {
  const missing: MissingNotification[] = [];
  const projectId = project.projectId;

  try {
    // Get project tasks
    const tasks = await UnifiedStorageService.listTasks(projectId);
    const approvedTasks = tasks.filter(task => task.status === 'Approved' && task.completed);

    // Get existing notifications for this project
    const existingNotifications = NotificationStorage.getEventsForProject(projectId);

    // Check for missing task approval notifications
    for (const task of approvedTasks) {
      const hasTaskApprovalNotification = existingNotifications.some(
        event => event.type === 'task_approved' && 
                event.context?.taskId === task.taskId
      );

      if (!hasTaskApprovalNotification) {
        missing.push({
          type: 'task_approved',
          projectId,
          taskId: task.taskId,
          reason: `Missing task approval notification for task ${task.taskId}`
        });
      }

      // Check for missing payment notifications (if task has associated invoice)
      const hasPaymentNotification = existingNotifications.some(
        event => (event.type === 'milestone_payment_received' || event.type === 'invoice_paid') &&
                event.context?.taskId === task.taskId
      );

      if (!hasPaymentNotification && task.invoiceNumber) {
        missing.push({
          type: 'milestone_payment',
          projectId,
          taskId: task.taskId,
          invoiceNumber: task.invoiceNumber,
          reason: `Missing payment notification for task ${task.taskId}`
        });
      }
    }

    // Check for missing project completion notifications
    const completionStatus = await detectProjectCompletion(projectId);
    if (completionStatus.isComplete) {
      const hasCompletionNotification = existingNotifications.some(
        event => event.type === 'project_completed' || event.type === 'rating_prompt_freelancer'
      );

      if (!hasCompletionNotification) {
        missing.push({
          type: 'project_completion',
          projectId,
          reason: 'Missing project completion and rating notifications'
        });
      }
    }

  } catch (error) {
    console.error(`Error checking notifications for project ${projectId}:`, error);
  }

  return missing;
}

/**
 * Backfill missing notifications
 */
async function backfillMissingNotifications(
  project: any, 
  missing: MissingNotification[]
): Promise<number> {
  let backfilled = 0;

  for (const notification of missing) {
    try {
      switch (notification.type) {
        case 'task_approved':
          if (notification.taskId) {
            const task = await UnifiedStorageService.getTaskByCompositeId(
              notification.projectId, 
              notification.taskId
            );
            if (task) {
              await emitTaskApproved({
                commissionerId: project.commissionerId,
                freelancerId: project.freelancerId,
                projectId: notification.projectId,
                taskId: notification.taskId,
                taskTitle: task.title
              });
              backfilled++;
            }
          }
          break;

        case 'milestone_payment':
          if (notification.invoiceNumber) {
            // Get invoice details
            const { getInvoiceByNumber } = await import('../invoice-storage');
            const invoice = await getInvoiceByNumber(notification.invoiceNumber);
            if (invoice) {
              await emitMilestonePayment({
                commissionerId: project.commissionerId,
                freelancerId: project.freelancerId,
                projectId: notification.projectId,
                invoiceNumber: notification.invoiceNumber,
                amount: invoice.totalAmount,
                projectTitle: project.title
              });
              backfilled++;
            }
          }
          break;

        case 'project_completion':
          await emitProjectComplete({
            projectId: notification.projectId,
            freelancerId: project.freelancerId,
            commissionerId: project.commissionerId,
            projectTitle: project.title
          });
          backfilled++;
          break;
      }
    } catch (error) {
      console.error(`Failed to backfill ${notification.type} for project ${notification.projectId}:`, error);
    }
  }

  return backfilled;
}

/**
 * Schedule reconciliation job to run periodically
 */
export function scheduleReconciliation(intervalHours: number = 24): NodeJS.Timeout {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`📅 Scheduling notification reconciliation every ${intervalHours} hours`);
  
  return setInterval(async () => {
    try {
      console.log('🔄 Running scheduled notification reconciliation');
      const report = await runNotificationReconciliation({ dryRun: false });
      
      if (report.backfilledNotifications > 0 || report.errors.length > 0) {
        console.log(`📊 Reconciliation report:`, report);
      }
    } catch (error) {
      console.error('Scheduled reconciliation failed:', error);
    }
  }, intervalMs);
}

/**
 * Clean up old reconciliation data
 */
export async function cleanupReconciliationData(maxAgeDays: number = 90): Promise<void> {
  try {
    // Clean up old deduplication records
    const { PersistentDeduplication } = await import('../notifications/deduplication');
    await PersistentDeduplication.cleanupExpiredRecords();
    
    console.log(`🧹 Cleaned up reconciliation data older than ${maxAgeDays} days`);
  } catch (error) {
    console.error('Failed to cleanup reconciliation data:', error);
  }
}
