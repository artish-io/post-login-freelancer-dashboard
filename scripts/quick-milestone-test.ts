#!/usr/bin/env tsx

/**
 * Quick Milestone Invoicing Test
 * 
 * Runs a simplified version of the milestone invoicing test
 * and provides a quick health check of the system.
 */

import { runComprehensiveMilestoneTest } from '../src/__tests__/milestone-invoicing-integration.test';

async function quickTest() {
  console.log('🔍 Running Quick Milestone Invoicing Health Check...\n');
  
  try {
    const report = await runComprehensiveMilestoneTest();
    
    // Generate quick summary
    console.log('\n📊 QUICK HEALTH CHECK SUMMARY:');
    console.log('='.repeat(50));
    
    const { summary, criticalBreakages } = report;
    const healthScore = Math.round((summary.passed / summary.totalTests) * 100);
    
    // Health status
    let status = '🚨 CRITICAL';
    let statusColor = '\x1b[31m'; // Red
    
    if (healthScore >= 80) {
      status = '✅ HEALTHY';
      statusColor = '\x1b[32m'; // Green
    } else if (healthScore >= 60) {
      status = '⚠️ WARNING';
      statusColor = '\x1b[33m'; // Yellow
    }
    
    console.log(`${statusColor}System Health: ${status} (${healthScore}%)\x1b[0m`);
    console.log(`Tests Passed: ${summary.passed}/${summary.totalTests}`);
    console.log(`Critical Issues: ${criticalBreakages.length}`);
    
    if (criticalBreakages.length > 0) {
      console.log('\n🚨 TOP CRITICAL ISSUES:');
      criticalBreakages.slice(0, 3).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      
      if (criticalBreakages.length > 3) {
        console.log(`... and ${criticalBreakages.length - 3} more issues`);
      }
    }
    
    console.log('\n💡 NEXT STEPS:');
    if (healthScore < 50) {
      console.log('- 🚨 URGENT: Fix payment system and API connectivity');
      console.log('- 📋 Run full test suite: npm run test:milestone-invoicing');
      console.log('- 📖 Review prognosis: docs/milestone-invoicing-prognosis.md');
    } else if (healthScore < 80) {
      console.log('- ⚠️ Address remaining issues before production deployment');
      console.log('- 🧪 Run comprehensive tests regularly');
      console.log('- 📊 Monitor system performance');
    } else {
      console.log('- ✅ System appears healthy for milestone invoicing');
      console.log('- 🔄 Continue regular monitoring');
      console.log('- 📈 Consider performance optimization');
    }
    
    console.log('\n='.repeat(50));
    
    return healthScore >= 80 ? 0 : 1;
    
  } catch (error) {
    console.error('🚨 Quick test failed:', error);
    return 1;
  }
}

// Run the quick test
quickTest().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('🚨 Unhandled error:', error);
  process.exit(1);
});
