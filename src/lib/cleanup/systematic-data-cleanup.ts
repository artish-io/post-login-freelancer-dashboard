/**
 * Systematic Data Cleanup Service
 *
 * Removes ALL data entries created before August 25, 2025
 * and cleans up indexing residue (orphaned ids, empty index entries, broken references).
 *
 * Example: data/gigs/2025/August/18/25/gig.json should be deleted because it was created on August 18th (before 25th)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format, parseISO, isBefore } from 'date-fns';
import { writeJsonAtomic, readJson } from '../fs-json.js';

export interface CleanupResult {
  category: string;
  itemsFound: number;
  itemsRemoved: number;
  errors: string[];
  indexesUpdated: string[];
}

export interface CleanupSummary {
  totalItemsFound: number;
  totalItemsRemoved: number;
  categories: CleanupResult[];
  errors: string[];
  duration: number;
}

const CUTOFF_DATE = new Date('2025-08-25T00:00:00Z');
const DATA_ROOT = path.join(process.cwd(), 'data');

/**
 * Check if a date string is before the cutoff date (August 25, 2025)
 * Returns true for dates like 2025-08-24, 2025-08-18, etc.
 */
function isBeforeCutoff(dateString: string): boolean {
  try {
    // Handle different date formats
    let date: Date;

    if (dateString.includes('-')) {
      // ISO format: 2025-08-24 or 2025-08-24T10:30:00Z
      date = parseISO(dateString);
    } else if (dateString.length === 8) {
      // Format: 20250824
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(`${year}-${month}-${day}`);
    } else {
      // Try to parse as-is
      date = new Date(dateString);
    }

    return isBefore(date, CUTOFF_DATE);
  } catch {
    return false;
  }
}

/**
 * Check if a directory path represents a date before cutoff
 * Example: data/gigs/2025/08/18 -> true (August 18 is before August 25)
 */
function isDirectoryDateBeforeCutoff(year: string, month: string, day: string): boolean {
  try {
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return isBeforeCutoff(dateStr);
  } catch {
    return false;
  }
}

/**
 * Safely remove a file or directory
 */
async function safeRemove(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return true;
  } catch (error) {
    console.warn(`Failed to remove ${filePath}:`, error);
    return false;
  }
}

/**
 * Update gig metadata index by removing deleted gig IDs
 */
async function updateGigIndex(removedGigIds: number[]): Promise<void> {
  try {
    const indexPath = path.join(DATA_ROOT, 'gigs', 'gig-metadata.json');
    const index: Record<string, any> = await readJson(indexPath, {});

    // Remove deleted gig IDs from index
    for (const gigId of removedGigIds) {
      delete index[gigId.toString()];
    }

    await writeJsonAtomic(indexPath, index);
  } catch (error) {
    console.warn('Failed to update gig index:', error);
  }
}

/**
 * Update projects index by removing deleted project IDs
 */
async function updateProjectsIndex(removedProjectIds: (string | number)[]): Promise<void> {
  try {
    const indexPath = path.join(DATA_ROOT, 'projects', 'projects-index.json');
    const index: Record<string, any> = await readJson(indexPath, {});

    // Remove deleted project IDs from index
    for (const projectId of removedProjectIds) {
      delete index[projectId.toString()];
    }

    await writeJsonAtomic(indexPath, index);
  } catch (error) {
    console.warn('Failed to update projects index:', error);
  }
}

/**
 * Update tasks index by removing deleted task IDs
 */
async function updateTasksIndex(removedTaskIds: number[]): Promise<void> {
  try {
    const indexPath = path.join(DATA_ROOT, 'project-tasks', 'tasks-index.json');
    const metadataIndexPath = path.join(DATA_ROOT, 'project-tasks', 'tasks-metadata-index.json');

    // Update main tasks index
    const index: Record<string, any> = await readJson(indexPath, {});
    for (const taskId of removedTaskIds) {
      delete index[taskId.toString()];
    }
    await writeJsonAtomic(indexPath, index);

    // Update metadata index
    const metadataIndex: Record<string, any> = await readJson(metadataIndexPath, {});
    for (const taskId of removedTaskIds) {
      delete metadataIndex[taskId.toString()];
    }
    await writeJsonAtomic(metadataIndexPath, metadataIndex);
  } catch (error) {
    console.warn('Failed to update tasks index:', error);
  }
}

/**
 * Update applications index by removing deleted application IDs
 */
async function updateApplicationsIndex(removedApplicationIds: string[]): Promise<void> {
  try {
    const indexPath = path.join(DATA_ROOT, 'gigs', 'gig-applications', 'applications-index.json');
    const index: Record<string, any> = await readJson(indexPath, {});

    // Remove deleted application IDs from index
    for (const appId of removedApplicationIds) {
      delete index[appId];
    }

    await writeJsonAtomic(indexPath, index);
  } catch (error) {
    console.warn('Failed to update applications index:', error);
  }
}

/**
 * Update notifications index by removing deleted notification IDs
 */
async function updateNotificationsIndex(removedNotificationIds: string[]): Promise<void> {
  try {
    const indexPath = path.join(DATA_ROOT, 'notifications', 'notifications-index.json');
    const index: Record<string, any> = await readJson(indexPath, {});

    // Remove deleted notification IDs from index
    for (const notifId of removedNotificationIds) {
      delete index[notifId];
    }

    await writeJsonAtomic(indexPath, index);
  } catch (error) {
    console.warn('Failed to update notifications index:', error);
  }
}

/**
 * Clean up old gigs and update indexes
 */
async function cleanupGigs(): Promise<CleanupResult> {
  const result: CleanupResult = {
    category: 'Gigs',
    itemsFound: 0,
    itemsRemoved: 0,
    errors: [],
    indexesUpdated: []
  };

  try {
    const gigsPath = path.join(DATA_ROOT, 'gigs');
    if (!await fs.access(gigsPath).then(() => true).catch(() => false)) {
      return result;
    }

    const removedGigIds: number[] = [];

    // Scan hierarchical gig structure: data/gigs/[year]/[month]/[day]/[gigId]/
    const years = await fs.readdir(gigsPath);

    for (const year of years) {
      if (parseInt(year) !== 2025) continue; // Only process 2025 data

      const yearPath = path.join(gigsPath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);

          // Check if this day is before August 25th, 2025
          const monthNum = month === 'August' ? '08' :
                          month === 'July' ? '07' :
                          month === 'June' ? '06' :
                          month === 'May' ? '05' :
                          month === 'April' ? '04' :
                          month === 'March' ? '03' :
                          month === 'February' ? '02' :
                          month === 'January' ? '01' : month;

          const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

          if (isBeforeCutoff(dateStr)) {
            console.log(`🗑️ Removing gigs from ${dateStr}...`);

            try {
              const gigIds = await fs.readdir(dayPath);

              for (const gigId of gigIds) {
                result.itemsFound++;

                // Remove the entire gig directory
                const gigDirPath = path.join(dayPath, gigId);
                const removed = await safeRemove(gigDirPath);
                if (removed) {
                  result.itemsRemoved++;
                  removedGigIds.push(parseInt(gigId));
                  console.log(`  ✅ Removed gig ${gigId}`);
                } else {
                  result.errors.push(`Failed to remove gig: ${gigId}`);
                }
              }

              // Remove the empty day directory if all gigs were removed
              try {
                const remainingFiles = await fs.readdir(dayPath);
                if (remainingFiles.length === 0) {
                  await fs.rmdir(dayPath);
                }
              } catch {
                // Directory not empty or other error, ignore
              }
            } catch (error) {
              result.errors.push(`Error processing day ${dateStr}: ${error}`);
            }
          }
        }
      }
    }

    // Update gig metadata index
    if (removedGigIds.length > 0) {
      await updateGigIndex(removedGigIds);
      result.indexesUpdated.push('gig-metadata.json');
    }

  } catch (error) {
    result.errors.push(`Error cleaning gigs: ${error}`);
  }

  return result;
}

/**
 * Clean up old gig applications and update indexes
 */
