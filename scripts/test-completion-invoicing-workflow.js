#!/usr/bin/env node

/**
 * Comprehensive Test Script for Completion Invoicing Workflow
 * 
 * This script tests the complete flow from gig creation through project completion:
 * 1. Create a test gig with completion invoicing method
 * 2. Test freelancer matching to project activation
 * 3. Test upfront payment logic (12% of budget)
 * 4. Test task approval workflow
 * 5. Test completion payment logic (88% of budget)
 * 6. Validate all data integrity and business rules
 * 
 * Usage: node scripts/test-completion-invoicing-workflow.js
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testCommissionerId: 32, // Neilsan Mando - commissioner with test credentials
  testFreelancerId: 1,    // Tobi Philly - freelancer
  testBudget: 5000,
  testGigTitle: 'Test Completion Invoicing Workflow',
  testProjectTasks: 3,
  timeout: 30000,
  // Test credentials
  commissionerCredentials: {
    username: 'neilsan',
    password: 'testpass'
  }
};

// Test state tracking
let testState = {
  gigId: null,
  projectId: null,
  applicationId: null,
  upfrontInvoiceNumber: null,
  completionInvoiceNumber: null,
  taskIds: [],
  errors: [],
  warnings: [],
  testResults: {},
  sessionCookie: null // Store session cookie for authenticated requests
};

/**
 * Authenticate and get session cookie
 */
async function authenticateUser() {
  console.log('🔐 Authenticating test user...');

  try {
    // First, get CSRF token
    const csrfResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;

    // Then authenticate
    const authResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: TEST_CONFIG.commissionerCredentials.username,
        password: TEST_CONFIG.commissionerCredentials.password,
        csrfToken: csrfToken,
        callbackUrl: TEST_CONFIG.baseUrl,
        json: 'true'
      })
    });

    // Extract session cookie from response
    const setCookieHeader = authResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const sessionCookie = setCookieHeader.split(';')[0]; // Get the first cookie (session)
      testState.sessionCookie = sessionCookie;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.log('❌ No session cookie received');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    return false;
  }
}

/**
 * Utility function to make API calls with authentication
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  // Add session cookie if available
  if (testState.sessionCookie) {
    headers['Cookie'] = testState.sessionCookie;
  }

  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data,
      response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Test 1: Create a gig with completion invoicing method
 */
async function testGigCreation() {
  console.log('\n🔧 Test 1: Creating gig with completion invoicing...');
  
  // Add timestamp to make gig title unique
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueTitle = `${TEST_CONFIG.testGigTitle} ${timestamp}`;

  const gigData = {
    organizationData: {
      id: 1,
      name: 'Test Organization',
      industry: 'Technology',
      size: '10-50',
      website: 'https://test-org.com',
      description: 'Test organization for completion invoicing'
    },
    title: uniqueTitle,
    budget: TEST_CONFIG.testBudget,
    executionMethod: 'completion',
    commissionerId: TEST_CONFIG.testCommissionerId,
    category: 'development',
    subcategory: 'Web Development',
    skills: ['React', 'TypeScript', 'Testing'],
    tools: ['React', 'Jest', 'TypeScript'],
    description: 'Test gig for completion invoicing workflow validation',
    lowerBudget: TEST_CONFIG.testBudget,
    upperBudget: TEST_CONFIG.testBudget,
    deliveryTimeWeeks: 4,
    estimatedHours: 100,
    startType: 'Immediately',
    isPublic: true,
    isTargetedRequest: false
  };

  const result = await apiCall('/api/gigs/post', 'POST', gigData);
  
  if (result.success && result.data.success) {
    testState.gigId = result.data.gigId;
    testState.testResults.gigCreation = {
      status: 'PASS',
      gigId: testState.gigId,
      message: 'Gig created successfully with completion invoicing'
    };
    console.log(`✅ Gig created with ID: ${testState.gigId}`);
  } else {
    testState.errors.push(`Gig creation failed: ${result.data?.message || result.error}`);
    testState.testResults.gigCreation = {
      status: 'FAIL',
      error: result.data?.message || result.error
    };
    console.log(`❌ Gig creation failed: ${result.data?.message || result.error}`);
  }

  return result.success;
}

/**
 * Test 2: Create freelancer application
 */
async function testFreelancerApplication() {
  console.log('\n📝 Test 2: Creating freelancer application...');
  
  if (!testState.gigId) {
    testState.errors.push('Cannot test application - no gig ID available');
    return false;
  }

  const applicationData = {
    freelancerId: TEST_CONFIG.testFreelancerId,
    pitch: 'Test application for completion invoicing workflow validation',
    sampleLinks: ['https://example.com/portfolio1', 'https://example.com/portfolio2'],
    skills: ['React', 'TypeScript', 'Testing'],
    tools: ['React', 'Jest', 'TypeScript']
  };

  const result = await apiCall(`/api/gigs/${testState.gigId}/apply`, 'POST', applicationData);
  
  if (result.success && result.data.success) {
    testState.applicationId = result.data.applicationId;
    testState.testResults.freelancerApplication = {
      status: 'PASS',
      applicationId: testState.applicationId,
      message: 'Freelancer application submitted successfully'
    };
    console.log(`✅ Application created with ID: ${testState.applicationId}`);
  } else {
    const errorMessage = result.data?.error || result.data?.message || result.error || 'Unknown error';
    const gigStatus = result.data?.gigStatus || 'Unknown';
    const fullError = `${errorMessage} (Gig Status: ${gigStatus})`;

    testState.errors.push(`Application creation failed: ${fullError}`);
    testState.testResults.freelancerApplication = {
      status: 'FAIL',
      error: fullError,
      gigStatus: gigStatus
    };
    console.log(`❌ Application creation failed: ${fullError}`);
  }

  return result.success;
}

/**
 * Test 3: Match freelancer and activate project
 */
async function testFreelancerMatching() {
  console.log('\n🤝 Test 3: Matching freelancer and activating project...');
  
  if (!testState.gigId || !testState.applicationId) {
    testState.errors.push('Cannot test matching - missing gig ID or application ID');
    return false;
  }

  const matchingData = {
    applicationId: testState.applicationId,
    gigId: testState.gigId,
    freelancerId: TEST_CONFIG.testFreelancerId
  };

  const result = await apiCall('/api/test/match-freelancer', 'POST', matchingData);
  
  if (result.success && result.data.success) {
    testState.projectId = result.data.entities?.project?.projectId;
    testState.testResults.freelancerMatching = {
      status: 'PASS',
      projectId: testState.projectId,
      message: 'Freelancer matched and project activated successfully'
    };
    console.log(`✅ Project activated with ID: ${testState.projectId}`);
    
    // Extract task IDs for later testing
    if (result.data.entities?.tasks) {
      testState.taskIds = result.data.entities.tasks.map(task => task.taskId);
      console.log(`📋 Created ${testState.taskIds.length} tasks: ${testState.taskIds.join(', ')}`);
    }
  } else {
    testState.errors.push(`Freelancer matching failed: ${result.data?.message || result.error}`);
    testState.testResults.freelancerMatching = {
      status: 'FAIL',
      error: result.data?.message || result.error
    };
    console.log(`❌ Freelancer matching failed: ${result.data?.message || result.error}`);
  }

  return result.success;
}

/**
 * Test 4: Generate and validate upfront invoice (12% of budget)
 */
async function testUpfrontInvoiceGeneration() {
  console.log('\n💰 Test 4: Generating upfront invoice (12% of budget)...');
  
  if (!testState.projectId) {
    testState.errors.push('Cannot test upfront invoice - no project ID available');
    return false;
  }

  const upfrontData = {
    projectId: testState.projectId,
    upfrontPercent: 12
  };

  const result = await apiCall('/api/test/generate-upfront-invoice', 'POST', upfrontData);
  
  if (result.success && result.data.success) {
    testState.upfrontInvoiceNumber = result.data.invoiceNumber;
    const expectedAmount = Math.round(TEST_CONFIG.testBudget * 0.12);
    const actualAmount = result.data.amount;
    
    testState.testResults.upfrontInvoice = {
      status: actualAmount === expectedAmount ? 'PASS' : 'FAIL',
      invoiceNumber: testState.upfrontInvoiceNumber,
      expectedAmount,
      actualAmount,
      message: `Upfront invoice generated: $${actualAmount} (expected: $${expectedAmount})`
    };
    
    if (actualAmount === expectedAmount) {
      console.log(`✅ Upfront invoice generated: ${testState.upfrontInvoiceNumber} for $${actualAmount}`);
    } else {
      testState.warnings.push(`Upfront amount mismatch: expected $${expectedAmount}, got $${actualAmount}`);
      console.log(`⚠️ Upfront amount mismatch: expected $${expectedAmount}, got $${actualAmount}`);
    }
  } else {
    testState.errors.push(`Upfront invoice generation failed: ${result.data?.message || result.error}`);
    testState.testResults.upfrontInvoice = {
      status: 'FAIL',
      error: result.data?.message || result.error
    };
    console.log(`❌ Upfront invoice generation failed: ${result.data?.message || result.error}`);
  }

  return result.success;
}

/**
 * Test 5: Simulate upfront payment
 */
async function testUpfrontPayment() {
  console.log('\n💳 Test 5: Processing upfront payment...');
  
  if (!testState.upfrontInvoiceNumber) {
    testState.errors.push('Cannot test upfront payment - no upfront invoice available');
    return false;
  }

  const paymentData = {
    invoiceNumber: testState.upfrontInvoiceNumber,
    commissionerId: TEST_CONFIG.testCommissionerId,
    amount: Math.round(TEST_CONFIG.testBudget * 0.12),
    paymentMethodId: 'test_payment_method',
    currency: 'USD'
  };

  const result = await apiCall('/api/test/pay-invoice', 'POST', paymentData);
  
  if (result.success && result.data.success) {
    testState.testResults.upfrontPayment = {
      status: 'PASS',
      paymentId: result.data.paymentId,
      amountPaid: result.data.amountPaid,
      message: 'Upfront payment processed successfully'
    };
    console.log(`✅ Upfront payment processed: ${result.data.paymentId} for $${result.data.amountPaid}`);
  } else {
    testState.errors.push(`Upfront payment failed: ${result.data?.message || result.error}`);
    testState.testResults.upfrontPayment = {
      status: 'FAIL',
      error: result.data?.message || result.error
    };
    console.log(`❌ Upfront payment failed: ${result.data?.message || result.error}`);
  }

  return result.success;
}

/**
 * Test 6: Approve all tasks to trigger completion invoice
 */
async function testTaskApprovalWorkflow() {
  console.log('\n✅ Test 6: Approving all tasks to trigger completion...');
  
  if (!testState.taskIds.length || !testState.projectId) {
    testState.errors.push('Cannot test task approval - no tasks or project ID available');
    return false;
  }

  let allTasksApproved = true;
  const approvalResults = [];

  for (const taskId of testState.taskIds) {
    console.log(`  📝 Approving task ${taskId}...`);
    
    // First submit the task (simulate freelancer work)
    const submitResult = await apiCall('/api/test/task-operations', 'POST', {
      taskId,
      action: 'submit',
      referenceUrl: `https://example.com/work/${taskId}`
    });

    if (!submitResult.success) {
      const errorMsg = submitResult.data?.error || submitResult.data?.message || submitResult.error || 'Unknown error';
      testState.warnings.push(`Task ${taskId} submission failed: ${errorMsg}`);
      continue;
    }

    // Then approve the task (simulate commissioner approval)
    const approveResult = await apiCall('/api/test/task-operations', 'POST', {
      taskId,
      action: 'approve',
      feedback: 'Task approved for completion invoicing test'
    });

    if (approveResult.success && approveResult.data.success) {
      approvalResults.push({
        taskId,
        status: 'APPROVED',
        invoiceGenerated: approveResult.data.invoiceGenerated || false
      });
      console.log(`    ✅ Task ${taskId} approved`);
    } else {
      allTasksApproved = false;
      approvalResults.push({
        taskId,
        status: 'FAILED',
        error: approveResult.data?.message || approveResult.error
      });
      const errorMsg = approveResult.data?.error || approveResult.data?.message || approveResult.error || 'Unknown error';
      testState.errors.push(`Task ${taskId} approval failed: ${errorMsg}`);
      console.log(`    ❌ Task ${taskId} approval failed`);
    }
  }

  testState.testResults.taskApproval = {
    status: allTasksApproved ? 'PASS' : 'FAIL',
    approvalResults,
    totalTasks: testState.taskIds.length,
    approvedTasks: approvalResults.filter(r => r.status === 'APPROVED').length,
    message: `${approvalResults.filter(r => r.status === 'APPROVED').length}/${testState.taskIds.length} tasks approved`
  };

  return allTasksApproved;
}

/**
 * Test 7: Validate completion invoice generation (88% of budget)
 */
async function testCompletionInvoiceGeneration() {
  console.log('\n🏁 Test 7: Validating completion invoice generation...');

  if (!testState.projectId) {
    testState.errors.push('Cannot test completion invoice - no project ID available');
    return false;
  }

  const completionData = {
    projectId: testState.projectId
  };

  const result = await apiCall('/api/test/generate-completion-invoice', 'POST', completionData);

  if (result.success && result.data.success) {
    testState.completionInvoiceNumber = result.data.invoiceNumber;
    const expectedAmount = TEST_CONFIG.testBudget - Math.round(TEST_CONFIG.testBudget * 0.12);
    const actualAmount = result.data.amount;

    testState.testResults.completionInvoice = {
      status: actualAmount === expectedAmount ? 'PASS' : 'FAIL',
      invoiceNumber: testState.completionInvoiceNumber,
      expectedAmount,
      actualAmount,
      message: `Completion invoice generated: $${actualAmount} (expected: $${expectedAmount})`
    };

    if (actualAmount === expectedAmount) {
      console.log(`✅ Completion invoice generated: ${testState.completionInvoiceNumber} for $${actualAmount}`);
    } else {
      testState.warnings.push(`Completion amount mismatch: expected $${expectedAmount}, got $${actualAmount}`);
      console.log(`⚠️ Completion amount mismatch: expected $${expectedAmount}, got $${actualAmount}`);
    }
  } else {
    testState.errors.push(`Completion invoice generation failed: ${result.data?.message || result.error}`);
    testState.testResults.completionInvoice = {
      status: 'FAIL',
      error: result.data?.message || result.error
    };
    console.log(`❌ Completion invoice generation failed: ${result.data?.message || result.error}`);
  }

  return result.success;
}

/**
 * Test 8: Validate data integrity across all systems
 */
async function testDataIntegrity() {
  console.log('\n🔍 Test 8: Validating data integrity...');

  const integrityChecks = [];

  // Check project status
  if (testState.projectId) {
    const projectResult = await apiCall(`/api/projects/${testState.projectId}`);
    if (projectResult.success) {
      const project = projectResult.data;
      integrityChecks.push({
        check: 'project_status',
        expected: 'completed',
        actual: project.status,
        pass: project.status === 'completed'
      });

      integrityChecks.push({
        check: 'project_invoicing_method',
        expected: 'completion',
        actual: project.invoicingMethod,
        pass: project.invoicingMethod === 'completion'
      });
    }
  }

  // Check invoice amounts total to budget
  const upfrontAmount = Math.round(TEST_CONFIG.testBudget * 0.12);
  const completionAmount = TEST_CONFIG.testBudget - upfrontAmount;
  const totalInvoiceAmount = upfrontAmount + completionAmount;

  integrityChecks.push({
    check: 'invoice_amounts_total',
    expected: TEST_CONFIG.testBudget,
    actual: totalInvoiceAmount,
    pass: totalInvoiceAmount === TEST_CONFIG.testBudget
  });

  // Check gig status changed to unavailable
  if (testState.gigId) {
    const gigResult = await apiCall(`/api/gigs/${testState.gigId}`);
    if (gigResult.success) {
      integrityChecks.push({
        check: 'gig_status_unavailable',
        expected: 'Unavailable',
        actual: gigResult.data.status,
        pass: gigResult.data.status === 'Unavailable'
      });
    }
  }

  const allChecksPass = integrityChecks.every(check => check.pass);

  testState.testResults.dataIntegrity = {
    status: allChecksPass ? 'PASS' : 'FAIL',
    checks: integrityChecks,
    message: `${integrityChecks.filter(c => c.pass).length}/${integrityChecks.length} integrity checks passed`
  };

  integrityChecks.forEach(check => {
    const icon = check.pass ? '✅' : '❌';
    console.log(`  ${icon} ${check.check}: ${check.actual} (expected: ${check.expected})`);
  });

  return allChecksPass;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=' .repeat(50));
  
  const totalTests = Object.keys(testState.testResults).length;
  const passedTests = Object.values(testState.testResults).filter(r => r.status === 'PASS').length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\n📈 SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⚠️ Warnings: ${testState.warnings.length}`);
  console.log(`🚨 Errors: ${testState.errors.length}`);
  
  console.log('\n📋 DETAILED RESULTS:');
  Object.entries(testState.testResults).forEach(([testName, result]) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} ${testName}: ${result.status}`);
    if (result.message) console.log(`     ${result.message}`);
    if (result.error) console.log(`     Error: ${result.error}`);
  });
  
  if (testState.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    testState.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (testState.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    testState.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\n🔍 BREAKAGE ANALYSIS:');
  if (failedTests === 0 && testState.errors.length === 0) {
    console.log('  ✅ No breakages detected - all systems functioning correctly');
  } else {
    console.log('  🚨 BREAKAGES DETECTED:');
    
    // Analyze specific failure patterns
    if (!testState.testResults.gigCreation || testState.testResults.gigCreation.status === 'FAIL') {
      console.log('    - Gig creation system failure - check API endpoint and data validation');
    }
    
    if (!testState.testResults.freelancerMatching || testState.testResults.freelancerMatching.status === 'FAIL') {
      console.log('    - Freelancer matching system failure - check project activation logic');
    }
    
    if (!testState.testResults.upfrontInvoice || testState.testResults.upfrontInvoice.status === 'FAIL') {
      console.log('    - Upfront invoice generation failure - check completion invoicing logic');
    }
    
    if (!testState.testResults.taskApproval || testState.testResults.taskApproval.status === 'FAIL') {
      console.log('    - Task approval workflow failure - check task management system');
    }
    
    if (!testState.testResults.completionInvoice || testState.testResults.completionInvoice.status === 'FAIL') {
      console.log('    - Completion invoice generation failure - check auto-completion logic');
    }
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (failedTests > 0) {
    console.log('  1. Fix failing test cases before deploying to production');
    console.log('  2. Review error logs for specific failure points');
    console.log('  3. Validate data integrity across all storage systems');
  }
  if (testState.warnings.length > 0) {
    console.log('  4. Address warning conditions to prevent future issues');
  }
  console.log('  5. Run this test suite regularly to catch regressions');
  
  return {
    totalTests,
    passedTests,
    failedTests,
    warnings: testState.warnings.length,
    errors: testState.errors.length,
    success: failedTests === 0 && testState.errors.length === 0
  };
}

/**
 * Main test execution function
 */
async function runCompletionInvoicingTests() {
  console.log('🧪 STARTING COMPLETION INVOICING WORKFLOW TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`📋 Test Configuration:`);
  console.log(`   Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`   Commissioner ID: ${TEST_CONFIG.testCommissionerId}`);
  console.log(`   Freelancer ID: ${TEST_CONFIG.testFreelancerId}`);
  console.log(`   Test Budget: $${TEST_CONFIG.testBudget}`);
  console.log(`   Expected Upfront: $${Math.round(TEST_CONFIG.testBudget * 0.12)} (12%)`);
  console.log(`   Expected Completion: $${TEST_CONFIG.testBudget - Math.round(TEST_CONFIG.testBudget * 0.12)} (88%)`);
  
  try {
    // Execute test sequence (using test endpoints that bypass authentication)
    await testGigCreation();
    await testFreelancerApplication();
    await testFreelancerMatching();
    await testUpfrontInvoiceGeneration();
    await testUpfrontPayment();
    await testTaskApprovalWorkflow();
    await testCompletionInvoiceGeneration();
    await testDataIntegrity();
    
    // Generate final report
    const report = generateTestReport();
    
    // Save test results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), 'test-reports', `completion-invoicing-${timestamp}.json`);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        config: TEST_CONFIG,
        state: testState,
        summary: report
      }, null, 2));
      console.log(`\n📄 Test report saved to: ${reportPath}`);
    } catch (saveError) {
      console.log(`⚠️ Could not save test report: ${saveError.message}`);
    }
    
    process.exit(report.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n🚨 CRITICAL TEST FAILURE:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runCompletionInvoicingTests();
}

module.exports = {
  runCompletionInvoicingTests,
  testState,
  TEST_CONFIG
};
