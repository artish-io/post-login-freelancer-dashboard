#!/usr/bin/env tsx

/**
 * Migration Script: Flat to Hierarchical Storage
 * 
 * Migrates legacy flat JSON files to hierarchical storage structure.
 * Supports dry-run mode and is idempotent.
 * 
 * Usage:
 *   npm run migrate:storage
 *   npm run migrate:storage -- --dry-run
 *   npm run migrate:storage -- --verbose
 */

import { promises as fs } from 'fs';
import path from 'path';
import { UnifiedStorageService } from '../src/lib/storage/unified-storage-service';
import { parseProject, parseTask } from '../src/lib/storage/schemas';

interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
}

interface MigrationResult {
  projectsMigrated: number;
  tasksMigrated: number;
  errors: Array<{
    type: 'project' | 'task';
    id: string | number;
    error: string;
  }>;
  skipped: Array<{
    type: 'project' | 'task';
    id: string | number;
    reason: string;
  }>;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrate projects from flat file to hierarchical storage
 */
async function migrateProjects(options: MigrationOptions): Promise<Partial<MigrationResult>> {
  const result: Partial<MigrationResult> = {
    projectsMigrated: 0,
    errors: [],
    skipped: []
  };

  const legacyPath = path.join(process.cwd(), 'data', 'projects.json');
  
  if (!(await fileExists(legacyPath))) {
    console.log('📄 No legacy projects.json file found, skipping project migration');
    return result;
  }

  try {
    const data = await fs.readFile(legacyPath, 'utf-8');
    const projects = JSON.parse(data);

    console.log(`📦 Found ${projects.length} projects in legacy file`);

    for (const projectData of projects) {
      try {
        // Validate project data
        const project = parseProject(projectData);
        
        // Check if already exists in hierarchical storage
        const existing = await UnifiedStorageService.readProject(project.projectId);
        if (existing) {
          result.skipped!.push({
            type: 'project',
            id: project.projectId,
            reason: 'Already exists in hierarchical storage'
          });
          if (options.verbose) {
            console.log(`⏭️  Skipping project ${project.projectId} (already exists)`);
          }
          continue;
        }

        if (!options.dryRun) {
          await UnifiedStorageService.writeProject(project);
        }

        result.projectsMigrated!++;
        
        if (options.verbose || options.dryRun) {
          console.log(`${options.dryRun ? '🔍' : '✅'} ${options.dryRun ? 'Would migrate' : 'Migrated'} project ${project.projectId}: ${project.title}`);
        }
      } catch (error) {
        result.errors!.push({
          type: 'project',
          id: projectData.projectId || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`❌ Error migrating project ${projectData.projectId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error reading legacy projects file:', error);
    result.errors!.push({
      type: 'project',
      id: 'file',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return result;
}

/**
 * Migrate tasks from flat file to hierarchical storage
 */
async function migrateTasks(options: MigrationOptions): Promise<Partial<MigrationResult>> {
  const result: Partial<MigrationResult> = {
    tasksMigrated: 0,
    errors: [],
    skipped: []
  };

  const legacyPath = path.join(process.cwd(), 'data', 'project-tasks.json');
  
  if (!(await fileExists(legacyPath))) {
    console.log('📄 No legacy project-tasks.json file found, skipping task migration');
    return result;
  }

  try {
    const data = await fs.readFile(legacyPath, 'utf-8');
    const tasks = JSON.parse(data);

    console.log(`📦 Found ${tasks.length} tasks in legacy file`);

    for (const taskData of tasks) {
      try {
        // Validate task data
        const task = parseTask(taskData);
        
        // Check if already exists in hierarchical storage
        const existing = await UnifiedStorageService.readTask(task.projectId, task.taskId);
        if (existing) {
          result.skipped!.push({
            type: 'task',
            id: task.taskId,
            reason: 'Already exists in hierarchical storage'
          });
          if (options.verbose) {
            console.log(`⏭️  Skipping task ${task.taskId} (already exists)`);
          }
          continue;
        }

        if (!options.dryRun) {
          await UnifiedStorageService.writeTask(task);
        }

        result.tasksMigrated!++;
        
        if (options.verbose || options.dryRun) {
          console.log(`${options.dryRun ? '🔍' : '✅'} ${options.dryRun ? 'Would migrate' : 'Migrated'} task ${task.taskId}: ${task.title}`);
        }
      } catch (error) {
        result.errors!.push({
          type: 'task',
          id: taskData.taskId || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`❌ Error migrating task ${taskData.taskId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error reading legacy tasks file:', error);
    result.errors!.push({
      type: 'task',
      id: 'file',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return result;
}

/**
 * Main migration function
 */
async function migrate(options: MigrationOptions): Promise<void> {
  console.log('🚀 Starting flat-to-hierarchical migration...');
  console.log(`📋 Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`📋 Verbose: ${options.verbose ? 'ON' : 'OFF'}`);
  console.log('');

  const startTime = Date.now();

  // Migrate projects
  console.log('📁 Migrating projects...');
  const projectResult = await migrateProjects(options);

  // Migrate tasks
  console.log('📁 Migrating tasks...');
  const taskResult = await migrateTasks(options);

  // Combine results
  const totalResult: MigrationResult = {
    projectsMigrated: projectResult.projectsMigrated || 0,
    tasksMigrated: taskResult.tasksMigrated || 0,
    errors: [...(projectResult.errors || []), ...(taskResult.errors || [])],
    skipped: [...(projectResult.skipped || []), ...(taskResult.skipped || [])]
  };

  const duration = Date.now() - startTime;

  // Print summary
  console.log('');
  console.log('📊 Migration Summary');
  console.log('===================');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`✅ Projects ${options.dryRun ? 'would be' : ''} migrated: ${totalResult.projectsMigrated}`);
  console.log(`✅ Tasks ${options.dryRun ? 'would be' : ''} migrated: ${totalResult.tasksMigrated}`);
  console.log(`⏭️  Items skipped: ${totalResult.skipped.length}`);
  console.log(`❌ Errors: ${totalResult.errors.length}`);

  if (totalResult.errors.length > 0) {
    console.log('');
    console.log('❌ Errors encountered:');
    totalResult.errors.forEach(error => {
      console.log(`   ${error.type} ${error.id}: ${error.error}`);
    });
  }

  if (options.dryRun) {
    console.log('');
    console.log('🔍 This was a dry run. No files were modified.');
    console.log('   Run without --dry-run to perform the actual migration.');
  } else if (totalResult.projectsMigrated > 0 || totalResult.tasksMigrated > 0) {
    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('   Legacy files are preserved. You may archive them manually.');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    await migrate(options);
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrate };
export type { MigrationOptions, MigrationResult };
