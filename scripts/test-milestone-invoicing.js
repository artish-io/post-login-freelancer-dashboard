#!/usr/bin/env node

/**
 * Milestone-Based Invoicing System Test Runner
 * 
 * This script runs the comprehensive milestone-based invoicing test
 * and generates a detailed prognosis report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Milestone-Based Invoicing System Test Runner');
console.log('='.repeat(60));

try {
  console.log('📋 Running comprehensive milestone invoicing test...');
  
  // Run the test
  const result = execSync(
    'npm test -- --testPathPattern=milestone-invoicing-comprehensive-prognosis.test.ts --verbose',
    { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  );

  console.log('\n✅ Test execution completed');
  
  // Check if report was generated
  const reportPath = path.join(process.cwd(), 'enhanced-milestone-invoicing-prognosis-report.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log('\n📊 QUICK SUMMARY:');
    console.log(`   Production Readiness Score: ${report.prognosis.productionReadinessScore}/100`);
    console.log(`   System Health: ${report.prognosis.overallHealth}`);
    console.log(`   Production Ready: ${report.prognosis.readinessForProduction ? 'YES' : 'NO'}`);
    console.log(`   Critical Issues: ${report.criticalBreakages.length}`);
    
    if (report.prognosis.productionReadinessScore < 80) {
      console.log('\n⚠️  WARNING: System not ready for production deployment');
      console.log('📄 See MILESTONE_INVOICING_COMPREHENSIVE_PROGNOSIS.md for detailed analysis');
    }
    
    console.log(`\n📄 Detailed report: ${reportPath}`);
  }

} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}

console.log('\n🎯 Test runner completed');
