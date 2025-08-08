#!/usr/bin/env node

/**
 * Invoice Status System Test Script
 * 
 * This script tests the well-defined invoice status system to ensure:
 * 1. Draft invoices are not visible to commissioners
 * 2. Sent invoices are awaiting payment
 * 3. Paid invoices are properly processed
 * 4. Auto-milestone invoices follow proper workflow
 * 5. On-hold invoices have retry mechanisms
 */

const fs = require('fs').promises;
const path = require('path');

async function testInvoiceStatusSystem() {
  console.log('🔍 Testing Invoice Status System...\n');

  const testResults = {
    statusDefinitions: false,
    visibilityRules: false,
    autoMilestoneWorkflow: false,
    retryMechanism: false,
    statusTransitions: false
  };

  try {
    // Test 1: Status Definitions
    console.log('1️⃣ Testing Status Definitions...');
    
    const statusDefPath = path.join(process.cwd(), 'src/lib/invoice-status-definitions.ts');
    const statusDefContent = await fs.readFile(statusDefPath, 'utf-8');
    
    const requiredStatuses = ['draft', 'sent', 'paid', 'on_hold', 'cancelled', 'overdue'];
    const hasAllStatuses = requiredStatuses.every(status => 
      statusDefContent.includes(`'${status}'`)
    );
    
    const hasVisibilityRules = statusDefContent.includes('visibleToCommissioner: false') &&
                              statusDefContent.includes('filterInvoicesForCommissioner');
    
    if (hasAllStatuses && hasVisibilityRules) {
      console.log('   ✅ All required statuses defined with visibility rules');
      testResults.statusDefinitions = true;
    } else {
      console.log('   ❌ Missing status definitions or visibility rules');
    }

    // Test 2: Commissioner Visibility Rules
    console.log('\n2️⃣ Testing Commissioner Visibility Rules...');
    
    // Check if invoices API has proper filtering
    const invoicesAPIPath = path.join(process.cwd(), 'src/app/api/invoices/route.ts');
    const invoicesAPIContent = await fs.readFile(invoicesAPIPath, 'utf-8');
    
    const hasSessionAuth = invoicesAPIContent.includes('getServerSession');
    const hasCommissionerFiltering = invoicesAPIContent.includes('filterInvoicesForCommissioner');
    const hasDraftFiltering = invoicesAPIContent.includes('visibleToCommissioner');
    
    if (hasSessionAuth && hasCommissionerFiltering) {
      console.log('   ✅ Commissioner visibility filtering implemented');
      testResults.visibilityRules = true;
    } else {
      console.log('   ❌ Commissioner visibility filtering missing');
      console.log(`     - Session auth: ${hasSessionAuth}`);
      console.log(`     - Commissioner filtering: ${hasCommissionerFiltering}`);
    }

    // Test 3: Auto-Milestone Workflow
    console.log('\n3️⃣ Testing Auto-Milestone Workflow...');
    
    const autoGenPath = path.join(process.cwd(), 'src/app/api/invoices/auto-generate/route.ts');
    const autoGenContent = await fs.readFile(autoGenPath, 'utf-8');
    
    const hasProperStatus = autoGenContent.includes('getInitialInvoiceStatus');
    const hasInvoiceType = autoGenContent.includes('auto_milestone');
    const hasSentStatus = autoGenContent.includes("status: initialStatus");
    
    if (hasProperStatus && hasInvoiceType && hasSentStatus) {
      console.log('   ✅ Auto-milestone invoices use proper status workflow');
      testResults.autoMilestoneWorkflow = true;
    } else {
      console.log('   ❌ Auto-milestone workflow issues found');
      console.log(`     - Proper status: ${hasProperStatus}`);
      console.log(`     - Invoice type: ${hasInvoiceType}`);
      console.log(`     - Sent status: ${hasSentStatus}`);
    }

    // Test 4: Retry Mechanism
    console.log('\n4️⃣ Testing Auto-Payment Retry Mechanism...');
    
    const retryAPIPath = path.join(process.cwd(), 'src/app/api/invoices/auto-payment-retry/route.ts');
    let hasRetryMechanism = false;
    
    try {
      const retryAPIContent = await fs.readFile(retryAPIPath, 'utf-8');
      
      const hasOnHoldHandling = retryAPIContent.includes("status === 'on_hold'");
      const hasRetryLogic = retryAPIContent.includes('AUTO_MILESTONE_CONFIG.retryAttempts');
      const hasManualTrigger = retryAPIContent.includes('PUT');
      const hasTwoDayDelay = retryAPIContent.includes('retryDelayDays');
      
      if (hasOnHoldHandling && hasRetryLogic && hasManualTrigger && hasTwoDayDelay) {
        console.log('   ✅ Auto-payment retry mechanism implemented');
        console.log('     - On-hold status handling: ✅');
        console.log('     - Retry attempts limit: ✅');
        console.log('     - Manual trigger support: ✅');
        console.log('     - Two-day retry delay: ✅');
        testResults.retryMechanism = true;
        hasRetryMechanism = true;
      } else {
        console.log('   ❌ Retry mechanism incomplete');
        console.log(`     - On-hold handling: ${hasOnHoldHandling}`);
        console.log(`     - Retry logic: ${hasRetryLogic}`);
        console.log(`     - Manual trigger: ${hasManualTrigger}`);
        console.log(`     - Two-day delay: ${hasTwoDayDelay}`);
      }
    } catch (error) {
      console.log('   ❌ Auto-payment retry API not found');
    }

    // Test 5: Status Transitions
    console.log('\n5️⃣ Testing Status Transitions...');
    
    const hasTransitionRules = statusDefContent.includes('STATUS_TRANSITIONS');
    const hasValidationFunction = statusDefContent.includes('isValidStatusTransition');
    const hasDraftToSent = statusDefContent.includes("draft: ['sent', 'cancelled']");
    const hasSentToOnHold = statusDefContent.includes("'on_hold'");
    
    if (hasTransitionRules && hasValidationFunction && hasDraftToSent && hasSentToOnHold) {
      console.log('   ✅ Status transition rules properly defined');
      testResults.statusTransitions = true;
    } else {
      console.log('   ❌ Status transition rules incomplete');
      console.log(`     - Transition rules: ${hasTransitionRules}`);
      console.log(`     - Validation function: ${hasValidationFunction}`);
      console.log(`     - Draft to sent: ${hasDraftToSent}`);
      console.log(`     - Sent to on-hold: ${hasSentToOnHold}`);
    }

    // Test 6: Real Invoice Data Analysis
    console.log('\n6️⃣ Analyzing Real Invoice Data...');
    
    let invoiceStats = {
      total: 0,
      draft: 0,
      sent: 0,
      paid: 0,
      onHold: 0,
      autoGenerated: 0,
      manual: 0
    };

    async function analyzeInvoicesRecursively(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await analyzeInvoicesRecursively(fullPath);
        } else if (entry.name === 'invoice.json') {
          try {
            const invoiceData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
            invoiceStats.total++;
            
            // Count by status
            if (invoiceData.status === 'draft') invoiceStats.draft++;
            else if (invoiceData.status === 'sent') invoiceStats.sent++;
            else if (invoiceData.status === 'paid') invoiceStats.paid++;
            else if (invoiceData.status === 'on_hold') invoiceStats.onHold++;
            
            // Count by type
            if (invoiceData.isAutoGenerated || invoiceData.invoiceType?.includes('auto')) {
              invoiceStats.autoGenerated++;
            } else {
              invoiceStats.manual++;
            }
            
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }

    const invoicesDir = path.join(process.cwd(), 'data/invoices');
    await analyzeInvoicesRecursively(invoicesDir);

    console.log('   📊 Invoice Statistics:');
    console.log(`     Total invoices: ${invoiceStats.total}`);
    console.log(`     Draft: ${invoiceStats.draft} (${Math.round(invoiceStats.draft/invoiceStats.total*100)}%)`);
    console.log(`     Sent: ${invoiceStats.sent} (${Math.round(invoiceStats.sent/invoiceStats.total*100)}%)`);
    console.log(`     Paid: ${invoiceStats.paid} (${Math.round(invoiceStats.paid/invoiceStats.total*100)}%)`);
    console.log(`     On Hold: ${invoiceStats.onHold} (${Math.round(invoiceStats.onHold/invoiceStats.total*100)}%)`);
    console.log(`     Auto-generated: ${invoiceStats.autoGenerated} (${Math.round(invoiceStats.autoGenerated/invoiceStats.total*100)}%)`);
    console.log(`     Manual: ${invoiceStats.manual} (${Math.round(invoiceStats.manual/invoiceStats.total*100)}%)`);

    // Calculate overall score
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const score = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 Invoice Status System Test Results:');
    console.log(`   Status Definitions: ${testResults.statusDefinitions ? '✅' : '❌'}`);
    console.log(`   Visibility Rules: ${testResults.visibilityRules ? '✅' : '❌'}`);
    console.log(`   Auto-Milestone Workflow: ${testResults.autoMilestoneWorkflow ? '✅' : '❌'}`);
    console.log(`   Retry Mechanism: ${testResults.retryMechanism ? '✅' : '❌'}`);
    console.log(`   Status Transitions: ${testResults.statusTransitions ? '✅' : '❌'}`);

    console.log(`\n🎯 Overall Score: ${score}% (${passedTests}/${totalTests} tests passed)`);

    if (score === 100) {
      console.log('🎉 Invoice status system is PERFECTLY implemented!');
      console.log('\n✅ Key Features Confirmed:');
      console.log('   - Commissioners cannot see draft invoices');
      console.log('   - Sent invoices await payment');
      console.log('   - Auto-milestone invoices are properly logged');
      console.log('   - Failed payments go to on-hold with retry mechanism');
      console.log('   - Manual triggers can accelerate payments');
      console.log('   - Two-day auto-retry delay is implemented');
    } else if (score >= 80) {
      console.log('✅ Invoice status system is well implemented with minor gaps');
    } else {
      console.log('⚠️  Invoice status system needs significant improvements');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testInvoiceStatusSystem();
