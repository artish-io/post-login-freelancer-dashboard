#!/usr/bin/env tsx

/**
 * Milestone-Based Invoicing Test Runner
 * 
 * This script runs the comprehensive milestone-based invoicing test suite
 * and generates a detailed prognosis of any breakages found.
 * 
 * Usage:
 *   npm run test:milestone-invoicing
 *   or
 *   npx tsx scripts/test-milestone-invoicing.ts
 */

import { runComprehensiveMilestoneTest, printTestReport } from '../src/__tests__/milestone-invoicing-integration.test';

async function main() {
  console.log('🚀 Starting Comprehensive Milestone-Based Invoicing Test Suite...\n');
  
  try {
    // Run the comprehensive test suite
    const report = await runComprehensiveMilestoneTest();
    
    // Print the detailed report
    printTestReport(report);
    
    // Exit with appropriate code
    const hasFailures = report.summary.failed > 0 || report.summary.errors > 0;
    
    if (hasFailures) {
      console.log('❌ Test suite completed with failures. See report above for details.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed! Milestone-based invoicing workflow is functioning correctly.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('🚨 Fatal error running test suite:', error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('🚨 Unhandled error:', error);
  process.exit(1);
});
