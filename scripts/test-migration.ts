#!/usr/bin/env tsx

/**
 * Migration Testing Script
 * 
 * Comprehensive testing of all migrated endpoints to ensure
 * they work correctly with hierarchical storage.
 */

import { MigrationTester, quickMigrationHealthCheck } from '../src/lib/migration/migration-tester';

async function runMigrationTests() {
  console.log('🚀 Starting Migration Testing Suite...\n');
  
  // Quick health check first
  console.log('1️⃣ Running quick health check...');
  const healthCheck = await quickMigrationHealthCheck();
  
  if (!healthCheck.healthy) {
    console.error('❌ Health check failed!');
    console.error('Issues:', healthCheck.issues);
    process.exit(1);
  }
  
  console.log('✅ Health check passed!');
  console.log('Performance:', healthCheck.performance);
  console.log('');
  
  // Run comprehensive test suite
  console.log('2️⃣ Running comprehensive test suite...');
  const tester = new MigrationTester();
  const testSuite = await tester.runFullTestSuite();
  
  // Generate and display report
  const report = tester.generateReport(testSuite);
  console.log(report);
  
  // Exit with appropriate code
  if (testSuite.summary.failed > 0) {
    console.error(`❌ ${testSuite.summary.failed} tests failed!`);
    process.exit(1);
  } else {
    console.log(`✅ All ${testSuite.summary.passed} tests passed!`);
    process.exit(0);
  }
}

// Run the tests
runMigrationTests().catch(error => {
  console.error('💥 Migration testing failed:', error);
  process.exit(1);
});
