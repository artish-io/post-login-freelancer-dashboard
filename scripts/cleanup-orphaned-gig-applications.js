#!/usr/bin/env node

/**
 * Orphaned Gig Applications Cleanup Script
 * 
 * This script removes gig applications that are logical impossibilities:
 * 1. Applications with status "accepted" but no projectId (should have been linked to a project)
 * 2. Applications with projectId that references non-existent projects
 * 3. Applications for gigs that no longer exist
 * 
 * Usage: node scripts/cleanup-orphaned-gig-applications.js [--dry-run] [--backup]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup');

console.log('🧹 Orphaned Gig Applications Cleanup Script');
console.log('===========================================');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No files will be deleted');
}

if (shouldBackup) {
  console.log('💾 BACKUP MODE - Will create backups before deletion');
}

console.log('');

async function main() {
  try {
    // Step 1: Get valid project IDs and gig IDs
    const validProjectIds = await getValidProjectIds();
    const validGigIds = await getValidGigIds();
    
    console.log(`✅ Found ${validProjectIds.size} valid projects: ${Array.from(validProjectIds).join(', ')}`);
    console.log(`✅ Found ${validGigIds.size} valid gigs`);
    console.log('');

    // Step 2: Read all gig applications
    const applications = await readAllGigApplications();
    console.log(`📄 Found ${applications.length} gig applications to analyze`);
    console.log('');

    // Step 3: Analyze applications and identify orphaned ones
    const analysis = analyzeApplications(applications, validProjectIds, validGigIds);
    
    console.log('📊 Analysis Results:');
    console.log(`   ✅ Valid applications: ${analysis.valid.length}`);
    console.log(`   ⚠️  Pending applications (no project yet): ${analysis.pending.length}`);
    console.log(`   ❌ Orphaned applications: ${analysis.orphaned.length}`);
    console.log('');

    if (analysis.orphaned.length === 0) {
      console.log('🎉 No orphaned applications found! System is clean.');
      return;
    }

    // Step 4: Show details of orphaned applications
    console.log('🔍 Orphaned Applications to be removed:');
    analysis.orphaned.forEach((app, index) => {
      console.log(`   ${index + 1}. App ${app.id} (Gig: ${app.gigId}, Status: ${app.status})`);
      console.log(`      Reason: ${app.orphanReason}`);
      console.log(`      File: ${app.filePath}`);
    });
    console.log('');

    // Step 5: Create backup if requested
    if (shouldBackup && !isDryRun) {
      await createBackup(analysis.orphaned);
    }

    // Step 6: Remove orphaned applications
    if (!isDryRun) {
      await removeOrphanedApplications(analysis.orphaned);
      await updateApplicationsIndex(analysis.valid.concat(analysis.pending));
      console.log('✅ Orphaned applications cleanup completed successfully!');
    } else {
      console.log('🔍 DRY RUN: Would remove the above orphaned applications');
    }

    // Step 7: Clean up empty directories
    if (!isDryRun) {
      await cleanupEmptyDirectories();
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
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
 * Get valid gig IDs from hierarchical storage
 */
async function getValidGigIds() {
  const validIds = new Set();

  try {
    // Read gigs index
    const indexPath = path.join(process.cwd(), 'data', 'gigs', 'gigs-index.json');
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      Object.keys(indexData).forEach(id => validIds.add(id.toString()));
    }
  } catch (error) {
    console.warn('⚠️ Could not read gigs index:', error.message);
  }

  return validIds;
}

/**
 * Read all gig applications from hierarchical storage
 */
async function readAllGigApplications() {
  const applications = [];
  const indexPath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications-index.json');
  
  if (!fs.existsSync(indexPath)) {
    console.warn('⚠️ Gig applications index not found');
    return applications;
  }

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
        const content = fs.readFileSync(appPath, 'utf-8');
        const application = JSON.parse(content);
        application.filePath = appPath; // Add file path for reference
        applications.push(application);
      } else {
        console.warn(`⚠️ Application file not found: ${appPath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not read application ${appId}:`, error.message);
    }
  }
  
  return applications;
}

/**
 * Analyze applications and categorize them
 */
