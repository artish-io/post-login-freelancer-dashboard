#!/usr/bin/env node

/**
 * Fix Completion Upfront Payment Messages Script
 * 
 * This script fixes the hardcoded messages in existing completion upfront payment notifications
 * that show generic text like "an invoice" instead of actual dollar amounts.
 */

const fs = require('fs').promises;
const path = require('path');

async function fixCompletionNotificationFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const notification = JSON.parse(data);
    
    // Only process completion upfront payment notifications
    if (notification.type !== 'completion.upfront_payment') {
      return false;
    }
    
    // Check if this notification has a hardcoded message that needs fixing
    const message = notification.message;
    if (!message) {
      return false;
    }
    
    // Extract context data
    const upfrontAmount = notification.context?.upfrontAmount || 0;
    const remainingBudget = notification.context?.remainingBudget || 0;
    const projectTitle = notification.context?.projectTitle || 'project';
    const orgName = notification.context?.orgName || 'Organization';
    const freelancerName = notification.context?.freelancerName || 'Freelancer';
    const commissionerName = notification.context?.commissionerName || 'Commissioner';
    
    // Determine if this is a commissioner or freelancer notification
    const isCommissionerNotification = notification.actorId === notification.targetId;
    
    let newMessage = null;
    let wasFixed = false;
    
    if (isCommissionerNotification) {
      // Commissioner notification - check if it has the generic "an invoice" text
      if (message.includes('an invoice for your recently activated')) {
        newMessage = `You sent ${freelancerName} a $${upfrontAmount} invoice for your recently activated ${projectTitle} project. This project has a budget of $${remainingBudget} left. Click here to view invoice details`;
        wasFixed = true;
      }
    } else {
      // Freelancer notification - should already be correct, but check anyway
      if (!message.includes(`$${upfrontAmount}`)) {
        newMessage = `${orgName} has paid $${upfrontAmount} upfront for your newly activated ${projectTitle} project. This project has a budget of $${remainingBudget} left. Click here to view invoice details`;
        wasFixed = true;
      }
    }
    
    if (wasFixed && newMessage) {
      console.log(`Fixing completion notification ${notification.id}:`);
      console.log(`  Type: ${isCommissionerNotification ? 'Commissioner' : 'Freelancer'}`);
      console.log(`  Project: ${projectTitle}`);
      console.log(`  Upfront Amount: $${upfrontAmount}`);
      console.log(`  Old Message: ${message}`);
      console.log(`  New Message: ${newMessage}`);
      
      // Update the message
      notification.message = newMessage;
      
      // Add a note about the fix
      notification.messageFixNote = `Fixed upfront payment message to include actual dollar amount ($${upfrontAmount}) instead of generic 'an invoice' text`;
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
  console.log('🔧 Starting completion upfront payment message fix...');
  
  const notificationsDir = path.join(process.cwd(), 'data', 'notifications', 'events');
  const notificationFiles = await findNotificationFiles(notificationsDir);
  
  console.log(`Found ${notificationFiles.length} notification files to check`);
  
  let fixedCount = 0;
  let checkedCount = 0;
  
  for (const filePath of notificationFiles) {
    const wasFixed = await fixCompletionNotificationFile(filePath);
    if (wasFixed) {
      fixedCount++;
    }
    checkedCount++;
    
    if (checkedCount % 50 === 0) {
      console.log(`Checked ${checkedCount}/${notificationFiles.length} files, fixed ${fixedCount} so far...`);
    }
  }
  
  console.log(`\n✅ Completed! Checked ${checkedCount} files, fixed ${fixedCount} completion upfront payment notifications.`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixCompletionNotificationFile };
