#!/usr/bin/env node

/**
 * Migration Script: Project Tasks to Hierarchical Structure
 * 
 * Migrates data from data/project-tasks.json to hierarchical structure:
 * data/project-tasks/[year]/[month]/[day]/[projectId]/[taskId]-task.json
 */

const fs = require('fs').promises;
const path = require('path');

// We'll implement the functions directly in this script since we can't import TS files
// Import path utilities
const { format } = require('date-fns');

const LEGACY_FILE_PATH = path.join(process.cwd(), 'data', 'project-tasks.json');
const BACKUP_FILE_PATH = path.join(process.cwd(), 'data', 'project-tasks.json.backup');

// Helper functions (copied from hierarchical-storage.ts)
function generateTaskFilePath(dueDate, projectId, taskId) {
  const date = new Date(dueDate);
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  return path.join(
    process.cwd(),
    'data',
    'project-tasks',
    year,
    month,
    day,
    projectId.toString(),
    `${taskId}-task.json`
  );
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function writeTask(task) {
  const filePath = generateTaskFilePath(task.dueDate, task.projectId, task.taskId);
  const dirPath = path.dirname(filePath);

  await ensureDirectoryExists(dirPath);

  const taskWithTimestamp = {
    ...task,
    lastModified: new Date().toISOString()
  };

  await fs.writeFile(filePath, JSON.stringify(taskWithTimestamp, null, 2));
}

function convertLegacyToHierarchical(legacyProject) {
  const now = new Date().toISOString();

  return legacyProject.tasks.map(task => ({
    taskId: task.id,
    projectId: legacyProject.projectId,
    projectTitle: legacyProject.title,
    organizationId: legacyProject.organizationId,
    projectTypeTags: legacyProject.typeTags,
    title: task.title,
    status: task.status,
    completed: task.completed,
    order: task.order,
    link: task.link,
    dueDate: task.dueDate,
    rejected: task.rejected,
    feedbackCount: task.feedbackCount,
    pushedBack: task.pushedBack,
    version: task.version,
    description: task.description,
    submittedDate: task.submittedDate,
    approvedDate: task.approvedDate,
    rejectedDate: task.rejectedDate,
    createdDate: now,
    lastModified: now
  }));
}

async function readAllTasks() {
  const tasks = [];
  const basePath = path.join(process.cwd(), 'data', 'project-tasks');

  try {
    const years = await fs.readdir(basePath);

    for (const year of years) {
      const yearPath = path.join(basePath, year);
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const projects = await fs.readdir(dayPath);

          for (const project of projects) {
            const projectPath = path.join(dayPath, project);
            const taskFiles = await fs.readdir(projectPath);

            for (const taskFile of taskFiles) {
              if (taskFile.endsWith('-task.json')) {
                const taskPath = path.join(projectPath, taskFile);
                const content = await fs.readFile(taskPath, 'utf-8');
                const task = JSON.parse(content);
                tasks.push(task);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error reading all tasks:', error);
  }

  return tasks;
}

async function main() {
  console.log('🚀 Starting Project Tasks Migration to Hierarchical Structure');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if legacy file exists
    console.log('📁 Checking for legacy project-tasks.json file...');
    
    let legacyData;
    try {
      const legacyContent = await fs.readFile(LEGACY_FILE_PATH, 'utf-8');
      legacyData = JSON.parse(legacyContent);
      console.log(`✅ Found legacy file with ${legacyData.length} projects`);
    } catch (error) {
      console.error('❌ Legacy project-tasks.json file not found or invalid');
      console.error('   Make sure the file exists and contains valid JSON');
      process.exit(1);
    }

    // Step 2: Validate legacy data structure
    console.log('\n🔍 Validating legacy data structure...');
    
    if (!Array.isArray(legacyData)) {
      throw new Error('Legacy data is not an array');
    }

    let totalTasks = 0;
    for (const project of legacyData) {
      if (!project.projectId || !project.tasks || !Array.isArray(project.tasks)) {
        throw new Error(`Invalid project structure: ${JSON.stringify(project)}`);
      }
      totalTasks += project.tasks.length;
    }
    
    console.log(`✅ Validation passed: ${legacyData.length} projects, ${totalTasks} total tasks`);

    // Step 3: Create backup of legacy file
    console.log('\n💾 Creating backup of legacy file...');
    await fs.copyFile(LEGACY_FILE_PATH, BACKUP_FILE_PATH);
    console.log(`✅ Backup created: ${BACKUP_FILE_PATH}`);

    // Step 4: Ensure base directory exists
    console.log('\n📂 Setting up hierarchical directory structure...');
    const baseDir = path.join(process.cwd(), 'data', 'project-tasks');
    await ensureDirectoryExists(baseDir);
    console.log(`✅ Base directory ready: ${baseDir}`);

    // Step 5: Migrate each project
    console.log('\n🔄 Starting migration process...');
    
    let migratedProjects = 0;
    let migratedTasks = 0;
    const migrationErrors = [];

    for (const legacyProject of legacyData) {
      try {
        console.log(`\n  📋 Migrating project ${legacyProject.projectId}: ${legacyProject.title}`);
        
        // Convert legacy project to hierarchical tasks
        const hierarchicalTasks = convertLegacyToHierarchical(legacyProject);
        
        // Write each task to its hierarchical location
        for (const task of hierarchicalTasks) {
          try {
            await writeTask(task);
            migratedTasks++;
            console.log(`    ✅ Task ${task.taskId}: ${task.title} -> ${task.dueDate}`);
          } catch (taskError) {
            const errorMsg = `Failed to migrate task ${task.taskId} in project ${legacyProject.projectId}: ${taskError.message}`;
            migrationErrors.push(errorMsg);
            console.error(`    ❌ ${errorMsg}`);
          }
        }
        
        migratedProjects++;
        console.log(`  ✅ Project ${legacyProject.projectId} migration complete (${hierarchicalTasks.length} tasks)`);
        
      } catch (projectError) {
        const errorMsg = `Failed to migrate project ${legacyProject.projectId}: ${projectError.message}`;
        migrationErrors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // Step 6: Migration summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Projects migrated: ${migratedProjects}/${legacyData.length}`);
    console.log(`✅ Tasks migrated: ${migratedTasks}/${totalTasks}`);
    
    if (migrationErrors.length > 0) {
      console.log(`❌ Errors encountered: ${migrationErrors.length}`);
      console.log('\n🚨 MIGRATION ERRORS:');
      migrationErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Step 7: Verification
    console.log('\n🔍 Verifying migration...');
    
    try {
      // Try to read back some tasks to verify the structure works
      const allMigratedTasks = await readAllTasks();
      
      console.log(`✅ Verification passed: ${allMigratedTasks.length} tasks readable from hierarchical structure`);
      
      if (allMigratedTasks.length !== migratedTasks) {
        console.warn(`⚠️  Warning: Migrated ${migratedTasks} tasks but can only read ${allMigratedTasks.length}`);
      }
      
    } catch (verificationError) {
      console.error(`❌ Verification failed: ${verificationError.message}`);
      migrationErrors.push(`Verification failed: ${verificationError.message}`);
    }

    // Step 8: Final recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 NEXT STEPS');
    console.log('=' .repeat(60));
    
    if (migrationErrors.length === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('📝 Recommended actions:');
      console.log('  1. Test the new hierarchical structure with your application');
      console.log('  2. Update all API routes to use the new structure');
      console.log('  3. Update React components to work with new APIs');
      console.log('  4. Run comprehensive tests');
      console.log('  5. Once verified, you can remove the backup file');
      console.log('');
      console.log('💾 Backup file location:');
      console.log(`   ${BACKUP_FILE_PATH}`);
      console.log('');
      console.log('🗂️  New hierarchical structure location:');
      console.log(`   ${baseDir}/[year]/[month]/[day]/[projectId]/[taskId]-task.json`);
      
    } else {
      console.log('⚠️  Migration completed with errors!');
      console.log('');
      console.log('🔧 Recommended actions:');
      console.log('  1. Review and fix the errors listed above');
      console.log('  2. Re-run the migration script');
      console.log('  3. Do not proceed with API updates until migration is clean');
      console.log('');
      console.log('💾 Your original data is safe in:');
      console.log(`   ${LEGACY_FILE_PATH}`);
      console.log(`   ${BACKUP_FILE_PATH}`);
    }

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during migration:');
    console.error(error.message);
    console.error('\n🔧 Your original data is safe. Please fix the error and try again.');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
