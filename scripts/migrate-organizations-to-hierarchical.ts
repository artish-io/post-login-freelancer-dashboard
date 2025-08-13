#!/usr/bin/env tsx

/**
 * Organization Migration Script
 *
 * Migrates organizations from flat data/organizations.json to hierarchical storage.
 * 
 * Key requirements:
 * - Multiple commissioners can be associated with the same organization
 * - Indexing is synced with the account creation date of the first commissioner 
 *   from that organization who signed up on Artish
 * - Maintains referential integrity between organizations and commissioners
 */

import { promises as fs } from 'fs';
import path from 'path';
import { dataPath } from '../src/lib/storage/root';
import { writeOrganization, OrganizationProfile } from '../src/lib/storage/normalize-organization';
import { readJson } from '../src/lib/fs-json';
import { getAllUsers } from '../src/lib/storage/unified-storage-service';

interface MigrationStats {
  totalOrganizations: number;
  migrated: number;
  skipped: number;
  errors: number;
}

/**
 * Find the first commissioner from an organization and get their creation date
 */
async function getFirstCommissionerInfo(organization: any): Promise<{
  firstCommissionerId: number;
  firstCommissionerCreatedAt: string;
  associatedCommissioners: number[];
}> {
  try {
    const users = await getAllUsers();
    
    // Find all commissioners associated with this organization
    const associatedCommissioners = users
      .filter(user => 
        user.type === 'commissioner' && 
        user.organizationId === organization.id
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    if (associatedCommissioners.length === 0) {
      // Fallback: use contactPersonId if no commissioners found by organizationId
      if (organization.contactPersonId) {
        const contactPerson = users.find(u => u.id === organization.contactPersonId);
        if (contactPerson && contactPerson.type === 'commissioner') {
          console.log(`  📋 Using contactPersonId ${organization.contactPersonId} as first commissioner for org ${organization.id}`);
          return {
            firstCommissionerId: organization.contactPersonId,
            firstCommissionerCreatedAt: contactPerson.createdAt,
            associatedCommissioners: [organization.contactPersonId]
          };
        }
      }
      
      // Final fallback: create a placeholder
      console.warn(`  ⚠️  No commissioners found for organization ${organization.id}, using current time`);
      return {
        firstCommissionerId: organization.contactPersonId || 0,
        firstCommissionerCreatedAt: new Date().toISOString(),
        associatedCommissioners: organization.contactPersonId ? [organization.contactPersonId] : []
      };
    }
    
    // Use the earliest commissioner
    const firstCommissioner = associatedCommissioners[0];
    const allCommissionerIds = associatedCommissioners.map(c => c.id);
    
    console.log(`  👥 Found ${associatedCommissioners.length} commissioners for org ${organization.id}`);
    console.log(`  📅 First commissioner: ${firstCommissioner.id} (${firstCommissioner.createdAt})`);
    
    return {
      firstCommissionerId: firstCommissioner.id,
      firstCommissionerCreatedAt: firstCommissioner.createdAt,
      associatedCommissioners: allCommissionerIds
    };
    
  } catch (error) {
    console.warn(`  ⚠️  Error determining first commissioner for organization ${organization.id}:`, error);
    return {
      firstCommissionerId: organization.contactPersonId || 0,
      firstCommissionerCreatedAt: new Date().toISOString(),
      associatedCommissioners: organization.contactPersonId ? [organization.contactPersonId] : []
    };
  }
}

/**
 * Migrate a single organization
 */
async function migrateOrganization(
  organization: any,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    if (!organization.id) {
      return { success: false, error: 'Missing organization ID' };
    }
    
    // Get first commissioner info
    const commissionerInfo = await getFirstCommissionerInfo(organization);
    
    // Build enriched profile
    const profile: OrganizationProfile = {
      ...organization,
      firstCommissionerId: commissionerInfo.firstCommissionerId,
      associatedCommissioners: commissionerInfo.associatedCommissioners,
      createdAt: commissionerInfo.firstCommissionerCreatedAt,
      updatedAt: new Date().toISOString()
    };
    
    if (!dryRun) {
      await writeOrganization(profile);
    }
    
    console.log(`✅ Organization ${organization.id} (${organization.name})`);
    console.log(`   First commissioner: ${commissionerInfo.firstCommissionerId}`);
    console.log(`   Associated commissioners: [${commissionerInfo.associatedCommissioners.join(', ')}]`);
    console.log(`   CreatedAt: ${commissionerInfo.firstCommissionerCreatedAt}`);
    
    return { success: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to migrate organization ${organization.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Main migration function
 */
export async function migrateOrganizations(dryRun: boolean = false): Promise<MigrationStats> {
  console.log(`🚀 Starting organization migration${dryRun ? ' (DRY RUN)' : ''}...`);
  
  const stats: MigrationStats = {
    totalOrganizations: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Load legacy organizations.json
  const organizationsPath = dataPath('organizations.json');
  const organizations = await readJson<any[]>(organizationsPath, []);
  
  if (organizations.length === 0) {
    console.log('📭 No organizations found in data/organizations.json - migration complete');
    return stats;
  }
  
  stats.totalOrganizations = organizations.length;
  console.log(`📊 Found ${organizations.length} organizations to migrate`);
  
  // Migrate each organization
  for (const organization of organizations) {
    if (!organization.id) {
      console.warn(`⚠️  Skipping organization without ID:`, organization);
      stats.skipped++;
      continue;
    }
    
    const result = await migrateOrganization(organization, dryRun);
    
    if (result.success) {
      stats.migrated++;
    } else {
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('\n📈 Migration Summary:');
  console.log(`   Total organizations: ${stats.totalOrganizations}`);
  console.log(`   Migrated: ${stats.migrated}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);
  
  if (!dryRun && stats.migrated > 0) {
    console.log('\n💡 Migration complete! Legacy data/organizations.json preserved for rollback.');
    console.log('   Use the new getAllOrganizations() function to access hierarchical storage.');
    console.log('\n🔗 Multi-Commissioner Support:');
    console.log('   - Organizations indexed by first commissioner\'s creation date');
    console.log('   - Multiple commissioners can be associated with same organization');
    console.log('   - Referential integrity maintained between organizations and commissioners');
  }
  
  return stats;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  migrateOrganizations(dryRun)
    .then((stats) => {
      const exitCode = stats.errors > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
