#!/usr/bin/env node

/**
 * Cleanup Orphaned Projects and Invoices
 * 
 * This script removes:
 * 1. Invoices for projects that no longer have tasks
 * 2. Project indexes without matching project files
 * 3. Project task indexes without matching task files
 * 4. Projects without any tasks
 * 
 * Fixes the TypeError: Cannot read properties of undefined (reading 'map')
 * error in CommissionerInvoicePreviewPage
 */

const fs = require('fs');
const path = require('path');

class OrphanedDataCleanup {
  constructor() {
    this.dataRoot = path.join(process.cwd(), 'data');
    this.backupDir = null;
    this.stats = {
      orphanedInvoices: 0,
      orphanedProjectIndexes: 0,
      orphanedTaskIndexes: 0,
      projectsWithoutTasks: 0,
      totalCleaned: 0
    };
  }

  async run() {
    console.log('🧹 Starting orphaned data cleanup...\n');
    
    // Create backup directory
    await this.createBackupDirectory();
    
    // Step 1: Find and clean orphaned invoices
    await this.cleanOrphanedInvoices();
    
    // Step 2: Clean orphaned project indexes
    await this.cleanOrphanedProjectIndexes();
    
    // Step 3: Clean orphaned task indexes
    await this.cleanOrphanedTaskIndexes();
    
    // Step 4: Clean projects without tasks
    await this.cleanProjectsWithoutTasks();
    
    // Summary
    this.printSummary();
  }

  async createBackupDirectory() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(this.dataRoot, 'backups', `orphaned-cleanup-${timestamp}`);
    