async function cleanupGigApplications(): Promise<CleanupResult> {
  const result: CleanupResult = {
    category: 'Gig Applications',
    itemsFound: 0,
    itemsRemoved: 0,
    errors: [],
    indexesUpdated: []
  };

  try {
    const appsPath = path.join(DATA_ROOT, 'gigs', 'gig-applications');
    if (!await fs.access(appsPath).then(() => true).catch(() => false)) {
      return result;
    }

    const removedApplicationIds: string[] = [];

    // Scan hierarchical structure: data/gigs/gig-applications/[year]/[month]/[day]/
    const years = await fs.readdir(appsPath);

    for (const year of years) {
      if (parseInt(year) !== 2025) continue; // Only process 2025 data

      const yearPath = path.join(appsPath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);

          // Check if this day is before August 25th, 2025
          const monthNum = month === 'August' ? '08' :
                          month === 'July' ? '07' :
                          month === 'June' ? '06' :
                          month === 'May' ? '05' :
                          month === 'April' ? '04' :
                          month === 'March' ? '03' :
                          month === 'February' ? '02' :
                          month === 'January' ? '01' : month;

          const dateStr = `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;

          if (isBeforeCutoff(dateStr)) {
            console.log(`🗑️ Removing gig applications from ${dateStr}...`);

            try {
              // Get all application files in this day
              const applicationFiles = await fs.readdir(dayPath);

              for (const appFile of applicationFiles) {
                if (appFile.endsWith('.json')) {
                  result.itemsFound++;

                  const appPath = path.join(dayPath, appFile);
                  const removed = await safeRemove(appPath);
                  if (removed) {
                    result.itemsRemoved++;
                    removedApplicationIds.push(appFile.replace('.json', ''));
                    console.log(`  ✅ Removed application ${appFile}`);
                  } else {
                    result.errors.push(`Failed to remove application: ${appFile}`);
                  }
                }
              }

              // Remove the empty day directory if all applications were removed
              try {
                const remainingFiles = await fs.readdir(dayPath);
                if (remainingFiles.length === 0) {
                  await fs.rmdir(dayPath);
                }
              } catch {
                // Directory not empty or other error, ignore
              }
            } catch (error) {
              result.errors.push(`Error processing day ${dateStr}: ${error}`);
            }
          }
        }
      }
    }

    // Update application indexes if any were removed
    if (removedApplicationIds.length > 0) {
      await updateApplicationsIndex(removedApplicationIds);
      result.indexesUpdated.push('gig-applications-index.json');
    }

  } catch (error) {
    result.errors.push(`Error cleaning gig applications: ${error}`);
  }

  return result;
}

/**
 * Clean up old notifications and update indexes
 */
async function cleanupNotifications(): Promise<CleanupResult> {
  const result: CleanupResult = {
    category: 'Notifications',
    itemsFound: 0,
    itemsRemoved: 0,
    errors: [],
    indexesUpdated: []
  };

  try {
    const notificationsPath = path.join(DATA_ROOT, 'notifications', 'events');
    if (!await fs.access(notificationsPath).then(() => true).catch(() => false)) {
      return result;
    }

    const removedNotificationIds: string[] = [];

    // Scan hierarchical structure: data/notifications/events/[year]/[month]/[day]/
    const years = await fs.readdir(notificationsPath);

    for (const year of years) {
      if (parseInt(year) > 2025) continue;

      const yearPath = path.join(notificationsPath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          if (isBeforeCutoff(dateStr)) {
            // Get all notification files in this day
            const notificationFiles = await fs.readdir(dayPath);

            for (const notifFile of notificationFiles) {
              if (notifFile.endsWith('.json')) {
                result.itemsFound++;

                try {
                  const notifPath = path.join(dayPath, notifFile);
                  const notifData = await fs.readFile(notifPath, 'utf-8');
                  const notification = JSON.parse(notifData);

                  if (isBeforeCutoff(notification.timestamp || notification.createdAt || dateStr)) {
                    const removed = await safeRemove(notifPath);
                    if (removed) {
                      result.itemsRemoved++;
                      removedNotificationIds.push(notification.id || notifFile.replace('.json', ''));
                    } else {
                      result.errors.push(`Failed to remove notification: ${notifFile}`);
                    }
                  }
                } catch (error) {
                  result.errors.push(`Error processing notification ${notifFile}: ${error}`);
                }
              }
            }
          }
        }
      }
    }

    // Update notification indexes if any were removed
    if (removedNotificationIds.length > 0) {
      await updateNotificationsIndex(removedNotificationIds);
      result.indexesUpdated.push('notifications-index.json');
    }

  } catch (error) {
    result.errors.push(`Error cleaning notifications: ${error}`);
  }

  return result;
}

/**
 * Clean up old projects and tasks
 */
async function cleanupProjectsAndTasks(): Promise<CleanupResult> {
  const result: CleanupResult = {
    category: 'Projects & Tasks',
    itemsFound: 0,
    itemsRemoved: 0,
    errors: [],
    indexesUpdated: []
  };

  try {
    const projectsPath = path.join(DATA_ROOT, 'projects');
    if (!await fs.access(projectsPath).then(() => true).catch(() => false)) {
      return result;
    }

    const removedProjectIds: string[] = [];
    const removedTaskIds: number[] = [];

    // Read projects.json to find old projects
    const projectsJsonPath = path.join(projectsPath, 'projects.json');
    const projects: Record<string, any> = await readJson(projectsJsonPath, {});

    console.log(`🔍 Scanning ${Object.keys(projects).length} projects for cleanup...`);

    for (const [projectId, project] of Object.entries(projects)) {
      const createdDate = project.createdAt || project.activatedAt || project.startDate;
      if (createdDate && isBeforeCutoff(createdDate)) {
        result.itemsFound++;

        console.log(`🗑️ Removing project ${projectId} (created: ${createdDate})`);

        // Remove project from projects.json
        delete projects[projectId];
        result.itemsRemoved++;
        removedProjectIds.push(projectId);

        // Also remove associated tasks
        if (project.tasks) {
          for (const task of project.tasks) {
            removedTaskIds.push(task.taskId || task.id);
          }
        }
      }
    }

    // Save updated projects.json
    if (removedProjectIds.length > 0) {
      await writeJsonAtomic(projectsJsonPath, projects);
      result.indexesUpdated.push('projects.json');
      console.log(`✅ Updated projects.json, removed ${removedProjectIds.length} projects`);
    }

    // Clean up project-tasks
    const tasksPath = path.join(DATA_ROOT, 'project-tasks');
    if (await fs.access(tasksPath).then(() => true).catch(() => false)) {
      const tasksJsonPath = path.join(tasksPath, 'project-tasks.json');
      const tasks: Record<string, any> = await readJson(tasksJsonPath, {});

      console.log(`🔍 Scanning ${Object.keys(tasks).length} tasks for cleanup...`);

      let tasksRemoved = 0;
      for (const [taskId, task] of Object.entries(tasks)) {
        const taskCreatedDate = task.createdAt || task.createdDate || task.dueDate;
        const shouldRemove = (taskCreatedDate && isBeforeCutoff(taskCreatedDate)) ||
                           removedProjectIds.includes(task.projectId);

        if (shouldRemove) {
          console.log(`🗑️ Removing task ${taskId} (created: ${taskCreatedDate}, project: ${task.projectId})`);
          delete tasks[taskId];
          tasksRemoved++;
          removedTaskIds.push(parseInt(taskId));
        }
      }

      if (tasksRemoved > 0) {
        await writeJsonAtomic(tasksJsonPath, tasks);
        result.indexesUpdated.push('project-tasks.json');
        result.itemsRemoved += tasksRemoved;
        console.log(`✅ Updated project-tasks.json, removed ${tasksRemoved} tasks`);
      }
    }

    // Update indexes
    if (removedProjectIds.length > 0) {
      await updateProjectsIndex(removedProjectIds);
      result.indexesUpdated.push('projects-index.json');
    }

    if (removedTaskIds.length > 0) {
      await updateTasksIndex(removedTaskIds);
      result.indexesUpdated.push('tasks-index.json');
    }

  } catch (error) {
    result.errors.push(`Error cleaning projects and tasks: ${error}`);
  }

  return result;
}

/**
 * Clean up old invoices, payments, messages, and transactions
 */
async function cleanupFinancialData(): Promise<CleanupResult> {
  const result: CleanupResult = {
    category: 'Financial Data (Invoices, Payments, Messages, Transactions)',
    itemsFound: 0,
    itemsRemoved: 0,
    errors: [],
    indexesUpdated: []
  };

  try {
    // Clean up invoices
    const invoicesPath = path.join(DATA_ROOT, 'invoices');
    if (await fs.access(invoicesPath).then(() => true).catch(() => false)) {
      const invoicesJsonPath = path.join(invoicesPath, 'invoices.json');
      const invoices: Record<string, any> = await readJson(invoicesJsonPath, {});

      console.log(`🔍 Scanning ${Object.keys(invoices).length} invoices for cleanup...`);

      let invoicesRemoved = 0;
      for (const [invoiceId, invoice] of Object.entries(invoices)) {
        const invoiceDate = invoice.generatedAt || invoice.createdAt || invoice.issueDate;
        if (invoiceDate && isBeforeCutoff(invoiceDate)) {
          console.log(`🗑️ Removing invoice ${invoiceId} (created: ${invoiceDate})`);
          delete invoices[invoiceId];
          invoicesRemoved++;
          result.itemsFound++;
          result.itemsRemoved++;
        }
      }

      if (invoicesRemoved > 0) {
        await writeJsonAtomic(invoicesJsonPath, invoices);
        result.indexesUpdated.push('invoices.json');
        console.log(`✅ Updated invoices.json, removed ${invoicesRemoved} invoices`);
      }
    }

    // Clean up payments (commissioner and freelancer)
    const paymentsPath = path.join(DATA_ROOT, 'payments');
    if (await fs.access(paymentsPath).then(() => true).catch(() => false)) {
      // Commissioner payments
      const commissionerPaymentsPath = path.join(paymentsPath, 'commissioner-payments.json');
      const commissionerPayments: Record<string, any> = await readJson(commissionerPaymentsPath, {});

      console.log(`🔍 Scanning ${Object.keys(commissionerPayments).length} commissioner payments for cleanup...`);

      let commissionerPaymentsRemoved = 0;
      for (const [paymentId, payment] of Object.entries(commissionerPayments)) {
        const paymentDate = payment.processedAt || payment.createdAt || payment.timestamp;
        if (paymentDate && isBeforeCutoff(paymentDate)) {
          console.log(`🗑️ Removing commissioner payment ${paymentId} (created: ${paymentDate})`);
          delete commissionerPayments[paymentId];
          commissionerPaymentsRemoved++;
          result.itemsFound++;
          result.itemsRemoved++;
        }
      }

      if (commissionerPaymentsRemoved > 0) {
        await writeJsonAtomic(commissionerPaymentsPath, commissionerPayments);
        result.indexesUpdated.push('commissioner-payments.json');
        console.log(`✅ Updated commissioner-payments.json, removed ${commissionerPaymentsRemoved} payments`);
      }

      // Freelancer payments
      const freelancerPaymentsPath = path.join(paymentsPath, 'freelancer-payments.json');
      const freelancerPayments: Record<string, any> = await readJson(freelancerPaymentsPath, {});

      console.log(`🔍 Scanning ${Object.keys(freelancerPayments).length} freelancer payments for cleanup...`);

      let freelancerPaymentsRemoved = 0;
      for (const [paymentId, payment] of Object.entries(freelancerPayments)) {
        const paymentDate = payment.processedAt || payment.createdAt || payment.timestamp;
        if (paymentDate && isBeforeCutoff(paymentDate)) {
          console.log(`🗑️ Removing freelancer payment ${paymentId} (created: ${paymentDate})`);
          delete freelancerPayments[paymentId];
          freelancerPaymentsRemoved++;
          result.itemsFound++;
          result.itemsRemoved++;
        }
      }

      if (freelancerPaymentsRemoved > 0) {
        await writeJsonAtomic(freelancerPaymentsPath, freelancerPayments);
        result.indexesUpdated.push('freelancer-payments.json');
        console.log(`✅ Updated freelancer-payments.json, removed ${freelancerPaymentsRemoved} payments`);
      }
    }

    // Clean up messages (hierarchical structure)
    const messagesPath = path.join(DATA_ROOT, 'messages');
    if (await fs.access(messagesPath).then(() => true).catch(() => false)) {
      const years = await fs.readdir(messagesPath);

      for (const year of years) {
        if (parseInt(year) > 2025) continue;

        const yearPath = path.join(messagesPath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              const messageFiles = await fs.readdir(dayPath);

              for (const msgFile of messageFiles) {
                if (msgFile.endsWith('.json')) {
                  result.itemsFound++;

                  try {
                    const msgPath = path.join(dayPath, msgFile);
                    const msgData = await fs.readFile(msgPath, 'utf-8');
                    const message = JSON.parse(msgData);

                    if (isBeforeCutoff(message.timestamp || message.createdAt || dateStr)) {
                      const removed = await safeRemove(msgPath);
                      if (removed) {
                        result.itemsRemoved++;
                      } else {
                        result.errors.push(`Failed to remove message: ${msgFile}`);
                      }
                    }
                  } catch (error) {
                    result.errors.push(`Error processing message ${msgFile}: ${error}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Clean up transactions (hierarchical structure)
    const transactionsPath = path.join(DATA_ROOT, 'transactions');
    if (await fs.access(transactionsPath).then(() => true).catch(() => false)) {
      const years = await fs.readdir(transactionsPath);

      for (const year of years) {
        if (parseInt(year) > 2025) continue;

        const yearPath = path.join(transactionsPath, year);
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            if (isBeforeCutoff(dateStr)) {
              const transactionFiles = await fs.readdir(dayPath);

              for (const txnFile of transactionFiles) {
                if (txnFile.endsWith('.json')) {
                  result.itemsFound++;

                  try {
                    const txnPath = path.join(dayPath, txnFile);
                    const txnData = await fs.readFile(txnPath, 'utf-8');
                    const transaction = JSON.parse(txnData);

                    if (isBeforeCutoff(transaction.timestamp || transaction.createdAt || dateStr)) {
                      const removed = await safeRemove(txnPath);
                      if (removed) {
                        result.itemsRemoved++;
                      } else {
                        result.errors.push(`Failed to remove transaction: ${txnFile}`);
                      }
                    }
                  } catch (error) {
                    result.errors.push(`Error processing transaction ${txnFile}: ${error}`);
                  }
                }
              }
            }
          }
        }
      }
    }

  } catch (error) {
    result.errors.push(`Error cleaning financial data: ${error}`);
  }

  return result;
}

