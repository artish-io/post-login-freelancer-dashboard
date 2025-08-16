#!/usr/bin/env node

/**
 * Simple Gig Status Fix Script
 * 
 * This script:
 * 1. Finds all gig.json files in the hierarchical storage
 * 2. Ensures each gig has a status field
 * 3. Sets status to "available" for gigs without matching projects
 * 4. Sets status to "unavailable" for gigs with matching projects
 * 
 * Usage: node scripts/fix-gig-statuses-simple.js [--dry-run] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldFix = args.includes('--fix');

console.log('🔧 Simple Gig Status Fix Script');
console.log('===============================');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made');
}

if (shouldFix) {
  console.log('🔧 FIX MODE - Will add/correct status fields');
}

console.log('');

async function main() {
  try {
    // Step 1: Find all gig files
    const gigFiles = await findAllGigFiles();
    console.log(`📄 Found ${gigFiles.length} gig files`);
    console.log('');

    // Step 2: Get valid project IDs and accepted applications
    const validProjectIds = await getValidProjectIds();
    const acceptedApplications = await getAcceptedApplications();
    
    console.log(`✅ Found ${validProjectIds.size} valid projects: ${Array.from(validProjectIds).join(', ')}`);
    console.log(`✅ Found ${acceptedApplications.length} accepted applications`);
    console.log('');

    // Step 3: Analyze and fix gig statuses
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const filePath of gigFiles) {
      try {
        const gig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const gigId = gig.id.toString();
        
        // Check if this gig has a matching project via accepted applications
        const hasProject = acceptedApplications.some(app => 
          app.gigId.toString() === gigId && 
          app.projectId && 
          validProjectIds.has(app.projectId.toString())
        );
        
        const expectedStatus = hasProject ? 'Unavailable' : 'Available';
        const currentStatus = gig.status;
        
        if (currentStatus === expectedStatus) {
          console.log(`✅ Gig ${gigId}: Status already correct (${currentStatus})`);
          alreadyCorrectCount++;
        } else {
          console.log(`🔧 Gig ${gigId}: "${gig.title}"`);
          console.log(`   Current: ${currentStatus || 'undefined'}`);
          console.log(`   Expected: ${expectedStatus}`);
          console.log(`   Reason: ${hasProject ? 'Has matching project' : 'No matching project'}`);
          
          if (shouldFix && !isDryRun) {
            gig.status = expectedStatus;
            gig.lastModified = new Date().toISOString();
            fs.writeFileSync(filePath, JSON.stringify(gig, null, 2));
            console.log(`   ✅ Fixed!`);
            fixedCount++;
          } else {
            console.log(`   ${isDryRun ? '🔍 Would fix' : '💡 Use --fix to correct'}`);
          }
          console.log('');
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Already correct: ${alreadyCorrectCount}`);
    console.log(`   🔧 ${shouldFix && !isDryRun ? 'Fixed' : 'Need fixing'}: ${fixedCount}`);
    console.log('');

    if (shouldFix && !isDryRun) {
      console.log('✅ Gig status fix completed successfully!');
    } else if (isDryRun) {
      console.log('🔍 DRY RUN: Run with --fix to apply changes');
    }

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  }
}

/**
 * Find all gig.json files recursively
 */
async function findAllGigFiles() {
  const gigFiles = [];
  const gigsDir = path.join(process.cwd(), 'data', 'gigs');
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item === 'gig.json') {
        gigFiles.push(itemPath);
      }
    }
  }
  
  scanDirectory(gigsDir);
  return gigFiles;
}

/**
 * Get valid project IDs from hierarchical storage
 */
async function getValidProjectIds() {
  const validIds = new Set();
  
  try {
    const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      Object.keys(indexData).forEach(id => validIds.add(id));
    }
  } catch (error) {
    console.warn('⚠️ Could not read projects index:', error.message);
  }

  return validIds;
}

/**
 * Get all accepted applications with project IDs
 */
async function getAcceptedApplications() {
  const acceptedApps = [];
  
  try {
    const indexPath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications-index.json');
    if (!fs.existsSync(indexPath)) return acceptedApps;
    
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    for (const [appId, appInfo] of Object.entries(index)) {
      try {
        const appPath = path.join(
          process.cwd(),
          'data',
          'gigs',
          'gig-applications',
          appInfo.path
        );
        
        if (fs.existsSync(appPath)) {
          const application = JSON.parse(fs.readFileSync(appPath, 'utf-8'));
          
          if (application.status === 'accepted' && application.projectId) {
            acceptedApps.push(application);
          }
        }
      } catch (error) {
        // Skip this application if we can't read it
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not read applications:', error.message);
  }
  
  return acceptedApps;
}

// Run the script
main();
