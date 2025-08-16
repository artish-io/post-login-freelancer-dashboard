#!/usr/bin/env node

/**
 * Task Approval Rollback Script
 * 
 * This script completely rolls back a task approval including:
 * - Task status and metadata
 * - Generated invoices
 * - Payment transactions
 * - Notification events
 * - Wallet transactions
 * 
 * Usage: node scripts/rollback-task-approval.js <taskId> [projectId]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_ROOT = path.join(process.cwd(), 'data');

// Helper functions
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error.message);
    return false;
  }
}

function getAllFiles(dir, extension = '.json') {
  const files = [];
  
  function scanDir(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (item.endsWith(extension)) {
        files.push(itemPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

// Main rollback functions
async function rollbackTask(taskId, projectId) {
  console.log(`🔄 Starting rollback for task ${taskId}...`);
  
  // 1. Find and rollback task
  const taskRollback = await rollbackTaskData(taskId, projectId);
  
  // 2. Find and delete related invoices
  const invoiceRollback = await rollbackInvoices(taskId, projectId);
  
  // 3. Find and delete payment transactions
  const paymentRollback = await rollbackPayments(taskId, projectId, invoiceRollback.invoiceNumbers);
  
  // 4. Find and delete notification events
  const notificationRollback = await rollbackNotifications(taskId, projectId);
  
  // 5. Find and rollback wallet transactions
  const walletRollback = await rollbackWalletTransactions(taskId, projectId, invoiceRollback.invoiceNumbers);
  
  // Summary
  console.log('\n📊 Rollback Summary:');
  console.log(`Task: ${taskRollback.success ? '✅' : '❌'} ${taskRollback.message}`);
  console.log(`Invoices: ${invoiceRollback.success ? '✅' : '❌'} ${invoiceRollback.message}`);
  console.log(`Payments: ${paymentRollback.success ? '✅' : '❌'} ${paymentRollback.message}`);
  console.log(`Notifications: ${notificationRollback.success ? '✅' : '❌'} ${notificationRollback.message}`);
  console.log(`Wallets: ${walletRollback.success ? '✅' : '❌'} ${walletRollback.message}`);
  
  return {
    success: taskRollback.success && invoiceRollback.success && paymentRollback.success && notificationRollback.success && walletRollback.success,
    details: { taskRollback, invoiceRollback, paymentRollback, notificationRollback, walletRollback }
  };
}

async function rollbackTaskData(taskId, projectId) {
  try {
    // Find task file
    const taskFiles = getAllFiles(path.join(DATA_ROOT, 'project-tasks'));
    const taskFile = taskFiles.find(file => file.includes(`${taskId}-task.json`));
    
    if (!taskFile) {
      return { success: false, message: `Task file not found for ${taskId}` };
    }
    
    const task = readJsonFile(taskFile);
    if (!task) {
      return { success: false, message: `Could not read task file ${taskFile}` };
    }
    
    // Reset task to "In review" status
    const originalTask = {
      ...task,
      status: 'In review',
      completed: false,
      rejected: false,
      approvedDate: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      lastModified: new Date().toISOString()
    };
    
    // Remove undefined fields
    Object.keys(originalTask).forEach(key => {
      if (originalTask[key] === undefined) {
        delete originalTask[key];
      }
    });
    
    const success = writeJsonFile(taskFile, originalTask);
    
    return {
      success,
      message: success ? `Task ${taskId} reset to "In review"` : `Failed to update task ${taskId}`,
      taskFile,
      originalStatus: task.status,
      newStatus: 'In review'
    };
  } catch (error) {
    return { success: false, message: `Error rolling back task: ${error.message}` };
  }
}

async function rollbackInvoices(taskId, projectId) {
  try {
    const invoiceFiles = getAllFiles(path.join(DATA_ROOT, 'invoices'));
    const relatedInvoices = [];
    const deletedFiles = [];
    
    for (const file of invoiceFiles) {
      const invoice = readJsonFile(file);
      if (invoice && (
        invoice.milestones?.some(m => m.taskId == taskId) ||
        file.includes(taskId.toString()) ||
        (projectId && invoice.projectId == projectId && invoice.milestones?.some(m => m.taskId == taskId))
      )) {
        relatedInvoices.push(invoice.invoiceNumber);
        if (deleteFile(file)) {
          deletedFiles.push(file);
        }
      }
    }
    
    return {
      success: true,
      message: `Deleted ${deletedFiles.length} invoice files`,
      invoiceNumbers: relatedInvoices,
      deletedFiles
    };
  } catch (error) {
    return { success: false, message: `Error rolling back invoices: ${error.message}`, invoiceNumbers: [] };
  }
}

async function rollbackPayments(taskId, projectId, invoiceNumbers) {
  try {
    // Check flat payment files
    const paymentsFile = path.join(DATA_ROOT, 'payments', 'transactions.json');
    const payments = readJsonFile(paymentsFile) || [];
    
    const originalCount = payments.length;
    const filteredPayments = payments.filter(payment => 
      !invoiceNumbers.includes(payment.invoiceNumber) &&
      payment.projectId != projectId &&
      !payment.description?.includes(taskId.toString())
    );
    
    const deletedCount = originalCount - filteredPayments.length;
    
    if (deletedCount > 0) {
      writeJsonFile(paymentsFile, filteredPayments);
    }
    
    // TODO: Also check hierarchical payment structure when implemented
    
    return {
      success: true,
      message: `Removed ${deletedCount} payment transactions`,
      deletedCount
    };
  } catch (error) {
    return { success: false, message: `Error rolling back payments: ${error.message}` };
  }
}

async function rollbackNotifications(taskId, projectId) {
  try {
    let deletedCount = 0;
    
    // Check notifications log
    const notificationsFile = path.join(DATA_ROOT, 'notifications', 'notifications-log.json');
    const notifications = readJsonFile(notificationsFile) || [];
    
    const originalCount = notifications.length;
    const filteredNotifications = notifications.filter(notif => 
      notif.context?.taskId != taskId &&
      notif.context?.projectId != projectId &&
      !notif.metadata?.taskTitle?.includes(taskId.toString())
    );
    
    deletedCount += originalCount - filteredNotifications.length;
    
    if (deletedCount > 0) {
      writeJsonFile(notificationsFile, filteredNotifications);
    }
    
    // Check hierarchical notification events
    const eventsDir = path.join(DATA_ROOT, 'notifications', 'events');
    if (fs.existsSync(eventsDir)) {
      const eventFiles = getAllFiles(eventsDir);
      
      for (const file of eventFiles) {
        const events = readJsonFile(file) || [];
        const originalEventCount = events.length;
        const filteredEvents = events.filter(event => 
          event.context?.taskId != taskId &&
          event.context?.projectId != projectId &&
          event.entityId != taskId
        );
        
        const eventDeletedCount = originalEventCount - filteredEvents.length;
        if (eventDeletedCount > 0) {
          writeJsonFile(file, filteredEvents);
          deletedCount += eventDeletedCount;
        }
      }
    }
    
    return {
      success: true,
      message: `Removed ${deletedCount} notification events`,
      deletedCount
    };
  } catch (error) {
    return { success: false, message: `Error rolling back notifications: ${error.message}` };
  }
}

async function rollbackWalletTransactions(taskId, projectId, invoiceNumbers) {
  try {
    // Check wallet history files
    const walletFiles = getAllFiles(path.join(DATA_ROOT, 'freelancer-payments', 'wallet-history'));
    let deletedCount = 0;
    
    for (const file of walletFiles) {
      const transactions = readJsonFile(file) || [];
      const originalCount = transactions.length;
      const filteredTransactions = transactions.filter(tx => 
        !invoiceNumbers.includes(tx.invoiceNumber) &&
        tx.projectId != projectId &&
        !tx.description?.includes(taskId.toString())
      );
      
      const fileDeletedCount = originalCount - filteredTransactions.length;
      if (fileDeletedCount > 0) {
        writeJsonFile(file, filteredTransactions);
        deletedCount += fileDeletedCount;
      }
    }
    
    return {
      success: true,
      message: `Removed ${deletedCount} wallet transactions`,
      deletedCount
    };
  } catch (error) {
    return { success: false, message: `Error rolling back wallet transactions: ${error.message}` };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/rollback-task-approval.js <taskId> [projectId]');
    console.log('Example: node scripts/rollback-task-approval.js 1755290696512 L-002');
    process.exit(1);
  }
  
  const taskId = args[0];
  const projectId = args[1];
  
  console.log(`🎯 Rolling back task approval for task ${taskId}${projectId ? ` in project ${projectId}` : ''}`);
  
  const result = await rollbackTask(taskId, projectId);
  
  if (result.success) {
    console.log('\n✅ Rollback completed successfully!');
    console.log('You can now test task approval again with clean data.');
  } else {
    console.log('\n❌ Rollback completed with some issues. Check the summary above.');
  }
  
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { rollbackTask, rollbackTaskData, rollbackInvoices, rollbackPayments, rollbackNotifications, rollbackWalletTransactions };
