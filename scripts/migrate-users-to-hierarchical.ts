#!/usr/bin/env ts-node

/**
 * User Migration Script
 *
 * Migrates users from flat data/users.json to hierarchical storage with enriched timestamps.
 * Enriches each user with createdAt based on earliest reliable timestamp.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { dataPath } from '../src/lib/storage/root';
import { writeUser, UserProfile } from '../src/lib/storage/normalize-user';
import { readJson } from '../src/lib/fs-json';

interface MigrationStats {
  totalUsers: number;
  migrated: number;
  skipped: number;
  errors: number;
}

interface ProjectIndexEntry {
  [projectId: string]: string; // ISO timestamp
}

/**
 * Get filesystem metadata for data/users.json
 */
async function getUsersFileMetadata(): Promise<{ birthtime: Date; mtime: Date } | null> {
  try {
    const usersPath = dataPath('users.json');
    const stats = await fs.stat(usersPath);
    return {
      birthtime: stats.birthtime,
      mtime: stats.mtime
    };
  } catch (error) {
    return null;
  }
}

/**
 * Load projects index to find earliest project involvement
 */
async function loadProjectsIndex(): Promise<ProjectIndexEntry> {
  try {
    const indexPath = dataPath('projects', 'metadata', 'projects-index.json');
    return await readJson<ProjectIndexEntry>(indexPath, {});
  } catch (error) {
    console.warn('Could not load projects index:', error);
    return {};
  }
}

/**
 * Find earliest project involvement for a user
 */
async function findEarliestProjectInvolvement(
  userId: number,
  projectsIndex: ProjectIndexEntry
): Promise<string | null> {
  const projectsDir = dataPath('projects');
  let earliestTimestamp: string | null = null;
  
  try {
    // Scan through project index entries
    for (const [projectId, createdAt] of Object.entries(projectsIndex)) {
      try {
        // Derive project path from timestamp
        const date = new Date(createdAt);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        
        const projectPath = path.join(
          projectsDir,
          year.toString(),
          month,
          day,
          projectId,
          'project.json'
        );
        
        const project = await readJson<any>(projectPath, null);
        if (!project) continue;
        
        // Check if user is involved (as freelancer or commissioner)
        const isInvolved = 
          project.freelancerId === userId ||
          project.commissionerId === userId ||
          (Array.isArray(project.freelancerIds) && project.freelancerIds.includes(userId));
        
        if (isInvolved) {
          if (!earliestTimestamp || createdAt < earliestTimestamp) {
            earliestTimestamp = createdAt;
          }
        }
      } catch (error) {
        // Skip projects that can't be read
        continue;
      }
    }
  } catch (error) {
    console.warn(`Error scanning projects for user ${userId}:`, error);
  }
  
  return earliestTimestamp;
}

/**
 * Determine createdAt timestamp for a user using enrichment rules
 */
async function determineCreatedAt(
  user: any,
  projectsIndex: ProjectIndexEntry,
  filesystemMetadata: { birthtime: Date; mtime: Date } | null
): Promise<string> {
  // 1. Existing createdAt on the user (if present & valid ISO)
  if (user.createdAt) {
    try {
      const date = new Date(user.createdAt);
      if (!isNaN(date.getTime())) {
        return user.createdAt;
      }
    } catch (error) {
      // Invalid timestamp, continue to next rule
    }
  }
  
  // 2. Earliest project creation date involving this user
  const earliestProject = await findEarliestProjectInvolvement(user.id, projectsIndex);
  if (earliestProject) {
    return earliestProject;
  }
  
  // 3. Filesystem metadata of data/users.json
  if (filesystemMetadata) {
    // Use birthtime if available, otherwise mtime
    const timestamp = filesystemMetadata.birthtime.getTime() > 0 
      ? filesystemMetadata.birthtime 
      : filesystemMetadata.mtime;
    return timestamp.toISOString();
  }
  
  // 4. Fallback: current time
  return new Date().toISOString();
}

/**
 * Migrate a single user
 */
async function migrateUser(
  user: any,
  projectsIndex: ProjectIndexEntry,
  filesystemMetadata: { birthtime: Date; mtime: Date } | null,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Determine createdAt timestamp
    const createdAt = await determineCreatedAt(user, projectsIndex, filesystemMetadata);
    
    // Build enriched profile
    const profile: UserProfile = {
      ...user,
      createdAt,
      updatedAt: new Date().toISOString()
    };
    
    if (!dryRun) {
      await writeUser(profile);
    }
    
    console.log(`✅ User ${user.id} (${user.name || 'Unknown'}) - createdAt: ${createdAt}`);
    return { success: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to migrate user ${user.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Main migration function
 */
export async function migrateUsers(dryRun: boolean = false): Promise<MigrationStats> {
  console.log(`🚀 Starting user migration${dryRun ? ' (DRY RUN)' : ''}...`);
  
  const stats: MigrationStats = {
    totalUsers: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Load legacy users.json
  const usersPath = dataPath('users.json');
  const users = await readJson<any[]>(usersPath, []);
  
  if (users.length === 0) {
    console.log('📭 No users found in data/users.json - migration complete');
    return stats;
  }
  
  stats.totalUsers = users.length;
  console.log(`📊 Found ${users.length} users to migrate`);
  
  // Load supporting data
  const projectsIndex = await loadProjectsIndex();
  const filesystemMetadata = await getUsersFileMetadata();
  
  console.log(`📁 Loaded ${Object.keys(projectsIndex).length} projects for timestamp enrichment`);
  
  // Migrate each user
  for (const user of users) {
    if (!user.id) {
      console.warn(`⚠️  Skipping user without ID:`, user);
      stats.skipped++;
      continue;
    }
    
    const result = await migrateUser(user, projectsIndex, filesystemMetadata, dryRun);
    
    if (result.success) {
      stats.migrated++;
    } else {
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('\n📈 Migration Summary:');
  console.log(`   Total users: ${stats.totalUsers}`);
  console.log(`   Migrated: ${stats.migrated}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);
  
  if (!dryRun && stats.migrated > 0) {
    console.log('\n💡 Migration complete! Legacy data/users.json preserved for rollback.');
    console.log('   Use the new readUser() function to access hierarchical storage.');
  }
  
  return stats;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  migrateUsers(dryRun)
    .then((stats) => {
      const exitCode = stats.errors > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
