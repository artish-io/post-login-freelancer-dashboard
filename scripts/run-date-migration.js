#!/usr/bin/env node

/**
 * Admin script to execute the date separation migration
 * This script calls the API endpoints to back-fill existing projects and tasks
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...\n');
  
  try {
    // Check project migration status
    const projectResponse = await fetch(`${BASE_URL}/api/admin/migrate-project-dates`);
    const projectData = await projectResponse.json();
    
    if (projectData.success) {
      console.log('📊 Project Migration Status:');
      console.log(`  Total projects: ${projectData.data.totalProjects}`);
      console.log(`  Projects with new fields: ${projectData.data.projectsWithNewFields}`);
      console.log(`  Projects needing migration: ${projectData.data.projectsNeedingMigration}`);
      console.log(`  Migration needed: ${projectData.data.migrationNeeded ? 'YES' : 'NO'}\n`);
      
      if (projectData.data.projectsNeedingMigration > 0) {
        console.log('📋 Projects needing migration:');
        projectData.data.projectsNeedingMigrationList.forEach(project => {
          console.log(`  - ${project.projectId} (created: ${project.createdAt}, due: ${project.dueDate})`);
        });
        console.log('');
      }
    } else {
      console.error('❌ Failed to check project migration status:', projectData.error);
      return false;
    }
    
    // Check task migration status
    const taskResponse = await fetch(`${BASE_URL}/api/admin/migrate-task-dates`);
    const taskData = await taskResponse.json();
    
    if (taskData.success) {
      console.log('📊 Task Migration Status:');
      console.log(`  Total tasks: ${taskData.data.totalTasks}`);
      console.log(`  Tasks with new fields: ${taskData.data.tasksWithNewFields}`);
      console.log(`  Tasks needing migration: ${taskData.data.tasksNeedingMigration}`);
      console.log(`  Migration needed: ${taskData.data.migrationNeeded ? 'YES' : 'NO'}\n`);
    } else {
      console.error('❌ Failed to check task migration status:', taskData.error);
      return false;
    }
    
    return {
      projectsNeedMigration: projectData.data.migrationNeeded,
      tasksNeedMigration: taskData.data.migrationNeeded,
      projectCount: projectData.data.projectsNeedingMigration,
      taskCount: taskData.data.tasksNeedingMigration
    };
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return false;
  }
}

async function runProjectMigration() {
  console.log('🔄 Running project migration...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/migrate-project-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Project migration completed successfully!');
      console.log(`📊 Results: ${data.data.migratedCount} migrated, ${data.data.errorCount} errors`);
      console.log(`📈 Total projects: ${data.data.totalProjects}\n`);
      
      if (data.data.results && data.data.results.length > 0) {
        console.log('📋 Migration details:');
        data.data.results.forEach(result => {
          if (result.status === 'success') {
            console.log(`  ✅ ${result.projectId}: ${result.changes.dueDateChanged ? 'Due date updated' : 'Date fields added'}`);
            if (result.changes.dueDateChanged) {
              console.log(`     Old due date: ${result.changes.oldDueDate}`);
              console.log(`     New due date: ${result.changes.newDueDate}`);
            }
          } else {
            console.log(`  ❌ ${result.projectId}: ${result.error}`);
          }
        });
        console.log('');
      }
      
      return true;
    } else {
      console.error('❌ Project migration failed:', data.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error running project migration:', error.message);
    return false;
  }
}

async function runTaskMigration() {
  console.log('🔄 Running task migration...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/migrate-task-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Task migration completed successfully!');
      console.log(`📊 Results: ${data.data.migratedCount} migrated, ${data.data.errorCount} errors`);
      console.log(`📈 Total tasks: ${data.data.totalTasks}\n`);
      
      return true;
    } else {
      console.error('❌ Task migration failed:', data.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error running task migration:', error.message);
    return false;
  }
}

async function main() {
  console.log('🛡️ Date Separation Migration Tool\n');
  console.log('This tool will back-fill existing projects and tasks with date separation fields.\n');
  
  // Check current status
  const status = await checkMigrationStatus();
  if (!status) {
    console.error('❌ Failed to check migration status. Exiting.');
    process.exit(1);
  }
  
  // If no migration needed
  if (!status.projectsNeedMigration && !status.tasksNeedMigration) {
    console.log('🎉 No migration needed! All projects and tasks already have date separation fields.');
    process.exit(0);
  }
  
  // Confirm migration
  console.log('⚠️  MIGRATION REQUIRED:');
  if (status.projectsNeedMigration) {
    console.log(`  📦 ${status.projectCount} projects need migration`);
  }
  if (status.tasksNeedMigration) {
    console.log(`  📋 ${status.taskCount} tasks need migration`);
  }
  console.log('');
  console.log('This migration will:');
  console.log('  • Add date separation fields to existing projects');
  console.log('  • Recalculate due dates to preserve project duration');
  console.log('  • Add task-level duration information');
  console.log('  • Maintain backward compatibility');
  console.log('');
  
  // For now, auto-proceed (in production, you might want user confirmation)
  console.log('🚀 Starting migration...\n');
  
  let success = true;
  
  // Run project migration first
  if (status.projectsNeedMigration) {
    success = await runProjectMigration() && success;
  }
  
  // Run task migration second
  if (status.tasksNeedMigration) {
    success = await runTaskMigration() && success;
  }
  
  if (success) {
    console.log('🎉 Migration completed successfully!');
    console.log('✅ All projects and tasks now have date separation fields.');
    console.log('🔗 Components will now sort by due date correctly.');
    process.exit(0);
  } else {
    console.log('❌ Migration completed with errors. Please check the logs above.');
    process.exit(1);
  }
}

// Run the migration
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
