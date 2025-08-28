#!/usr/bin/env node

/**
 * Script to backfill commissioner cumulative totals
 * 
 * This script can be run directly to fix missing commissioner totals
 * without needing to go through the API.
 */

const path = require('path');

// Set up the environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  try {
    console.log('🔄 Starting commissioner totals backfill...');
    
    // Import the service (using dynamic import for ES modules)
    const { backfillAllCommissionerTotals } = await import('../src/lib/commissioner-totals-service.ts');
    
    // Run the backfill
    const result = await backfillAllCommissionerTotals();
    
    console.log('\n📊 Backfill Results:');
    console.log(`✅ Updated: ${result.updated} commissioners`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.length}`);
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    console.log('\n🎉 Commissioner totals backfill completed!');
    
    // Exit with appropriate code
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
