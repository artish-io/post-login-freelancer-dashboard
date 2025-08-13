const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// Test Configuration
const TEST_CONFIG = {
  freelancerId: 31,
  commissionerId: 32,
  organizationId: 1,
  testGigId: Date.now(),
  testProjectId: Date.now() + 1000,
  totalBudget: 15000,
  milestoneCount: 3,
  expectedMilestoneAmount: 5000,
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testTimeout: 45000,
  retryAttempts: 3,
  dataPath: path.join(process.cwd(), 'data'),
  performanceThresholds: {
    gigCreation: 2000,
    projectActivation: 3000,
    taskCreation: 1500,
    invoiceGeneration: 2500,
    paymentExecution: 4000
  }
};

// Utility Functions
function makeHttpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function createMilestoneGigData() {
  return {
    title: 'Test Milestone-Based Project for Comprehensive Validation',
    commissionerId: TEST_CONFIG.commissionerId,
    organizationId: TEST_CONFIG.organizationId,
    category: 'development',
    subcategory: 'Web Development',
    skills: ['React', 'TypeScript', 'Node.js'],
    tools: ['React', 'Jest', 'TypeScript'],
    description: 'Comprehensive test project for milestone-based invoicing workflow validation',
    executionMethod: 'milestone',
    invoicingMethod: 'milestone',
    budget: TEST_CONFIG.totalBudget,
    lowerBudget: TEST_CONFIG.totalBudget,
    upperBudget: TEST_CONFIG.totalBudget,
    deliveryTimeWeeks: 12,
    estimatedHours: 300,
    startType: 'Immediately',
    isPublic: true,
    isTargetedRequest: false,
    milestones: [
      {
        id: 'M1',
        title: 'Project Setup and Architecture',
        description: 'Initial project setup, architecture design, and development environment',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 5000,
        status: 'pending'
      },
      {
        id: 'M2',
        title: 'Core Development and Features',
        description: 'Implementation of core features and functionality',
        startDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 5000,
        status: 'pending'
      },
      {
        id: 'M3',
        title: 'Testing and Deployment',
        description: 'Comprehensive testing, optimization, and deployment',
        startDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 5000,
        status: 'pending'
      }
    ],
    createdAt: new Date().toISOString()
  };
}

// Test Functions
async function testGigCreation() {
  const testName = 'Milestone-Based Gig Creation';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('🎯 Phase 1: Creating milestone-based gig...');
    
    const gigData = createMilestoneGigData();
    const postData = JSON.stringify(gigData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/gigs/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Test-Bypass-Auth': 'true'
      }
    };

    const response = await makeHttpRequest(options, postData);
    const duration = Date.now() - startTime;

    if (response.status !== 200 && response.status !== 201) {
      breakages.push(`Gig creation API failed with status ${response.status}`);
      breakages.push(`Response: ${JSON.stringify(response.data)}`);
      recommendations.push('Check if development server is running');
      recommendations.push('Verify API endpoint implementation');
      recommendations.push('Check authentication bypass for testing');

      return {
        testName,
        status: 'FAIL',
        duration,
        details: { response: response.data, status: response.status },
        breakages,
        recommendations
      };
    }

    // Validate response structure
    if (!response.data || !response.data.success) {
      breakages.push('Invalid response structure from gig creation API');
      breakages.push(`Expected success field, got: ${JSON.stringify(response.data)}`);
      recommendations.push('Fix API response format to include success field');
    }

    console.log(`✅ Gig created successfully with ID: ${response.data.gigId || 'unknown'}`);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: { gigId: response.data.gigId, response: response.data },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Gig creation failed with error: ${error.message}`);
    recommendations.push('Check if development server is running on port 3000');
    recommendations.push('Verify network connectivity');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

async function testFreelancerMatching(gigId) {
  const testName = 'Freelancer Matching and Project Activation';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('🤝 Phase 2: Testing freelancer matching...');
    
    const matchingData = {
      applicationId: Date.now(),
      gigId: gigId,
      freelancerId: TEST_CONFIG.freelancerId
    };

    const postData = JSON.stringify(matchingData);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/gigs/match-freelancer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Test-Bypass-Auth': 'true'
      }
    };

    const response = await makeHttpRequest(options, postData);
    const duration = Date.now() - startTime;

    if (response.status !== 200) {
      breakages.push(`Freelancer matching API failed with status ${response.status}`);
      breakages.push(`Response: ${JSON.stringify(response.data)}`);
      recommendations.push('Check freelancer matching API implementation');
      recommendations.push('Verify gig availability and freelancer existence');

      return {
        testName,
        status: 'FAIL',
        duration,
        details: { response: response.data, status: response.status },
        breakages,
        recommendations
      };
    }

    // Validate project creation
    if (!response.data.entities || !response.data.entities.project) {
      breakages.push('Project not created during freelancer matching');
      recommendations.push('Check project creation logic in matching workflow');
    }

    const projectId = response.data.entities?.project?.projectId;
    console.log(`✅ Project created with ID: ${projectId}`);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: { projectId, response: response.data },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Freelancer matching failed with error: ${error.message}`);
    recommendations.push('Check API endpoint availability');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