function analyzeApplications(applications, validProjectIds, validGigIds) {
  const valid = [];
  const pending = [];
  const orphaned = [];
  
  for (const app of applications) {
    // Check if gig exists
    if (!validGigIds.has(app.gigId.toString())) {
      orphaned.push({
        ...app,
        orphanReason: `Gig ${app.gigId} no longer exists`
      });
      continue;
    }
    
    // Check application status and project linkage
    if (app.status === 'accepted') {
      if (!app.projectId) {
        // Accepted application without project ID - logical impossibility
        orphaned.push({
          ...app,
          orphanReason: 'Accepted application without projectId (should have been linked to a project)'
        });
      } else if (!validProjectIds.has(app.projectId.toString())) {
        // Accepted application with invalid project ID
        orphaned.push({
          ...app,
          orphanReason: `References non-existent project ${app.projectId}`
        });
      } else {
        // Valid accepted application
        valid.push(app);
      }
    } else if (app.status === 'pending') {
      // Pending applications are valid (no project created yet)
      pending.push(app);
    } else if (app.status === 'rejected') {
      // Rejected applications are valid (no project should be created)
      valid.push(app);
    } else {
      // Unknown status
      orphaned.push({
        ...app,
        orphanReason: `Unknown status: ${app.status}`
      });
    }
  }
  
  return { valid, pending, orphaned };
}

/**
 * Create backup of orphaned applications before deletion
 */
async function createBackup(orphanedApplications) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'data', 'backups', `orphaned-gig-applications-${timestamp}`);
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  console.log(`💾 Creating backup in: ${backupDir}`);
  
  for (const app of orphanedApplications) {
    const backupPath = path.join(backupDir, `application-${app.id}.json`);
    fs.copyFileSync(app.filePath, backupPath);
  }
  
  // Create backup manifest
  const manifest = {
    timestamp,
    totalApplications: orphanedApplications.length,
    applications: orphanedApplications.map(app => ({
      id: app.id,
      gigId: app.gigId,
      status: app.status,
      projectId: app.projectId || null,
      orphanReason: app.orphanReason,
      originalPath: app.filePath
    }))
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`✅ Backup created with ${orphanedApplications.length} applications`);
  console.log('');
}

/**
 * Remove orphaned application files
 */
async function removeOrphanedApplications(orphanedApplications) {
  console.log('🗑️ Removing orphaned applications...');
  
  let removedCount = 0;
  for (const app of orphanedApplications) {
    try {
      fs.unlinkSync(app.filePath);
      console.log(`   ✅ Removed: Application ${app.id}`);
      removedCount++;
    } catch (error) {
      console.error(`   ❌ Failed to remove application ${app.id}:`, error.message);
    }
  }
  
  console.log(`🗑️ Removed ${removedCount}/${orphanedApplications.length} orphaned applications`);
  console.log('');
}

/**
 * Update applications index to remove orphaned entries
 */
async function updateApplicationsIndex(validApplications) {
  console.log('📝 Updating applications index...');
  
  const indexPath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications-index.json');
  const newIndex = {};
  
  for (const app of validApplications) {
    const relativePath = path.relative(
      path.join(process.cwd(), 'data', 'gigs', 'gig-applications'),
      app.filePath
    );
    
    newIndex[app.id.toString()] = {
      path: relativePath,
      submittedAt: app.submittedAt
    };
  }
  
  fs.writeFileSync(indexPath, JSON.stringify(newIndex, null, 2));
  console.log(`✅ Updated applications index with ${Object.keys(newIndex).length} valid applications`);
  console.log('');
}

/**
 * Clean up empty directories after application removal
 */
async function cleanupEmptyDirectories() {
  console.log('🧹 Cleaning up empty directories...');
  
  const applicationsDir = path.join(process.cwd(), 'data', 'gigs', 'gig-applications');
  
  function removeEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    // Recursively clean subdirectories first
    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        removeEmptyDirs(itemPath);
      }
    }
    
    // Check if directory is now empty
    const remainingItems = fs.readdirSync(dir);
    if (remainingItems.length === 0 && dir !== applicationsDir) {
      try {
        fs.rmdirSync(dir);
        console.log(`   🗑️ Removed empty directory: ${dir}`);
      } catch (error) {
        console.warn(`   ⚠️ Could not remove directory ${dir}:`, error.message);
      }
    }
  }
  
  removeEmptyDirs(applicationsDir);
  console.log('✅ Empty directory cleanup completed');
  console.log('');
}

// Run the script
main();
