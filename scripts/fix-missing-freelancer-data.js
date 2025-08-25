#!/usr/bin/env node

/**
 * Fix Missing Freelancer Data in Notifications
 * 
 * This script fixes milestone payment notifications that have fallback values
 * like "Freelancer" instead of actual freelancer names and 0 instead of actual amounts.
 */

const fs = require('fs').promises;
const path = require('path');

async function getProjectData(projectId) {
  try {
    // Handle different project ID formats (C-008, Z-003, etc.)
    const year = '2025';
    const month = '08';
    const day = '23';
    
    const projectPath = path.join(process.cwd(), 'data', 'projects', year, month, day, projectId, 'project.json');
    
    try {
      const projectData = await fs.readFile(projectPath, 'utf8');
      return JSON.parse(projectData);
    } catch (e) {
      // Try other dates if not found in today's date
      const dates = [
        ['2025', '08', '22'],
        ['2025', '08', '21'],
        ['2025', '08', '20'],
        ['2025', '08', '17'],
        ['2025', '08', '16']
      ];
      
      for (const [y, m, d] of dates) {
        try {
          const altPath = path.join(process.cwd(), 'data', 'projects', y, m, d, projectId, 'project.json');
          const projectData = await fs.readFile(altPath, 'utf8');
          return JSON.parse(projectData);
        } catch (e) {
          continue;
        }
      }
      
      console.warn(`Could not find project data for ${projectId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error reading project data for ${projectId}:`, error);
    return null;
  }
}

async function getFreelancerName(freelancerId) {
  try {
    // Try to get user data from hierarchical storage
    const userIndexPath = path.join(process.cwd(), 'data', 'users-index.json');
    const userIndex = JSON.parse(await fs.readFile(userIndexPath, 'utf8'));
    
    if (userIndex[freelancerId]) {
      const userPath = path.join(process.cwd(), 'data', 'users', userIndex[freelancerId].path, 'profile.json');
      const userData = JSON.parse(await fs.readFile(userPath, 'utf8'));
      return userData.name;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting freelancer name for ID ${freelancerId}:`, error);
    return null;
  }
}

async function getInvoiceAmount(invoiceNumber) {
  try {
    // Search for invoice in hierarchical storage
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const invoiceFiles = await findInvoiceFiles(invoicesDir);
    
    for (const invoiceFile of invoiceFiles) {
      try {
        const invoiceData = JSON.parse(await fs.readFile(invoiceFile, 'utf8'));
        if (invoiceData.invoiceNumber === invoiceNumber) {
          return invoiceData.amount || invoiceData.totalAmount || 0;
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting invoice amount for ${invoiceNumber}:`, error);
    return null;
  }
}

async function findInvoiceFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findInvoiceFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    return [];
  }
  
  return files;
}

async function fixNotificationFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const notification = JSON.parse(data);
    
    // Only process milestone payment sent notifications with missing data
    if (notification.type !== 'milestone_payment_sent') {
      return false;
    }
    
    // Check if this notification has fallback values
    const hasGenericFreelancerName = notification.metadata?.freelancerName === 'Freelancer';
    const hasZeroAmount = notification.metadata?.amount === 0;
    
    if (!hasGenericFreelancerName && !hasZeroAmount) {
      return false; // Nothing to fix
    }
    
    console.log(`Fixing notification ${notification.id}:`);
    console.log(`  Current freelancerName: ${notification.metadata?.freelancerName}`);
    console.log(`  Current amount: ${notification.metadata?.amount}`);
    
    let wasFixed = false;
    
    // Fix freelancer name
    if (hasGenericFreelancerName) {
      const projectId = notification.metadata?.projectId;
      if (projectId) {
        const project = await getProjectData(projectId);
        if (project && project.freelancerId) {
          const freelancerName = await getFreelancerName(project.freelancerId);
          if (freelancerName) {
            notification.metadata.freelancerName = freelancerName;
            console.log(`  Fixed freelancerName: ${freelancerName}`);
            wasFixed = true;
          }
        }
      }
    }
    
    // Fix amount
    if (hasZeroAmount) {
      const invoiceNumber = notification.metadata?.invoiceNumber;
      if (invoiceNumber) {
        const invoiceAmount = await getInvoiceAmount(invoiceNumber);
        if (invoiceAmount && invoiceAmount > 0) {
          notification.metadata.amount = invoiceAmount;
          console.log(`  Fixed amount: $${invoiceAmount}`);
          wasFixed = true;
        }
      }
    }
    
    if (wasFixed) {
      // Generate proper title and message
      const freelancerName = notification.metadata.freelancerName;
      const amount = notification.metadata.amount;
      const taskTitle = notification.metadata.taskTitle;
      const projectTitle = notification.metadata.projectTitle;
      const remainingBudget = notification.metadata.remainingBudget;
      
      notification.title = `You just paid ${freelancerName} $${amount.toLocaleString()}`;
      notification.message = `You just paid ${freelancerName} $${amount.toLocaleString()} for submitting ${taskTitle} for ${projectTitle}. Remaining budget: $${remainingBudget.toLocaleString()}. Click here to see transaction activity`;
      
      // Add fix note
      notification.freelancerDataFixNote = `Fixed missing freelancer data: freelancerName: ${freelancerName}, amount: $${amount}`;
      notification.updatedAt = new Date().toISOString();
      
      // Write the updated notification back to file
      await fs.writeFile(filePath, JSON.stringify(notification, null, 2));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

async function findNotificationFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findNotificationFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    return [];
  }
  
  return files;
}

async function main() {
  console.log('🔧 Starting freelancer data fix for milestone payment notifications...');
  
  const notificationsDir = path.join(process.cwd(), 'data', 'notifications', 'events');
  const notificationFiles = await findNotificationFiles(notificationsDir);
  
  console.log(`Found ${notificationFiles.length} notification files to check`);
  
  let fixedCount = 0;
  let checkedCount = 0;
  
  for (const filePath of notificationFiles) {
    const wasFixed = await fixNotificationFile(filePath);
    if (wasFixed) {
      fixedCount++;
    }
    checkedCount++;
    
    if (checkedCount % 50 === 0) {
      console.log(`Checked ${checkedCount}/${notificationFiles.length} files, fixed ${fixedCount} so far...`);
    }
  }
  
  console.log(`\n✅ Completed! Checked ${checkedCount} files, fixed ${fixedCount} notifications with missing freelancer data.`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixNotificationFile };
