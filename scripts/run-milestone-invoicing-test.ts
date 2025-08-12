#!/usr/bin/env tsx

/**
 * Milestone-Based Invoicing Test Runner & Prognosis Generator
 * 
 * This script runs the comprehensive milestone invoicing test suite and generates
 * a detailed prognosis report highlighting any breakages in the system.
 * 
 * Usage:
 *   npm run test:milestone-invoicing
 *   or
 *   npx tsx scripts/run-milestone-invoicing-test.ts
 */

import { runComprehensiveMilestoneTest, printTestReport } from '../src/__tests__/milestone-invoicing-integration.test';

async function main() {
  console.log('🚀 Starting Milestone-Based Invoicing Test Suite & Prognosis...\n');
  
  try {
    // Run the comprehensive test suite
    const report = await runComprehensiveMilestoneTest();
    
    // Print the detailed report with prognosis
    printTestReport(report);
    
    // Generate summary for CI/CD or automated systems
    const summary = {
      timestamp: new Date().toISOString(),
      overallHealth: report.prognosis.overallHealth,
      productionReady: report.prognosis.readinessForProduction,
      testResults: {
        total: report.summary.totalTests,
        passed: report.summary.passed,
        failed: report.summary.failed,
        errors: report.summary.errors,
        skipped: report.summary.skipped,
        successRate: Math.round((report.summary.passed / report.summary.totalTests) * 100)
      },
      performance: {
        totalDuration: report.summary.totalDuration,
        averageApiResponseTime: report.performanceMetrics.averageApiResponseTime,
        dataConsistencyScore: report.performanceMetrics.dataConsistencyScore
      },
      criticalIssues: report.criticalBreakages.length,
      priorityFixes: report.prognosis.priorityFixes.length
    };
    
    // Write summary to file for CI/CD integration
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const summaryPath = path.join(process.cwd(), 'test-results', 'milestone-invoicing-summary.json');
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📄 Test summary written to: ${summaryPath}`);
    
    // Exit with appropriate code
    if (report.prognosis.overallHealth === 'CRITICAL' || report.summary.errors > 0) {
      console.log('\n❌ Test suite completed with critical issues');
      process.exit(1);
    } else if (report.summary.failed > 0) {
      console.log('\n⚠️ Test suite completed with some failures');
      process.exit(1);
    } else {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runMilestoneInvoicingTest };
