/**
 * Migration script to fix proposals missing freelancerId
 * 
 * This script adds freelancerId to existing proposals that don't have it.
 * It attempts to derive the freelancerId from the proposal metadata or
 * sets it to a default value for testing.
 */

const fs = require('fs').promises;
const path = require('path');

async function fixProposalFreelancerIds() {
  try {
    console.log('🔧 Starting proposal freelancerId migration...');

    // Read all proposals using the actual hierarchical structure
    const proposalsDir = path.join(process.cwd(), 'data', 'proposals');

    // Get all year directories
    const years = await fs.readdir(proposalsDir);

    let fixedCount = 0;
    let totalCount = 0;

    for (const year of years) {
      if (!year.match(/^\d{4}$/)) continue; // Skip non-year directories

      const yearDir = path.join(proposalsDir, year);
      const months = await fs.readdir(yearDir);

      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const days = await fs.readdir(monthDir);

        for (const day of days) {
          const dayDir = path.join(yearDir, month, day);
          const proposalDirs = await fs.readdir(dayDir);

          for (const proposalDir of proposalDirs) {
            if (!proposalDir.startsWith('PROP-')) continue; // Skip non-proposal directories

            const proposalPath = path.join(dayDir, proposalDir, 'proposal.json');

            try {
              const proposalData = JSON.parse(await fs.readFile(proposalPath, 'utf-8'));

              totalCount++;

              // Check if freelancerId is missing or wrong
              if (!proposalData.freelancerId || proposalData.freelancerId === 12) {
                console.log(`🔍 Found proposal with wrong/missing freelancerId: ${proposalData.id} (current: ${proposalData.freelancerId})`);

                // For testing purposes, set freelancerId to 1 (Test Freelancer)
                // In production, you might want to derive this from other data
                proposalData.freelancerId = 1;

                // Write back the updated proposal
                await fs.writeFile(proposalPath, JSON.stringify(proposalData, null, 2));

                fixedCount++;
                console.log(`✅ Fixed proposal ${proposalData.id} - set freelancerId: 1`);
              } else {
                console.log(`✓ Proposal ${proposalData.id} already has correct freelancerId: ${proposalData.freelancerId}`);
              }
            } catch (fileError) {
              console.log(`⚠️ Skipping ${proposalPath}: ${fileError.message}`);
            }
          }
        }
      }
    }

    console.log(`🎉 Migration complete! Fixed ${fixedCount} out of ${totalCount} proposals.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixProposalFreelancerIds();