/**
 * Perform comprehensive data cleanup
 */
export async function performSystematicCleanup(): Promise<CleanupSummary> {
  const startTime = Date.now();
  const categories: CleanupResult[] = [];
  const errors: string[] = [];

  console.log('🧹 Starting systematic data cleanup...');
  console.log(`📅 Removing data created before: ${format(CUTOFF_DATE, 'yyyy-MM-dd')}`);

  try {
    // Clean up each category
    const cleanupFunctions = [
      cleanupGigs,
      cleanupGigApplications,
      cleanupNotifications,
      cleanupProjectsAndTasks,
      cleanupFinancialData
    ];

    for (const cleanupFn of cleanupFunctions) {
      try {
        const result = await cleanupFn();
        categories.push(result);
        console.log(`✅ ${result.category}: Found ${result.itemsFound}, Removed ${result.itemsRemoved}`);
      } catch (error) {
        const errorMsg = `Failed to cleanup ${cleanupFn.name}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Calculate totals
    const totalItemsFound = categories.reduce((sum, cat) => sum + cat.itemsFound, 0);
    const totalItemsRemoved = categories.reduce((sum, cat) => sum + cat.itemsRemoved, 0);
    const duration = Date.now() - startTime;

    console.log(`🎉 Cleanup completed in ${duration}ms`);
    console.log(`📊 Total: Found ${totalItemsFound}, Removed ${totalItemsRemoved}`);

    return {
      totalItemsFound,
      totalItemsRemoved,
      categories,
      errors,
      duration
    };
  } catch (error) {
    errors.push(`Cleanup failed: ${error}`);
    throw error;
  }
}
