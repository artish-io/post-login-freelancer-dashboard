#!/usr/bin/env node

/**
 * Milestone Invoicing Prognosis Summary Script
 * 
 * Provides a quick summary of the milestone-based invoicing workflow health
 * and identified issues without running the full test suite.
 */

const fs = require('fs').promises;
const path = require('path');

async function showPrognosisSummary() {
  console.log('🔍 Milestone-Based Invoicing Workflow Prognosis Summary\n');
  
  try {
    // Check if prognosis report exists
    const reportPath = path.join(process.cwd(), 'milestone-invoicing-prognosis-report.json');
    
    try {
      await fs.access(reportPath);
      
      // Read and display existing report
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportContent);
      
      console.log('📊 LATEST TEST RESULTS:');
      console.log(`   System Health: ${getHealthIcon(report.prognosis.overallHealth)} ${report.prognosis.overallHealth}`);
      console.log(`   Production Ready: ${report.prognosis.readinessForProduction ? '✅' : '❌'} ${report.prognosis.readinessForProduction ? 'YES' : 'NO'}`);
      console.log(`   Tests Run: ${report.summary.totalTests}`);
      console.log(`   Passed: ${report.summary.passed}`);
      console.log(`   Failed: ${report.summary.failed}`);
      console.log(`   Errors: ${report.summary.errors}`);
      console.log(`   Critical Issues: ${report.criticalBreakages.length}`);
      
      if (report.results.length > 0) {
        console.log('\n🔴 IDENTIFIED BREAKAGES:');
        const allBreakages = report.results.flatMap(r => r.breakages);
        allBreakages.slice(0, 5).forEach((breakage, i) => {
          console.log(`   ${i + 1}. ${breakage}`);
        });
        
        if (allBreakages.length > 5) {
          console.log(`   ... and ${allBreakages.length - 5} more issues`);
        }
      }
      
      if (report.prognosis.priorityFixes.length > 0) {
        console.log('\n🔧 PRIORITY FIXES:');
        report.prognosis.priorityFixes.slice(0, 3).forEach((fix, i) => {
          console.log(`   ${i + 1}. ${fix}`);
        });
      }
      
      console.log(`\n📄 Full report: ${reportPath}`);
      console.log('📋 Detailed analysis: MILESTONE_INVOICING_PROGNOSIS.md');
      
    } catch (error) {
      console.log('⚠️  No recent test results found. Run the prognosis test first:');
      console.log('   npm run test:milestone-prognosis');
    }
    
    // Show known issues from code analysis
    console.log('\n🔍 KNOWN ISSUES FROM CODE ANALYSIS:');
    
    const knownIssues = [
      {
        component: 'Gig Creation API',
        issue: 'Requires authentication but test framework lacks session simulation',
        severity: 'HIGH',
        impact: 'Blocks all API testing'
      },
      {
        component: 'Hierarchical Storage',
        issue: 'File validation logic may be incorrect',
        severity: 'HIGH', 
        impact: 'Data persistence verification fails'
      },
      {
        component: 'API Response Format',
        issue: 'Inconsistent response structures across endpoints',
        severity: 'MEDIUM',
        impact: 'Integration testing difficulties'
      },
      {
        component: 'Error Handling',
        issue: 'Missing comprehensive error validation in tests',
        severity: 'MEDIUM',
        impact: 'Silent failures mask root causes'
      },
      {
        component: 'Milestone Validation',
        issue: 'No specific validation for milestone data structures',
        severity: 'MEDIUM',
        impact: 'Milestone-specific logic may fail silently'
      }
    ];
    
    knownIssues.forEach((issue, i) => {
      const severityIcon = issue.severity === 'HIGH' ? '🚨' : issue.severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
      console.log(`   ${i + 1}. ${severityIcon} ${issue.component}: ${issue.issue}`);
      console.log(`      Impact: ${issue.impact}`);
    });
    
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    console.log('   1. 🔧 Fix authentication in test framework');
    console.log('   2. 🔍 Investigate API response structure issues');
    console.log('   3. ✅ Validate hierarchical storage functionality');
    console.log('   4. 🧪 Complete full test suite execution');
    console.log('   5. 📊 Monitor system health after fixes');
    
    console.log('\n📚 AVAILABLE COMMANDS:');
    console.log('   npm run test:milestone-prognosis  - Run comprehensive test suite');
    console.log('   node scripts/milestone-prognosis-summary.js  - Show this summary');
    console.log('   cat MILESTONE_INVOICING_PROGNOSIS.md  - View detailed analysis');
    
  } catch (error) {
    console.error('❌ Error generating prognosis summary:', error.message);
    process.exit(1);
  }
}

function getHealthIcon(health) {
  switch (health) {
    case 'HEALTHY': return '✅';
    case 'DEGRADED': return '⚠️';
    case 'CRITICAL': return '🚨';
    default: return '❓';
  }
}

// Handle script execution
if (require.main === module) {
  showPrognosisSummary();
}

module.exports = { showPrognosisSummary };
