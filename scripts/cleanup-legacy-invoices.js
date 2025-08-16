#!/usr/bin/env node

/**
 * Legacy Invoice Cleanup Script
 * 
 * This script removes all invoices associated with legacy numeric project IDs
 * that don't exist in the new hierarchical storage system. These invoices are
 * logically impossible since they reference non-existent projects.
 * 
 * Usage: node scripts/cleanup-legacy-invoices.js [--dry-run] [--backup]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup');

console.log('🧹 Legacy Invoice Cleanup Script');
console.log('================================');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No files will be deleted');
}

if (shouldBackup) {
  console.log('💾 BACKUP MODE - Will create backups before deletion');
}

console.log('');

async function main() {
  try {
    // Step 1: Get valid project IDs from hierarchical storage
    const validProjectIds = await getValidProjectIds();
    console.log(`✅ Found ${validProjectIds.size} valid projects in hierarchical storage:`);
    console.log(`   ${Array.from(validProjectIds).join(', ')}`);
    console.log('');

    // Step 2: Find all invoice files
    const invoiceFiles = await findAllInvoiceFiles();
    console.log(`📄 Found ${invoiceFiles.length} invoice files to analyze`);
    console.log('');

    // Step 3: Analyze invoices and identify legacy ones
    const { legacyInvoices, validInvoices, customInvoices } = await analyzeInvoices(invoiceFiles, validProjectIds);
    
    console.log('📊 Analysis Results:');
    console.log(`   ✅ Valid invoices (linked to existing projects): ${validInvoices.length}`);
    console.log(`   🔧 Custom invoices (projectId: null): ${customInvoices.length}`);
    console.log(`   ❌ Legacy invoices (linked to non-existent projects): ${legacyInvoices.length}`);
    console.log('');

    if (legacyInvoices.length === 0) {
      console.log('🎉 No legacy invoices found! System is clean.');
      return;
    }

    // Step 4: Show details of legacy invoices
    console.log('🔍 Legacy Invoices to be removed:');
    legacyInvoices.forEach((invoice, index) => {
      console.log(`   ${index + 1}. ${invoice.invoiceNumber} (Project ID: ${invoice.projectId}) - ${invoice.filePath}`);
    });
    console.log('');

    // Step 5: Create backup if requested
    if (shouldBackup && !isDryRun) {
      await createBackup(legacyInvoices);
    }

    // Step 6: Remove legacy invoices
    if (!isDryRun) {
      await removeLegacyInvoices(legacyInvoices);
      console.log('✅ Legacy invoice cleanup completed successfully!');
    } else {
      console.log('🔍 DRY RUN: Would remove the above legacy invoices');
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
    // Read projects index
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
 * Find all invoice files recursively
 */
async function findAllInvoiceFiles() {
  const invoiceFiles = [];
  const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item.endsWith('.json') && item.includes('invoice')) {
        invoiceFiles.push(itemPath);
      }
    }
  }
  
  scanDirectory(invoicesDir);
  return invoiceFiles;
}

/**
 * Analyze invoices and categorize them
 */
async function analyzeInvoices(invoiceFiles, validProjectIds) {
  const legacyInvoices = [];
  const validInvoices = [];
  const customInvoices = [];
  
  for (const filePath of invoiceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const invoice = JSON.parse(content);
      
      // Add file path for reference
      invoice.filePath = filePath;
      
      if (invoice.projectId === null || invoice.projectId === undefined) {
        // Custom invoice (no project)
        customInvoices.push(invoice);
      } else if (validProjectIds.has(invoice.projectId.toString())) {
        // Valid invoice (project exists)
        validInvoices.push(invoice);
      } else {
        // Legacy invoice (project doesn't exist)
        legacyInvoices.push(invoice);
      }
    } catch (error) {
      console.warn(`⚠️ Could not parse invoice file ${filePath}:`, error.message);
    }
  }
  
  return { legacyInvoices, validInvoices, customInvoices };
}

/**
 * Create backup of legacy invoices before deletion
 */
async function createBackup(legacyInvoices) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'data', 'backups', `legacy-invoices-${timestamp}`);
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  console.log(`💾 Creating backup in: ${backupDir}`);
  
  for (const invoice of legacyInvoices) {
    const backupPath = path.join(backupDir, `${invoice.invoiceNumber}.json`);
    fs.copyFileSync(invoice.filePath, backupPath);
  }
  
  // Create backup manifest
  const manifest = {
    timestamp,
    totalInvoices: legacyInvoices.length,
    invoices: legacyInvoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      projectId: inv.projectId,
      originalPath: inv.filePath
    }))
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`✅ Backup created with ${legacyInvoices.length} invoices`);
  console.log('');
}

/**
 * Remove legacy invoice files
 */
async function removeLegacyInvoices(legacyInvoices) {
  console.log('🗑️ Removing legacy invoices...');
  
  let removedCount = 0;
  for (const invoice of legacyInvoices) {
    try {
      fs.unlinkSync(invoice.filePath);
      console.log(`   ✅ Removed: ${invoice.invoiceNumber}`);
      removedCount++;
    } catch (error) {
      console.error(`   ❌ Failed to remove ${invoice.invoiceNumber}:`, error.message);
    }
  }
  
  console.log(`🗑️ Removed ${removedCount}/${legacyInvoices.length} legacy invoices`);
  console.log('');
}

/**
 * Clean up empty directories after invoice removal
 */
async function cleanupEmptyDirectories() {
  console.log('🧹 Cleaning up empty directories...');
  
  const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
  
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
    if (remainingItems.length === 0 && dir !== invoicesDir) {
      try {
        fs.rmdirSync(dir);
        console.log(`   🗑️ Removed empty directory: ${dir}`);
      } catch (error) {
        console.warn(`   ⚠️ Could not remove directory ${dir}:`, error.message);
      }
    }
  }
  
  removeEmptyDirs(invoicesDir);
  console.log('✅ Empty directory cleanup completed');
  console.log('');
}

// Run the script
main();