async function testTaskCreationFromMilestones(projectId) {
  const testName = 'Task Creation from Milestones';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('📋 Phase 3: Validating task creation from milestones...');

    // Check if tasks were created from milestones
    const projectTasksPath = path.join(TEST_CONFIG.dataPath, 'project-tasks.json');

    let projectTasks = [];
    try {
      const tasksData = await fs.readFile(projectTasksPath, 'utf-8');
      projectTasks = JSON.parse(tasksData);
    } catch (error) {
      breakages.push('Project tasks file not found or invalid');
      recommendations.push('Check task creation logic in project activation');
    }

    // Filter tasks for this project
    const projectSpecificTasks = projectTasks.filter(task =>
      Number(task.projectId) === Number(projectId)
    );

    if (projectSpecificTasks.length === 0) {
      breakages.push('No tasks created for the project');
      recommendations.push('Verify milestone-to-task conversion logic');
    } else if (projectSpecificTasks.length !== TEST_CONFIG.milestoneCount) {
      breakages.push(`Expected ${TEST_CONFIG.milestoneCount} tasks, found ${projectSpecificTasks.length}`);
      recommendations.push('Check milestone-to-task mapping logic');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Found ${projectSpecificTasks.length} tasks for project ${projectId}`);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        projectId,
        tasksFound: projectSpecificTasks.length,
        tasks: projectSpecificTasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
      },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Task validation failed with error: ${error.message}`);
    recommendations.push('Check file system permissions and data structure');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

async function testTaskApprovalWorkflow(projectId) {
  const testName = 'Task Submission and Approval Workflow';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('🔄 Phase 4: Testing task approval workflow...');

    // Test task approval API
    const approvalData = {
      taskId: 1, // Use a test task ID
      action: 'approve',
      actorId: TEST_CONFIG.commissionerId
    };

    const postData = JSON.stringify(approvalData);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/test/task-operations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await makeHttpRequest(options, postData);
    const duration = Date.now() - startTime;

    if (response.status !== 200) {
      breakages.push(`Task approval API failed with status ${response.status}`);
      breakages.push(`Response: ${JSON.stringify(response.data)}`);
      recommendations.push('Check task approval API implementation');
    }

    console.log(`✅ Task approval workflow tested`);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: { response: response.data },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Task approval workflow failed with error: ${error.message}`);
    recommendations.push('Check API endpoint availability and task data structure');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

async function testMilestoneInvoiceGeneration(projectId) {
  const testName = 'Milestone Invoice Generation';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('💰 Phase 5: Testing milestone invoice generation...');

    // Test automatic invoice generation
    const invoiceData = {
      taskId: 1, // Use a test task ID
      projectId: projectId,
      action: 'task_approved'
    };

    const postData = JSON.stringify(invoiceData);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/invoices/auto-generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await makeHttpRequest(options, postData);
    const duration = Date.now() - startTime;

    if (response.status !== 200) {
      breakages.push(`Invoice generation API failed with status ${response.status}`);
      breakages.push(`Response: ${JSON.stringify(response.data)}`);
      recommendations.push('Check invoice generation API implementation');
      recommendations.push('Verify project invoicing method is set to milestone');
    }

    // Validate invoice was created
    if (response.data && response.data.invoiceNumber) {
      console.log(`✅ Invoice generated: ${response.data.invoiceNumber}`);
    } else {
      breakages.push('Invoice number not returned in response');
      recommendations.push('Check invoice creation logic and response format');
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        projectId,
        invoiceNumber: response.data?.invoiceNumber,
        response: response.data
      },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Invoice generation failed with error: ${error.message}`);
    recommendations.push('Check API endpoint availability and invoice generation logic');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

async function testPaymentExecution() {
  const testName = 'Payment Execution and Wallet Updates';
  const startTime = Date.now();
  const breakages = [];
  const recommendations = [];

  try {
    console.log('💳 Phase 6: Testing payment execution...');

    // Test wallet API
    const walletOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/payments/wallet?userId=${TEST_CONFIG.freelancerId}&userType=freelancer`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const walletResponse = await makeHttpRequest(walletOptions);
    const duration = Date.now() - startTime;

    if (walletResponse.status !== 200) {
      breakages.push(`Wallet API failed with status ${walletResponse.status}`);
      breakages.push(`Response: ${JSON.stringify(walletResponse.data)}`);
      recommendations.push('Check wallet API implementation');
    } else if (walletResponse.data?.entities?.wallet) {
      const wallet = walletResponse.data.entities.wallet;
      console.log(`✅ Wallet balance: $${wallet.availableBalance}`);
    } else {
      breakages.push('Invalid wallet response structure');
      recommendations.push('Check wallet API response format');
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        walletResponse: walletResponse.data
      },
      breakages,
      recommendations
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    breakages.push(`Payment execution failed with error: ${error.message}`);
    recommendations.push('Check payment API availability and wallet integration');

    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error.message },
      breakages,
      recommendations
    };
  }
}

// Main Test Runner
async function runComprehensiveMilestoneTest() {
  console.log('🚀 Starting Comprehensive Milestone-Based Invoicing Test Suite...');
  console.log('=' .repeat(80));
  
  const results = [];
  const startTime = Date.now();
  
  let gigId = null;
  let projectId = null;

  try {
    // Phase 1: Gig Creation
    console.log('\n🎯 Phase 1: Milestone-Based Gig Creation');
    const gigResult = await testGigCreation();
    results.push(gigResult);
    
    if (gigResult.status === 'PASS') {
      gigId = gigResult.details.gigId;
    } else {
      console.log('❌ Gig creation failed, skipping downstream tests');
    }

    // Phase 2: Freelancer Matching (only if gig creation succeeded)
    if (gigId) {
      console.log('\n🤝 Phase 2: Freelancer Matching and Project Activation');
      const matchingResult = await testFreelancerMatching(gigId);
      results.push(matchingResult);
      
      if (matchingResult.status === 'PASS') {
        projectId = matchingResult.details.projectId;
      } else {
        console.log('❌ Freelancer matching failed, skipping downstream tests');
      }
    } else {
      results.push({
        testName: 'Freelancer Matching and Project Activation',
        status: 'SKIP',
        duration: 0,
        details: { reason: 'Gig creation failed' },
        breakages: ['Skipped due to upstream failure'],
        recommendations: ['Fix gig creation first']
      });
    }

    // Phase 3: Task Creation Validation (only if project creation succeeded)
    if (projectId) {
      console.log('\n📋 Phase 3: Task Creation from Milestones');
      const taskResult = await testTaskCreationFromMilestones(projectId);
      results.push(taskResult);
    } else {
      results.push({
        testName: 'Task Creation from Milestones',
        status: 'SKIP',
        duration: 0,
        details: { reason: 'Project creation failed' },
        breakages: ['Skipped due to upstream failure'],
        recommendations: ['Fix project creation first']
      });
    }

    // Phase 4: Task Approval Workflow
    if (projectId) {
      console.log('\n🔄 Phase 4: Task Submission and Approval Workflow');
      const approvalResult = await testTaskApprovalWorkflow(projectId);
      results.push(approvalResult);
    } else {
      results.push({
        testName: 'Task Submission and Approval Workflow',
        status: 'SKIP',
        duration: 0,
        details: { reason: 'Project creation failed' },
        breakages: ['Skipped due to upstream failure'],
        recommendations: ['Fix project creation first']
      });
    }

    // Phase 5: Invoice Generation
    if (projectId) {
      console.log('\n💰 Phase 5: Milestone Invoice Generation');
      const invoiceResult = await testMilestoneInvoiceGeneration(projectId);
      results.push(invoiceResult);
    } else {
      results.push({
        testName: 'Milestone Invoice Generation',
        status: 'SKIP',
        duration: 0,
        details: { reason: 'Project creation failed' },
        breakages: ['Skipped due to upstream failure'],
        recommendations: ['Fix project creation first']
      });
    }

    // Phase 6: Payment Execution
    console.log('\n💳 Phase 6: Payment Execution and Wallet Updates');
    const paymentResult = await testPaymentExecution();
    results.push(paymentResult);

  } catch (error) {
    console.error('❌ Critical error in test suite:', error);
    results.push({
      testName: 'Test Suite Execution',
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error.message },
      breakages: [`Critical test suite error: ${error.message}`],
      recommendations: ['Check test infrastructure and dependencies']
    });
  }

  const totalDuration = Date.now() - startTime;
  
  // Calculate summary metrics
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  const report = {
    summary: {
      totalTests: results.length,
      passed,
      failed,
      errors,
      totalDuration,
      overallScore: Math.round((passed / results.length) * 100)
    },
    results
  };

  return report;
}

// Generate prognosis report
function generatePrognosisReport(report) {
  const { summary } = report;
  
  let prognosisText = `# Clean Milestone-Based Invoicing System Prognosis

## Executive Summary

**Production Readiness Score: ${summary.overallScore}/100** ${summary.overallScore >= 80 ? '🟢' : summary.overallScore >= 60 ? '🟡' : '🔴'}
**Production Ready: ${summary.overallScore >= 80 ? 'YES' : 'NO'}** ${summary.overallScore >= 80 ? '✅' : '❌'}

## Test Results Overview

### Test Execution Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Errors**: ${summary.errors}
- **Total Duration**: ${summary.totalDuration}ms

## Detailed Test Results

`;

  // Add detailed results for each test
  report.results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'ERROR' ? '🔥' : '⏭️';
    prognosisText += `### ${index + 1}. ${result.testName}
**Status**: ${statusIcon} ${result.status}
**Duration**: ${result.duration}ms

`;

    if (result.breakages.length > 0) {
      prognosisText += `**Breakages Identified**:
${result.breakages.map(b => `- ${b}`).join('\n')}

`;
    }

    if (result.recommendations.length > 0) {
      prognosisText += `**Recommendations**:
${result.recommendations.map(r => `- ${r}`).join('\n')}

`;
    }
  });

  prognosisText += `## Final Assessment

**Production Readiness**: ${summary.overallScore >= 80 ? 'READY' : summary.overallScore >= 60 ? 'NEEDS MINOR FIXES' : summary.overallScore >= 40 ? 'NEEDS MAJOR FIXES' : 'NOT READY'}
**Risk Level**: ${summary.errors > 0 ? 'HIGH' : summary.failed > 2 ? 'MEDIUM' : 'LOW'}

**Recommendation**: ${summary.overallScore >= 80 ? '**DEPLOY TO PRODUCTION**' : '**DO NOT DEPLOY**'} until critical issues are resolved.

---

*Report generated by Clean Comprehensive Milestone-Based Invoicing Test & Prognosis*  
*Timestamp: ${new Date().toISOString()}*
`;

  return prognosisText;
}

// Main execution function
async function runTestAndGeneratePrognosis() {
  console.log('🧪 Starting Clean Milestone-Based Invoicing Test Suite...');
  
  const report = await runComprehensiveMilestoneTest();
  const prognosis = generatePrognosisReport(report);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'CLEAN_MILESTONE_INVOICING_PROGNOSIS.md');
  await fs.writeFile(reportPath, prognosis, 'utf-8');
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUITE COMPLETED');
  console.log('='.repeat(80));
  console.log(`📈 Overall Score: ${report.summary.overallScore}/100`);
  console.log(`📄 Full report saved to: ${reportPath}`);
  console.log('='.repeat(80));
  
  // Log summary for easy access
  console.log('\n🎯 SUMMARY OF BREAKAGES:');
  const allBreakages = report.results.flatMap(r => r.breakages);
  allBreakages.forEach((breakage, index) => {
    console.log(`${index + 1}. ${breakage}`);
  });
  
  console.log('\n💡 SUMMARY OF RECOMMENDATIONS:');
  const allRecommendations = [...new Set(report.results.flatMap(r => r.recommendations))];
  allRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  console.log(`\n📊 FINAL PRODUCTION READINESS SCORE: ${report.summary.overallScore}/100`);
  
  return { report, prognosis };
}

// Run the test
runTestAndGeneratePrognosis().catch(console.error);
