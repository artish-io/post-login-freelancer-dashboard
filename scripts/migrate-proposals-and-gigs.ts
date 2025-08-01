#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';
import { migrateLegacyProposals, generateProposalId, type Proposal } from '../src/lib/proposals/hierarchical-storage';
import { migrateLegacyGigs, type Gig } from '../src/lib/gigs/hierarchical-storage';

/**
 * Migration script to convert flat JSON files to hierarchical storage
 */
async function migrateProposalsAndGigs() {
  console.log('🚀 Starting migration of proposals and gigs to hierarchical storage...\n');

  try {
    // Migrate proposals
    console.log('📄 Migrating proposals...');
    await migrateProposalsData();
    
    // Migrate gigs
    console.log('\n🎯 Migrating gigs...');
    await migrateGigsData();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify the migrated data in the new hierarchical structure');
    console.log('2. Update API endpoints to use the new storage utilities');
    console.log('3. Test all functionality to ensure everything works correctly');
    console.log('4. Backup and remove the old flat JSON files once everything is verified');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Migrate proposals from flat JSON to hierarchical storage
 */
async function migrateProposalsData() {
  const proposalsPath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');
  
  try {
    // Check if the old file exists
    if (!await fs.access(proposalsPath).then(() => true).catch(() => false)) {
      console.log('⚠️  No proposals.json file found, skipping proposals migration');
      return;
    }
    
    // Read the existing proposals
    const proposalsData = await fs.readFile(proposalsPath, 'utf-8');
    const proposals: Proposal[] = JSON.parse(proposalsData);
    
    console.log(`Found ${proposals.length} proposals to migrate`);
    
    // Validate and normalize proposal data
    const validProposals = proposals.map(proposal => {
      // Generate new simplified ID if the current one is timestamp-based
      let proposalId = proposal.id;
      if (!proposalId || proposalId.startsWith('proposal-')) {
        proposalId = generateProposalId();
        console.log(`🔄 Generated new ID for proposal: ${proposal.id} -> ${proposalId}`);
      }

      if (!proposal.createdAt) {
        console.warn(`⚠️  Proposal ${proposalId} missing createdAt, using current timestamp`);
        proposal.createdAt = new Date().toISOString();
      }

      return {
        ...proposal,
        id: proposalId
      };
    }).filter(proposal => {
      if (!proposal.id || !proposal.createdAt) {
        console.warn(`⚠️  Skipping invalid proposal: missing id or createdAt`, proposal);
        return false;
      }
      return true;
    });
    
    if (validProposals.length !== proposals.length) {
      console.log(`⚠️  ${proposals.length - validProposals.length} invalid proposals skipped`);
    }
    
    // Migrate to hierarchical storage
    await migrateLegacyProposals(validProposals);
    
    // Create backup of original file
    const backupPath = proposalsPath + '.backup.' + Date.now();
    await fs.copyFile(proposalsPath, backupPath);
    console.log(`📦 Created backup: ${backupPath}`);
    
    console.log(`✅ Successfully migrated ${validProposals.length} proposals`);
    
  } catch (error) {
    console.error('❌ Failed to migrate proposals:', error);
    throw error;
  }
}

/**
 * Migrate gigs from flat JSON to hierarchical storage
 */
async function migrateGigsData() {
  const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
  
  try {
    // Check if the old file exists
    if (!await fs.access(gigsPath).then(() => true).catch(() => false)) {
      console.log('⚠️  No gigs.json file found, skipping gigs migration');
      return;
    }
    
    // Read the existing gigs
    const gigsData = await fs.readFile(gigsPath, 'utf-8');
    const gigs: Gig[] = JSON.parse(gigsData);
    
    console.log(`Found ${gigs.length} gigs to migrate`);
    
    // Validate gig data
    const validGigs = gigs.filter(gig => {
      if (!gig.id || !gig.postedDate) {
        console.warn(`⚠️  Skipping invalid gig: missing id or postedDate`, gig);
        return false;
      }
      return true;
    });
    
    if (validGigs.length !== gigs.length) {
      console.log(`⚠️  ${gigs.length - validGigs.length} invalid gigs skipped`);
    }
    
    // Migrate to hierarchical storage
    await migrateLegacyGigs(validGigs);
    
    // Create backup of original file
    const backupPath = gigsPath + '.backup.' + Date.now();
    await fs.copyFile(gigsPath, backupPath);
    console.log(`📦 Created backup: ${backupPath}`);
    
    console.log(`✅ Successfully migrated ${validGigs.length} gigs`);
    
  } catch (error) {
    console.error('❌ Failed to migrate gigs:', error);
    throw error;
  }
}

/**
 * Verify migration by comparing counts
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Import the hierarchical storage functions
    const { readAllProposals } = await import('../src/lib/proposals/hierarchical-storage');
    const { readAllGigs } = await import('../src/lib/gigs/hierarchical-storage');
    
    // Check proposals
    const migratedProposals = await readAllProposals();
    console.log(`📄 Migrated proposals count: ${migratedProposals.length}`);
    
    // Check gigs
    const migratedGigs = await readAllGigs();
    console.log(`🎯 Migrated gigs count: ${migratedGigs.length}`);
    
    console.log('✅ Migration verification completed');
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateProposalsAndGigs()
    .then(() => verifyMigration())
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateProposalsAndGigs, migrateProposalsData, migrateGigsData };
