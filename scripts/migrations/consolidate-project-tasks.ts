#!/usr/bin/env node

/**
 * Consolidate Project Tasks Migration
 *
 * Scans existing scattered task files under data/project-tasks and
 * merges them into canonical data/projects/projectId/tasks/tasks.json files.
 *
 * Features:
 * - De-duplicates by task ID (last write wins by mtime)
 * - Sorts by ID ascending
 * - Archives original files under tasks/_archive/YYYY-MM-DD/
 * - Uses atomic writes for safety
 * - Provides detailed logging and progress reporting
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { writeJsonAtomic, readJson, ensureDir, fileExists } from '../../src/lib/fs-json';
import { Task, TasksContainer } from '../../src/lib/tasks/task-store';

interface MigrationStats {
  projectsProcessed: number;
  tasksConsolidated: number;
  filesArchived: number;
  errors: string[];
  warnings: string[];
}

interface ProjectTaskData {
  projectId: number;
  tasks: Map<number, { task: Task; mtime: number; originalPath: string }>;
}

/**
 * Main migration function
 */
async function runMigration(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    projectsProcessed: 0,
    tasksConsolidated: 0,
    filesArchived: 0,
    errors: [],
    warnings: []
  };
  
  console.log('🚀 Starting project tasks consolidation migration...\n');
  
  try {
    // Scan for all task files
    const projectTasksDir = path.join(process.cwd(), 'data', 'project-tasks');
    const projectData = new Map<number, ProjectTaskData>();
    
    console.log('📂 Scanning for scattered task files...');
    await scanTaskFiles(projectTasksDir, projectData, stats);
    
    console.log(`\n📊 Found tasks for ${projectData.size} projects`);
    
    // Process each project
    for (const [projectId, data] of projectData) {
      try {
        await consolidateProjectTasks(projectId, data, stats);
        stats.projectsProcessed++;
      } catch (error) {
        const errorMsg = `Failed to consolidate project ${projectId}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
    
    // Print summary
    printMigrationSummary(stats);
    
    return stats;
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    stats.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Recursively scan for task files
 */
async function scanTaskFiles(
  dir: string,
  projectData: Map<number, ProjectTaskData>,
  stats: MigrationStats
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanTaskFiles(fullPath, projectData, stats);
      } else if (entry.name.includes('task') && entry.name.endsWith('.json')) {
        await processTaskFile(fullPath, projectData, stats);
      }
    }
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      stats.warnings.push(`Could not scan directory ${dir}: ${error}`);
    }
  }
}

/**
 * Process a single task file
 */
async function processTaskFile(
  filePath: string,
  projectData: Map<number, ProjectTaskData>,
  stats: MigrationStats
): Promise<void> {
  try {
    const taskData = await readJson<any>(filePath, null);
    const taskId = taskData?.id || taskData?.taskId;
    if (!taskData || typeof taskData.projectId !== 'number' || typeof taskId !== 'number') {
      stats.warnings.push(`Skipping invalid task file: ${filePath} - missing projectId or taskId`);
      return;
    }
    
    const projectId = taskData.projectId;
    
    // Get or create project data
    if (!projectData.has(projectId)) {
      projectData.set(projectId, {
        projectId,
        tasks: new Map()
      });
    }
    
    const project = projectData.get(projectId)!;
    const fileStats = await fs.stat(filePath);
    const normalizedTask = normalizeTask(taskData);
    
    // Last write wins by mtime
    const existing = project.tasks.get(taskId);
    if (!existing || fileStats.mtime.getTime() > existing.mtime) {
      project.tasks.set(taskId, {
        task: normalizedTask,
        mtime: fileStats.mtime.getTime(),
        originalPath: filePath
      });
    }
    
    console.log(`📋 Found task ${taskId} for project ${projectId}: ${taskData.title || 'Untitled'}`);
  } catch (error) {
    stats.warnings.push(`Could not process task file ${filePath}: ${error}`);
  }
}

/**
 * Normalize task data to canonical format
 */
function normalizeTask(taskData: any): Task {
  return {
    id: taskData.id || taskData.taskId,
    title: taskData.title || 'Untitled Task',
    status: mapStatus(taskData.status),
    milestoneId: taskData.milestoneId || null,
    completedAt: taskData.completedAt || (taskData.completed ? taskData.lastModified || new Date().toISOString() : null),
    links: {
      brief: taskData.links?.brief || '',
      work: taskData.links?.work || taskData.link || ''
    },
    // Preserve additional fields for compatibility
    projectId: taskData.projectId,
    description: taskData.description,
    dueDate: taskData.dueDate,
    order: taskData.order,
    version: taskData.version,
    createdDate: taskData.createdDate,
    lastModified: taskData.lastModified
  };
}

/**
 * Map various status formats to canonical format
 */
function mapStatus(status: string): Task['status'] {
  const normalized = status?.toLowerCase() || 'todo';
  
  if (normalized.includes('ongoing') || normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('review') || normalized.includes('submitted')) return 'review';
  if (normalized.includes('approved') || normalized.includes('done') || normalized.includes('completed')) return 'done';
  
  return 'todo';
}

/**
 * Consolidate tasks for a single project
 */
async function consolidateProjectTasks(
  projectId: number,
  data: ProjectTaskData,
  stats: MigrationStats
): Promise<void> {
  console.log(`\n🔄 Processing project ${projectId} with ${data.tasks.size} tasks...`);
  
  // Sort tasks by ID
  const sortedTasks = Array.from(data.tasks.values())
    .sort((a, b) => a.task.id - b.task.id)
    .map(item => item.task);
  
  // Create canonical tasks file
  const tasksDir = path.join(process.cwd(), 'data', 'projects', projectId.toString(), 'tasks');
  const tasksPath = path.join(tasksDir, 'tasks.json');
  
  // Check if canonical file already exists
  if (await fileExists(tasksPath)) {
    console.log(`⚠️ Canonical tasks file already exists for project ${projectId}, skipping...`);
    stats.warnings.push(`Project ${projectId} already has canonical tasks file`);
    return;
  }
  
  // Create tasks container
  const container: TasksContainer = {
    tasks: sortedTasks,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  
  // Write canonical file
  await writeJsonAtomic(tasksPath, container);
  stats.tasksConsolidated += sortedTasks.length;
  
  console.log(`✅ Created canonical tasks file: ${tasksPath}`);
  
  // Archive original files
  await archiveOriginalFiles(projectId, data, stats);
  
  console.log(`📦 Archived ${data.tasks.size} original task files for project ${projectId}`);
}

/**
 * Archive original task files
 */
async function archiveOriginalFiles(
  projectId: number,
  data: ProjectTaskData,
  stats: MigrationStats
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const archiveDir = path.join(
    process.cwd(),
    'data',
    'projects',
    projectId.toString(),
    'tasks',
    '_archive',
    today
  );
  
  await ensureDir(archiveDir);
  
  // Create archive manifest
  const manifest = {
    archivedAt: new Date().toISOString(),
    projectId,
    taskCount: data.tasks.size,
    reason: 'Migration to canonical tasks.json',
    originalFiles: Array.from(data.tasks.values()).map(item => ({
      taskId: item.task.id,
      originalPath: item.originalPath,
      mtime: new Date(item.mtime).toISOString()
    }))
  };
  
  await writeJsonAtomic(path.join(archiveDir, 'manifest.json'), manifest);
  
  // Copy original files to archive (don't delete originals for safety)
  for (const [taskId, item] of data.tasks) {
    try {
      const originalContent = await fs.readFile(item.originalPath, 'utf-8');
      const archiveFileName = `task-${taskId}-${path.basename(item.originalPath)}`;
      const archivePath = path.join(archiveDir, archiveFileName);
      
      await fs.writeFile(archivePath, originalContent);
      stats.filesArchived++;
    } catch (error) {
      stats.warnings.push(`Could not archive ${item.originalPath}: ${error}`);
    }
  }
}

/**
 * Print migration summary
 */
function printMigrationSummary(stats: MigrationStats): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Projects processed: ${stats.projectsProcessed}`);
  console.log(`📋 Tasks consolidated: ${stats.tasksConsolidated}`);
  console.log(`📦 Files archived: ${stats.filesArchived}`);
  console.log(`⚠️  Warnings: ${stats.warnings.length}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    stats.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🎉 Migration completed!');
  
  if (stats.projectsProcessed > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Verify canonical tasks files are working correctly');
    console.log('2. Update API endpoints to use canonical task storage');
    console.log('3. Run tests to ensure milestone invoicing flow works');
    console.log('4. Consider removing original scattered task files after verification');
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration as consolidateProjectTasks };
export type { MigrationStats };
