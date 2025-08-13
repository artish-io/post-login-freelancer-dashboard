#!/usr/bin/env tsx

/**
 * Freelancer Migration Script
 *
 * Migrates freelancers from flat data/freelancers.json to hierarchical storage.
 * Ensures creation dates match their corresponding user entries for data consistency.
 * Maintains the duplication pattern for scalability.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { dataPath } from '../src/lib/storage/root';
import { writeFreelancer, FreelancerProfile } from '../src/lib/storage/normalize-freelancer';
import { readJson } from '../src/lib/fs-json';
import { getUserById } from '../src/lib/storage/unified-storage-service';

interface MigrationStats {
  totalFreelancers: number;
  migrated: number;
  skipped: number;
  errors: number;
}

/**
 * Get creation date for a freelancer by matching with their user profile
 */
async function getFreelancerCreatedAt(freelancer: any): Promise<string> {
  try {
    // 1. Check if freelancer already has a createdAt
    if (freelancer.createdAt) {
      const date = new Date(freelancer.createdAt);
      if (!isNaN(date.getTime())) {
        return freelancer.createdAt;
      }
    }
    
    // 2. Get creation date from corresponding user profile
    if (freelancer.userId) {
      try {
        const user = await getUserById(freelancer.userId);
        if (user && user.createdAt) {
          console.log(`  📅 Using user createdAt for freelancer ${freelancer.id}: ${user.createdAt}`);
          return user.createdAt;
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not find user ${freelancer.userId} for freelancer ${freelancer.id}`);
      }
    }
    
    // 3. Fallback to current time
    console.log(`  ⚠️  No user createdAt found for freelancer ${freelancer.id}, using current time`);
    return new Date().toISOString();
    
  } catch (error) {
    console.warn(`  ⚠️  Error determining createdAt for freelancer ${freelancer.id}:`, error);
    return new Date().toISOString();
  }
}

/**
 * Migrate a single freelancer
 */
async function migrateFreelancer(
  freelancer: any,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    if (!freelancer.id) {
      return { success: false, error: 'Missing freelancer ID' };
    }
    
    if (!freelancer.userId) {
      return { success: false, error: 'Missing userId reference' };
    }
    
    // Get creation date (matching user profile)
    const createdAt = await getFreelancerCreatedAt(freelancer);
    
    // Build enriched profile
    const profile: FreelancerProfile = {
      ...freelancer,
      createdAt,
      updatedAt: new Date().toISOString()
    };
    
    if (!dryRun) {
      await writeFreelancer(profile);
    }
    
    console.log(`✅ Freelancer ${freelancer.id} (userId: ${freelancer.userId}) - createdAt: ${createdAt}`);
    return { success: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to migrate freelancer ${freelancer.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Main migration function
 */
export async function migrateFreelancers(dryRun: boolean = false): Promise<MigrationStats> {
  console.log(`🚀 Starting freelancer migration${dryRun ? ' (DRY RUN)' : ''}...`);
  
  const stats: MigrationStats = {
    totalFreelancers: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Load legacy freelancers.json
  const freelancersPath = dataPath('freelancers.json');
  const freelancers = await readJson<any[]>(freelancersPath, []);
  
  if (freelancers.length === 0) {
    console.log('📭 No freelancers found in data/freelancers.json - migration complete');
    return stats;
  }
  
  stats.totalFreelancers = freelancers.length;
  console.log(`📊 Found ${freelancers.length} freelancers to migrate`);
  
  // Migrate each freelancer
  for (const freelancer of freelancers) {
    if (!freelancer.id) {
      console.warn(`⚠️  Skipping freelancer without ID:`, freelancer);
      stats.skipped++;
      continue;
    }
    
    const result = await migrateFreelancer(freelancer, dryRun);
    
    if (result.success) {
      stats.migrated++;
    } else {
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('\n📈 Migration Summary:');
  console.log(`   Total freelancers: ${stats.totalFreelancers}`);
  console.log(`   Migrated: ${stats.migrated}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);
  
  if (!dryRun && stats.migrated > 0) {
    console.log('\n💡 Migration complete! Legacy data/freelancers.json preserved for rollback.');
    console.log('   Use the new getAllFreelancers() function to access hierarchical storage.');
    console.log('\n🔗 Duplication Pattern Maintained:');
    console.log('   - Freelancer profiles stored separately for scalability');
    console.log('   - Reference users via userId for data consistency');
    console.log('   - Creation dates match corresponding user profiles');
  }
  
  return stats;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  migrateFreelancers(dryRun)
    .then((stats) => {
      const exitCode = stats.errors > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
