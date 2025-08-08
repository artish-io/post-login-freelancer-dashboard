#!/usr/bin/env node

/**
 * Test Payment Flow Script
 * 
 * This script tests the complete payment flow for both milestone and completion-based projects
 * Tests include:
 * 1. Payment trigger validation
 * 2. Payment execution validation
 * 3. Transaction logging
 * 4. Error handling for various edge cases
 */

const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3001';

// Test data - using existing invoices with "sent" status
const TEST_CASES = [
  {
    name: 'Milestone Project Payment - Valid Invoice',
    type: 'milestone',
    invoiceNumber: 'MGL100000-M2', // From data/invoices/2025/June/04/301/invoice.json
    freelancerId: 31,
    commissionerId: 32,
    projectId: 301,
    expectedAmount: 1748
  },
  {
    name: 'Milestone Project Payment - Another Valid Invoice',
    type: 'milestone', 
    invoiceNumber: 'MGL100004-M2', // From data/invoices/2025/June/09/303/invoice.json
    freelancerId: 31,
    commissionerId: 35,
    projectId: 303,
    expectedAmount: 2150
  },
  {
    name: 'Completion Project Payment - Valid Invoice',
    type: 'completion',
    invoiceNumber: 'CUSTOM-001-M2', // From data/invoices/2025/July/17/custom/invoice.json
    freelancerId: 31,
    commissionerId: 33,
    projectId: null, // Custom project
    expectedAmount: 1000
  }
];

// Error test cases
const ERROR_TEST_CASES = [
  {
    name: 'Invalid Invoice Number',
    invoiceNumber: 'INVALID-INVOICE-123',
    freelancerId: 31,
    commissionerId: 32,
    expectedError: 'Invoice not found'
  },
  {
    name: 'Unauthorized Freelancer',
    invoiceNumber: 'MGL100000-M2',
    freelancerId: 999, // Wrong freelancer ID
    commissionerId: 32,
    expectedError: 'Unauthorized freelancer'
  },
  {
    name: 'Unauthorized Commissioner',
    invoiceNumber: 'MGL100000-M2',
    freelancerId: 31,
    commissionerId: 999, // Wrong commissioner ID
    expectedError: 'Unauthorized commissioner'
  }
];

async function makeRequest(url, method, body) {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 500, ok: false, error: error.message };
  }
}

async function testPaymentTrigger(testCase) {
  console.log(`\n🔄 Testing Payment Trigger: ${testCase.name}`);
  
  const result = await makeRequest(`${BASE_URL}/api/payments/trigger`, 'POST', {
    invoiceNumber: testCase.invoiceNumber,
    freelancerId: testCase.freelancerId
  });
  
  console.log(`   Status: ${result.status}`);
  console.log(`   Response:`, JSON.stringify(result.data, null, 2));
  
  return result;
}

async function testPaymentExecute(testCase, transactionId) {
  console.log(`\n💳 Testing Payment Execute: ${testCase.name}`);
  
  const result = await makeRequest(`${BASE_URL}/api/payments/execute`, 'POST', {
    invoiceNumber: testCase.invoiceNumber,
    commissionerId: testCase.commissionerId
  });
  
  console.log(`   Status: ${result.status}`);
  console.log(`   Response:`, JSON.stringify(result.data, null, 2));
  
  return result;
}

async function testErrorCases() {
  console.log('\n🚨 Testing Error Cases');
  
  for (const testCase of ERROR_TEST_CASES) {
    console.log(`\n   Testing: ${testCase.name}`);
    
    // Test trigger endpoint
    const triggerResult = await makeRequest(`${BASE_URL}/api/payments/trigger`, 'POST', {
      invoiceNumber: testCase.invoiceNumber,
      freelancerId: testCase.freelancerId
    });
    
    console.log(`   Trigger Status: ${triggerResult.status}`);
    if (triggerResult.data?.error) {
      console.log(`   ✅ Expected error: ${triggerResult.data.error}`);
    }
    
    // Test execute endpoint
    const executeResult = await makeRequest(`${BASE_URL}/api/payments/execute`, 'POST', {
      invoiceNumber: testCase.invoiceNumber,
      commissionerId: testCase.commissionerId
    });
    
    console.log(`   Execute Status: ${executeResult.status}`);
    if (executeResult.data?.error) {
      console.log(`   ✅ Expected error: ${executeResult.data.error}`);
    }
  }
}

async function checkTransactionLog() {
  console.log('\n📋 Checking Transaction Log');
  
  try {
    const logPath = path.join(process.cwd(), 'data', 'payments', 'mock-transactions.json');
    const logData = await fs.readFile(logPath, 'utf-8');
    const transactions = JSON.parse(logData);
    
    console.log(`   Found ${transactions.length} transactions in log`);
    transactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionId} - ${txn.status} - $${txn.amount} - ${txn.integration}`);
    });
    
    return transactions;
  } catch (error) {
    console.log(`   ❌ Error reading transaction log: ${error.message}`);
    return [];
  }
}

async function testPaymentEligibility(projectId) {
  console.log(`\n🔍 Testing Payment Eligibility for Project ${projectId}`);
  
  const result = await makeRequest(`${BASE_URL}/api/projects/payment-eligibility?projectId=${projectId}`, 'GET');
  
  console.log(`   Status: ${result.status}`);
  console.log(`   Payment Method Available: ${result.data?.paymentMethodAvailable}`);
  console.log(`   Payment Trigger Endpoint: ${result.data?.paymentTriggerEndpoint}`);
  console.log(`   Payment Eligible: ${result.data?.paymentEligible}`);
  console.log(`   Eligible Invoices: ${result.data?.eligibleInvoices?.length || 0}`);
  
  return result;
}

async function runTests() {
  console.log('🧪 Starting Payment Flow Tests\n');
  console.log('=' * 50);
  
  // Test payment eligibility first
  for (const testCase of TEST_CASES) {
    if (testCase.projectId) {
      await testPaymentEligibility(testCase.projectId);
    }
  }
  
  // Test successful payment flows
  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Testing Complete Flow: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    
    // Step 1: Trigger payment
    const triggerResult = await testPaymentTrigger(testCase);
    
    if (triggerResult.ok) {
      console.log(`   ✅ Payment trigger successful`);
      
      // Step 2: Execute payment
      const executeResult = await testPaymentExecute(testCase, triggerResult.data.transactionId);
      
      if (executeResult.ok) {
        console.log(`   ✅ Payment execution successful`);
      } else {
        console.log(`   ❌ Payment execution failed`);
      }
    } else {
      console.log(`   ❌ Payment trigger failed`);
    }
  }
  
  // Test error cases
  await testErrorCases();
  
  // Check final transaction log
  await checkTransactionLog();
  
  console.log('\n🏁 Payment Flow Tests Complete');
}

// Run the tests
runTests().catch(console.error);
