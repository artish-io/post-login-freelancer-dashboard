#!/usr/bin/env node

/**
 * Script to run the milestone-based invoicing comprehensive prognosis
 * 
 * This script executes the comprehensive test suite and generates a detailed
 * prognosis report for the milestone-based invoicing workflow.
 * 
 * Usage:
 *   node scripts/run-milestone-prognosis.js
 *   npm run test:milestone-prognosis
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function runMilestonePrognosis() {
  console.log('🧪 Starting Milestone-Based Invoicing Comprehensive Prognosis...\n');
  
  try {
    // Run the Jest test
    const testCommand = 'npx';
    const testArgs = [
      'jest',
      'src/__tests__/milestone-invoicing-comprehensive-prognosis.test.ts',
      '--verbose',
      '--no-cache',
      '--detectOpenHandles'
    ];

    console.log(`Running: ${testCommand} ${testArgs.join(' ')}\n`);

    const testProcess = spawn(testCommand, testArgs, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    testProcess.on('close', async (code) => {
      console.log(`\n📊 Test process completed with code: ${code}\n`);
      
      // Check if report was generated
      const reportPath = path.join(process.cwd(), 'milestone-invoicing-prognosis-report.json');
      
      try {
        await fs.access(reportPath);
        console.log('✅ Prognosis report generated successfully!');
        console.log(`📄 Report location: ${reportPath}`);
        
        // Read and display summary
        const reportContent = await fs.readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportContent);
        
        console.log('\n📈 QUICK SUMMARY:');
        console.log(`   Tests Run: ${report.summary.totalTests}`);
        console.log(`   Passed: ${report.summary.passed}`);
        console.log(`   Failed: ${report.summary.failed}`);
        console.log(`   Errors: ${report.summary.errors}`);
        console.log(`   System Health: ${report.prognosis.overallHealth}`);
        console.log(`   Production Ready: ${report.prognosis.readinessForProduction}`);
        console.log(`   Critical Issues: ${report.criticalBreakages.length}`);
        
        if (report.prognosis.priorityFixes.length > 0) {
          console.log('\n🔧 TOP PRIORITY FIXES:');
          report.prognosis.priorityFixes.slice(0, 5).forEach((fix, i) => {
            console.log(`   ${i + 1}. ${fix}`);
          });
        }
        
      } catch (error) {
        console.log('⚠️  Report file not found - check test execution');
      }
      
      console.log('\n🎯 Milestone prognosis complete!');
      process.exit(code);
    });

    testProcess.on('error', (error) => {
      console.error('❌ Error running test:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start prognosis:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  runMilestonePrognosis();
}

module.exports = { runMilestonePrognosis };
