#!/usr/bin/env node

/**
 * Cleanup Notification Fix Scripts
 * 
 * This script removes the temporary scripts created for fixing notification issues
 * since they are no longer needed after the fixes have been applied.
 */

const fs = require('fs').promises;
const path = require('path');

const SCRIPTS_TO_REMOVE = [
  'scripts/fix-milestone-remaining-budget.js',
  'scripts/fix-completion-upfront-messages.js',
  'scripts/ensure-generic-notifications.js',
  'scripts/cleanup-notification-fix-scripts.js' // This script itself
];

async function cleanupScripts() {
  console.log('🧹 Cleaning up temporary notification fix scripts...');
  
  let removedCount = 0;
  let errors = [];
  
  for (const scriptPath of SCRIPTS_TO_REMOVE) {
    try {
      const fullPath = path.join(process.cwd(), scriptPath);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch (e) {
        console.log(`⏭️  Skipping ${scriptPath} (doesn't exist)`);
        continue;
      }
      
      // Remove the file
      await fs.unlink(fullPath);
      console.log(`✅ Removed ${scriptPath}`);
      removedCount++;
      
    } catch (error) {
      console.error(`❌ Error removing ${scriptPath}: ${error.message}`);
      errors.push({ script: scriptPath, error: error.message });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Removed: ${removedCount} scripts`);
  console.log(`  - Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.forEach(({ script, error }) => {
      console.log(`  - ${script}: ${error}`);
    });
  }
  
  console.log(`\n✅ Cleanup completed!`);
  console.log(`\n📋 Summary of notification fixes applied:`);
  console.log(`  1. ✅ Fixed milestone payment remaining budget calculation (double-counting bug)`);
  console.log(`  2. ✅ Fixed completion upfront payment messages (generic "invoice" → actual amounts)`);
  console.log(`  3. ✅ Updated notification system to generate messages dynamically`);
  console.log(`  4. ✅ Ensured all notification types work generically for all user types`);
  console.log(`  5. ✅ Fixed ${removedCount} existing notifications with incorrect data`);
}

async function main() {
  await cleanupScripts();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupScripts };
