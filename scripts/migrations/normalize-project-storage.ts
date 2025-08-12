/**
 * Normalize Project Storage Migration
 * 
 * Migrates legacy projects (data/projects/<id>/) to hierarchical storage
 * (data/projects/YYYY/MM/DD/<id>/) and maintains proper indexing.
 * 
 * Safe to re-run idempotently.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { readJson, writeJsonAtomic, ensureDir, fileExists } from '../../src/lib/fs-json';
import { 
  loadProjectsIndex, 
  saveProjectsIndex, 
  ProjectsIndex 
} from '../../src/lib/storage/projects-index';
import { deriveHierarchicalPath } from '../../src/lib/storage/project-paths';

interface MigrationStats {
  hierarchicalProjectsIndexed: number;
  legacyProjectsMigrated: number;
  legacyProjectsSkipped: number;
  tasksDirectoriesMigrated: number;
  markersCreated: number;
  errors: string[];
  warnings: string[];
}

interface ProjectData {
  projectId: number;
  id?: number;
  createdAt?: string;
  title?: string;
  [key: string]: unknown;
}

const DATA_PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

/**
 * Main migration function
 */
async function runMigration(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    hierarchicalProjectsIndexed: 0,
    legacyProjectsMigrated: 0,
    legacyProjectsSkipped: 0,
    tasksDirectoriesMigrated: 0,
    markersCreated: 0,
    errors: [],
    warnings: []
  };

  console.log('🚀 Starting project storage normalization...');

  try {
    // Step 1: Index all hierarchical projects
    await indexHierarchicalProjects(stats);

    // Step 2: Migrate legacy projects
    await migrateLegacyProjects(stats);

    // Step 3: Report results
    reportMigrationResults(stats);

  } catch (error) {
    stats.errors.push(`Migration failed: ${error}`);
    console.error('💥 Migration failed:', error);
  }

  return stats;
}

/**
 * Index all existing hierarchical projects
 */
async function indexHierarchicalProjects(stats: MigrationStats): Promise<void> {
  console.log('📂 Indexing hierarchical projects...');

  const index = await loadProjectsIndex();
  let indexUpdated = false;

  try {
    const years = await fs.readdir(DATA_PROJECTS_DIR);

    for (const year of years) {
      if (!/^\d{4}$/.test(year)) continue;

      const yearPath = path.join(DATA_PROJECTS_DIR, year);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;

      const months = await fs.readdir(yearPath);

      for (const month of months) {
        if (!/^\d{2}$/.test(month)) continue;

        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);
        if (!monthStat.isDirectory()) continue;

        const days = await fs.readdir(monthPath);

        for (const day of days) {
          if (!/^\d{2}$/.test(day)) continue;

          const dayPath = path.join(monthPath, day);
          const dayStat = await fs.stat(dayPath);
          if (!dayStat.isDirectory()) continue;

          const projectIds = await fs.readdir(dayPath);

          for (const projectIdStr of projectIds) {
            if (!/^\d+$/.test(projectIdStr)) continue;

            const projectPath = path.join(dayPath, projectIdStr, 'project.json');

            try {
              if (await fileExists(projectPath)) {
                const projectData = await readJson<ProjectData>(projectPath, {});
                const projectId = projectData.projectId || projectData.id;

                if (projectId) {
                  const hierarchicalPath = `${year}/${month}/${day}/${projectIdStr}`;
                  
                  // Add to index if not already present
                  if (!index[String(projectId)]) {
                    index[String(projectId)] = {
                      path: hierarchicalPath,
                      lastUpdated: new Date().toISOString()
                    };
                    indexUpdated = true;
                    stats.hierarchicalProjectsIndexed++;
                  }
                }
              }
            } catch (error) {
              stats.warnings.push(`Failed to read hierarchical project ${projectPath}: ${error}`);
            }
          }
        }
      }
    }

    if (indexUpdated) {
      await saveProjectsIndex(index);
      console.log(`✅ Indexed ${stats.hierarchicalProjectsIndexed} hierarchical projects`);
    }

  } catch (error) {
    stats.errors.push(`Failed to index hierarchical projects: ${error}`);
  }
}

/**
 * Migrate legacy projects to hierarchical storage
 */
async function migrateLegacyProjects(stats: MigrationStats): Promise<void> {
  console.log('📦 Migrating legacy projects...');

  try {
    const entries = await fs.readdir(DATA_PROJECTS_DIR);
    const index = await loadProjectsIndex();

    for (const entry of entries) {
      // Skip non-numeric directories (these are years or other files)
      if (!/^\d+$/.test(entry)) continue;

      const legacyProjectDir = path.join(DATA_PROJECTS_DIR, entry);
      const legacyProjectFile = path.join(legacyProjectDir, 'project.json');

      try {
        const stat = await fs.stat(legacyProjectDir);
        if (!stat.isDirectory()) continue;

        if (!(await fileExists(legacyProjectFile))) {
          stats.warnings.push(`Legacy directory ${entry} has no project.json`);
          continue;
        }

        const projectData = await readJson<ProjectData>(legacyProjectFile, {});
        const projectId = projectData.projectId || projectData.id || parseInt(entry);

        // Check if already has hierarchical version
        const existingIndexEntry = index[String(projectId)];
        if (existingIndexEntry) {
          const hierarchicalFile = path.join(DATA_PROJECTS_DIR, existingIndexEntry.path, 'project.json');
          if (await fileExists(hierarchicalFile)) {
            // Mark legacy as do-not-write
            await createLegacyMarker(legacyProjectDir, existingIndexEntry.path);
            stats.legacyProjectsSkipped++;
            continue;
          }
        }

        // Migrate to hierarchical storage
        await migrateLegacyProject(legacyProjectDir, projectData, projectId, stats);

      } catch (error) {
        stats.errors.push(`Failed to process legacy project ${entry}: ${error}`);
      }
    }

  } catch (error) {
    stats.errors.push(`Failed to scan legacy projects: ${error}`);
  }
}

/**
 * Migrate a single legacy project
 */
async function migrateLegacyProject(
  legacyDir: string, 
  projectData: ProjectData, 
  projectId: number, 
  stats: MigrationStats
): Promise<void> {
  try {
    // Determine creation date
    const createdAt = projectData.createdAt || await getFileCreationDate(path.join(legacyDir, 'project.json'));
    
    // Derive hierarchical path
    const hierarchicalPath = deriveHierarchicalPath(projectId, createdAt);
    const hierarchicalDir = path.join(DATA_PROJECTS_DIR, hierarchicalPath);
    const hierarchicalFile = path.join(hierarchicalDir, 'project.json');

    // Ensure hierarchical directory exists
    await ensureDir(hierarchicalDir);

    // Copy project.json with updated createdAt if missing
    const updatedProjectData = {
      ...projectData,
      projectId,
      createdAt
    };
    await writeJsonAtomic(hierarchicalFile, updatedProjectData);

    // Migrate tasks directory if it exists
    const legacyTasksDir = path.join(legacyDir, 'tasks');
    if (await fileExists(legacyTasksDir)) {
      const hierarchicalTasksDir = path.join(hierarchicalDir, 'tasks');
      await copyDirectory(legacyTasksDir, hierarchicalTasksDir);
      stats.tasksDirectoriesMigrated++;
    }

    // Update index
    const index = await loadProjectsIndex();
    index[String(projectId)] = {
      path: hierarchicalPath,
      lastUpdated: new Date().toISOString()
    };
    await saveProjectsIndex(index);

    // Create migration marker in legacy directory
    await createMigrationMarker(legacyDir, hierarchicalPath);

    stats.legacyProjectsMigrated++;
    console.log(`✅ Migrated project ${projectId} to ${hierarchicalPath}`);

  } catch (error) {
    stats.errors.push(`Failed to migrate project ${projectId}: ${error}`);
  }
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Create migration marker in legacy directory
 */
async function createMigrationMarker(legacyDir: string, hierarchicalPath: string): Promise<void> {
  const markerFile = path.join(legacyDir, '_migrated.README');
  const content = `This project has been migrated to hierarchical storage.

New location: data/projects/${hierarchicalPath}/
Migration date: ${new Date().toISOString()}

This directory is now read-only. All writes should go to the new location.
This directory can be safely deleted after verifying the migration.
`;

  await writeJsonAtomic(markerFile, content);
}

/**
 * Create legacy marker for projects that have hierarchical twins
 */
async function createLegacyMarker(legacyDir: string, hierarchicalPath: string): Promise<void> {
  const markerFile = path.join(legacyDir, '_legacy.DO_NOT_WRITE');
  const content = `This is a legacy project directory.

Canonical location: data/projects/${hierarchicalPath}/
Marked date: ${new Date().toISOString()}

DO NOT WRITE TO THIS DIRECTORY.
All writes should go to the canonical hierarchical location.
This directory is kept for read-only fallback purposes.
`;

  await writeJsonAtomic(markerFile, content);
}

/**
 * Get file creation date as fallback
 */
async function getFileCreationDate(filePath: string): Promise<string> {
  try {
    const stat = await fs.stat(filePath);
    return stat.birthtime.toISOString();
  } catch (error) {
    // Fallback to current date
    return new Date().toISOString();
  }
}

/**
 * Report migration results
 */
function reportMigrationResults(stats: MigrationStats): void {
  console.log('\n📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Hierarchical projects indexed: ${stats.hierarchicalProjectsIndexed}`);
  console.log(`📦 Legacy projects migrated: ${stats.legacyProjectsMigrated}`);
  console.log(`⏭️  Legacy projects skipped: ${stats.legacyProjectsSkipped}`);
  console.log(`📁 Tasks directories migrated: ${stats.tasksDirectoriesMigrated}`);
  console.log(`🏷️  Markers created: ${stats.markersCreated}`);
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

  if (stats.errors.length === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review and fix issues.');
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

export { runMigration as normalizeProjectStorage };
export type { MigrationStats };