    fs.mkdirSync(this.backupDir, { recursive: true });
    console.log(`💾 Backup directory created: ${this.backupDir}\n`);
  }

  async cleanOrphanedInvoices() {
    console.log('🔍 Checking for orphaned invoices...');
    
    const invoicesDir = path.join(this.dataRoot, 'invoices');
    if (!fs.existsSync(invoicesDir)) {
      console.log('   No invoices directory found');
      return;
    }

    // Get all existing projects with tasks
    const projectsWithTasks = await this.getProjectsWithTasks();
    const orphanedInvoices = [];

    // Recursively scan invoice directories
    await this.scanInvoiceDirectory(invoicesDir, projectsWithTasks, orphanedInvoices);

    if (orphanedInvoices.length > 0) {
      console.log(`   Found ${orphanedInvoices.length} orphaned invoices`);
      
      // Create backup
      const invoiceBackupDir = path.join(this.backupDir, 'orphaned-invoices');
      fs.mkdirSync(invoiceBackupDir, { recursive: true });
      
      for (const invoice of orphanedInvoices) {
        // Backup
        const backupPath = path.join(invoiceBackupDir, `${invoice.invoiceNumber}.json`);
        fs.copyFileSync(invoice.filePath, backupPath);
        
        // Delete original
        fs.unlinkSync(invoice.filePath);
        this.stats.orphanedInvoices++;
      }
      
      // Create manifest
      fs.writeFileSync(
        path.join(invoiceBackupDir, 'manifest.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          totalInvoices: orphanedInvoices.length,
          invoices: orphanedInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            projectId: inv.projectId,
            reason: inv.reason,
            originalPath: inv.filePath
          }))
        }, null, 2)
      );
      
      console.log(`   ✅ Cleaned ${orphanedInvoices.length} orphaned invoices`);
    } else {
      console.log('   ✅ No orphaned invoices found');
    }
    console.log('');
  }

  async scanInvoiceDirectory(dir, projectsWithTasks, orphanedInvoices) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await this.scanInvoiceDirectory(itemPath, projectsWithTasks, orphanedInvoices);
      } else if (item.endsWith('.json') && item !== 'manifest.json') {
        try {
          const invoiceData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
          
          // Check if invoice has a projectId and if that project has tasks
          if (invoiceData.projectId) {
            const projectKey = invoiceData.projectId.toString();
            if (!projectsWithTasks.has(projectKey)) {
              orphanedInvoices.push({
                ...invoiceData,
                filePath: itemPath,
                reason: 'Project has no tasks or does not exist'
              });
            }
          } else if (!invoiceData.isCustomProject) {
            // Non-custom invoices should have a projectId
            orphanedInvoices.push({
              ...invoiceData,
              filePath: itemPath,
              reason: 'Missing projectId for non-custom invoice'
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Error reading invoice ${itemPath}: ${error.message}`);
        }
      }
    }
  }

  async getProjectsWithTasks() {
    const projectsWithTasks = new Set();
    const tasksDir = path.join(this.dataRoot, 'project-tasks');
    
    if (!fs.existsSync(tasksDir)) {
      return projectsWithTasks;
    }

    // Scan task directories to find which projects have tasks
    await this.scanTaskDirectory(tasksDir, projectsWithTasks);
    
    return projectsWithTasks;
  }

  async scanTaskDirectory(dir, projectsWithTasks) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item !== 'metadata') {
        await this.scanTaskDirectory(itemPath, projectsWithTasks);
      } else if (item.endsWith('-task.json')) {
        try {
          const taskData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
          if (taskData.projectId) {
            projectsWithTasks.add(taskData.projectId.toString());
          }
        } catch (error) {
          console.log(`   ⚠️  Error reading task ${itemPath}: ${error.message}`);
        }
      }
    }
  }

  async cleanOrphanedProjectIndexes() {
    console.log('🔍 Checking for orphaned project indexes...');
    
    const projectIndexPath = path.join(this.dataRoot, 'projects', 'metadata', 'projects-index.json');
    const projectMetadataIndexPath = path.join(this.dataRoot, 'projects', 'metadata', 'projects-metadata-index.json');
    
    for (const indexPath of [projectIndexPath, projectMetadataIndexPath]) {
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const orphanedEntries = [];
        
        for (const [projectId, timestamp] of Object.entries(indexData)) {
          // Check if project file exists
          const projectExists = await this.projectFileExists(projectId, timestamp);
          if (!projectExists) {
            orphanedEntries.push(projectId);
          }
        }
        
        if (orphanedEntries.length > 0) {
          // Backup original
          const backupPath = path.join(this.backupDir, path.basename(indexPath));
          fs.copyFileSync(indexPath, backupPath);
          
          // Remove orphaned entries
          for (const projectId of orphanedEntries) {
            delete indexData[projectId];
            this.stats.orphanedProjectIndexes++;
          }
          
          // Write cleaned index
          fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
          console.log(`   ✅ Cleaned ${orphanedEntries.length} orphaned entries from ${path.basename(indexPath)}`);
        }
      }
    }
    console.log('');
  }

  async projectFileExists(projectId, timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const projectPath = path.join(this.dataRoot, 'projects', year.toString(), month, day, projectId, 'project.json');
    return fs.existsSync(projectPath);
  }

  async cleanOrphanedTaskIndexes() {
    console.log('🔍 Checking for orphaned task indexes...');
    
    const taskIndexPath = path.join(this.dataRoot, 'project-tasks', 'metadata', 'tasks-index.json');
    
    if (fs.existsSync(taskIndexPath)) {
      const indexData = JSON.parse(fs.readFileSync(taskIndexPath, 'utf8'));
      const orphanedEntries = [];
      
      for (const [taskId, metadata] of Object.entries(indexData)) {
        // Check if task file exists
        const taskExists = await this.taskFileExists(taskId, metadata);
        if (!taskExists) {
          orphanedEntries.push(taskId);
        }
      }
      
      if (orphanedEntries.length > 0) {
        // Backup original
        const backupPath = path.join(this.backupDir, 'tasks-index.json');
        fs.copyFileSync(taskIndexPath, backupPath);
        
        // Remove orphaned entries
        for (const taskId of orphanedEntries) {
          delete indexData[taskId];
          this.stats.orphanedTaskIndexes++;
        }
        
        // Write cleaned index
        fs.writeFileSync(taskIndexPath, JSON.stringify(indexData, null, 2));
        console.log(`   ✅ Cleaned ${orphanedEntries.length} orphaned entries from tasks-index.json`);
      }
    }
    console.log('');
  }

  async taskFileExists(taskId, metadata) {
    const date = new Date(metadata.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const taskPath = path.join(this.dataRoot, 'project-tasks', year.toString(), month, day, metadata.projectId, `${taskId}-task.json`);
    return fs.existsSync(taskPath);
  }

  async cleanProjectsWithoutTasks() {
    console.log('🔍 Checking for projects without tasks...');
    
    const projectsWithTasks = await this.getProjectsWithTasks();
    const projectsDir = path.join(this.dataRoot, 'projects');
    
    if (!fs.existsSync(projectsDir)) {
      console.log('   No projects directory found');
      return;
    }

    const projectsWithoutTasks = [];
    await this.scanProjectDirectory(projectsDir, projectsWithTasks, projectsWithoutTasks);
    
    if (projectsWithoutTasks.length > 0) {
      console.log(`   Found ${projectsWithoutTasks.length} projects without tasks`);
      
      // Create backup
      const projectBackupDir = path.join(this.backupDir, 'projects-without-tasks');
      fs.mkdirSync(projectBackupDir, { recursive: true });
      
      for (const project of projectsWithoutTasks) {
        // Backup
        const backupPath = path.join(projectBackupDir, `${project.projectId}.json`);
        fs.copyFileSync(project.filePath, backupPath);
        
        // Delete original
        fs.unlinkSync(project.filePath);
        this.stats.projectsWithoutTasks++;
      }
      
      console.log(`   ✅ Cleaned ${projectsWithoutTasks.length} projects without tasks`);
    } else {
      console.log('   ✅ No projects without tasks found');
    }
    console.log('');
  }

  async scanProjectDirectory(dir, projectsWithTasks, projectsWithoutTasks) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item !== 'metadata') {
        await this.scanProjectDirectory(itemPath, projectsWithTasks, projectsWithoutTasks);
      } else if (item === 'project.json') {
        try {
          const projectData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
          const projectKey = projectData.projectId.toString();
          
          if (!projectsWithTasks.has(projectKey)) {
            projectsWithoutTasks.push({
              ...projectData,
              filePath: itemPath
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Error reading project ${itemPath}: ${error.message}`);
        }
      }
    }
  }

  printSummary() {
    this.stats.totalCleaned = this.stats.orphanedInvoices + this.stats.orphanedProjectIndexes + 
                              this.stats.orphanedTaskIndexes + this.stats.projectsWithoutTasks;
    
    console.log('📊 Cleanup Summary:');
    console.log(`   Orphaned invoices cleaned: ${this.stats.orphanedInvoices}`);
    console.log(`   Orphaned project indexes cleaned: ${this.stats.orphanedProjectIndexes}`);
    console.log(`   Orphaned task indexes cleaned: ${this.stats.orphanedTaskIndexes}`);
    console.log(`   Projects without tasks cleaned: ${this.stats.projectsWithoutTasks}`);
    console.log(`   Total items cleaned: ${this.stats.totalCleaned}`);
    console.log(`\n💾 Backup created at: ${this.backupDir}`);
    console.log('\n✅ Cleanup completed successfully!');
    
    if (this.stats.totalCleaned > 0) {
      console.log('\n🔄 The TypeError in CommissionerInvoicePreviewPage should now be resolved.');
      console.log('   Please restart your development server to see the changes.');
    }
  }
}

// Run the cleanup
if (require.main === module) {
  const cleanup = new OrphanedDataCleanup();
  cleanup.run().catch(console.error);
}

module.exports = OrphanedDataCleanup;
