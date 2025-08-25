#!/usr/bin/env node

/**
 * Fix Milestone Payment Remaining Budget Script
 * 
 * This script fixes the remaining budget calculations in existing milestone payment notifications
 * that were affected by the double-counting bug in the bus event handler.
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

async function fixNotificationFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const notification = JSON.parse(data);
    
    // Only process milestone payment notifications
    if (!['milestone_payment_received', 'milestone_payment_sent'].includes(notification.type)) {
      return false;
    }
    
    // Get project data to calculate correct remaining budget
    const projectId = notification.metadata?.projectId || notification.context?.projectId;
    if (!projectId) {
      console.warn(`No project ID found in notification ${notification.id}`);
      return false;
    }
    
    const project = await getProjectData(projectId);
    if (!project) {
      return false;
    }
    
    const totalBudget = Number(project.totalBudget) || 0;
    const paidToDate = Number(project.paidToDate) || 0;
    
    // Calculate correct remaining budget (totalBudget - paidToDate)
    // Note: paidToDate should already include all payments made so far
    const correctRemainingBudget = Math.max(0, totalBudget - paidToDate);
    
    // Check if the current remaining budget is incorrect
    const currentRemainingBudget = notification.metadata?.remainingBudget;
    
    if (currentRemainingBudget !== undefined && Math.abs(currentRemainingBudget - correctRemainingBudget) > 0.01) {
      console.log(`Fixing notification ${notification.id}:`);
      console.log(`  Project: ${projectId}`);
      console.log(`  Total Budget: $${totalBudget}`);
      console.log(`  Paid To Date: $${paidToDate}`);
      console.log(`  Current Remaining Budget: $${currentRemainingBudget}`);
      console.log(`  Correct Remaining Budget: $${correctRemainingBudget}`);
      
      // Update the remaining budget
      notification.metadata.remainingBudget = correctRemainingBudget;
      
      // Add a note about the fix
      notification.remainingBudgetFixNote = `Fixed remaining budget calculation: was $${currentRemainingBudget}, corrected to $${correctRemainingBudget} (totalBudget: $${totalBudget} - paidToDate: $${paidToDate})`;
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
    // Directory doesn't exist or can't be read
    return [];
  }
  
  return files;
}

async function main() {
  console.log('🔧 Starting milestone payment remaining budget fix...');
  
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
  
  console.log(`\n✅ Completed! Checked ${checkedCount} files, fixed ${fixedCount} milestone payment notifications.`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixNotificationFile, getProjectData };
