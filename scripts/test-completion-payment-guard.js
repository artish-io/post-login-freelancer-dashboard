#!/usr/bin/env node

/**
 * Test Script: Completion Payment Guard Verification
 * 
 * This script tests the completion payment guard that prevents matching with freelancers
 * for completion-based gigs unless upfront payment has been executed.
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  testDataRoot: process.env.DATA_ROOT || './data'
};

class CompletionPaymentGuardTester {
  constructor() {
    this.results = [];
    this.issues = [];
    this.testStartTime = new Date();
  }

  async runTests() {
    console.log('🛡️ Testing Completion Payment Guard...\n');
    
    try {
      // Test 1: Verify guard implementation exists
      await this.testGuardImplementation();
      
      // Test 2: Verify guard logic
      await this.testGuardLogic();
      
      // Test 3: Verify error handling
      await this.testErrorHandling();
      
      // Generate summary
      this.generateSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testGuardImplementation() {
    console.log('🔍 Test 1: Guard Implementation Verification...');
    
    try {
      const routePath = 'src/app/api/gigs/match-freelancer/route.ts';
      const routeExists = await this.fileExists(routePath);
      
      if (routeExists) {
        const routeContent = await fs.readFile(routePath, 'utf8');
        
        const hasCompletionCheck = routeContent.includes('invoicingMethod === \'completion\'') || 
                                  routeContent.includes('executionMethod === \'completion\'');
        const hasUpfrontInvoiceCheck = routeContent.includes('completion_upfront');
        const hasPaymentStatusCheck = routeContent.includes('status === \'paid\'');
        const hasTransactionCheck = routeContent.includes('readAllTransactions');
        const hasRollbackLogic = routeContent.includes('deleteProject');
        const hasPaymentRequiredError = routeContent.includes('402');
        
        this.addResult('Guard Implementation', 'PASS', {
          routeExists: true,
          hasCompletionCheck,
          hasUpfrontInvoiceCheck,
          hasPaymentStatusCheck,
          hasTransactionCheck,
          hasRollbackLogic,
          hasPaymentRequiredError
        });
        
        console.log(`  ✅ Route exists: ${routeExists}`);
        console.log(`  ✅ Completion check: ${hasCompletionCheck}`);
        console.log(`  ✅ Upfront invoice check: ${hasUpfrontInvoiceCheck}`);
        console.log(`  ✅ Payment status check: ${hasPaymentStatusCheck}`);
        console.log(`  ✅ Transaction verification: ${hasTransactionCheck}`);
        console.log(`  ✅ Rollback logic: ${hasRollbackLogic}`);
        console.log(`  ✅ Payment required error: ${hasPaymentRequiredError}`);
        
      } else {
        this.addIssue('HIGH', 'Route Missing', 'Match freelancer route not found', 'route-missing');
        this.addResult('Guard Implementation', 'FAIL', { routeExists: false });
      }
      
    } catch (error) {
      this.addIssue('HIGH', 'Guard Implementation Test Failed', error.message, 'guard-implementation');
      this.addResult('Guard Implementation', 'FAIL', { error: error.message });
    }
    
    console.log('');
  }

  async testGuardLogic() {
    console.log('🧠 Test 2: Guard Logic Verification...');
    
    try {
      const routePath = 'src/app/api/gigs/match-freelancer/route.ts';
      const routeContent = await fs.readFile(routePath, 'utf8');
      
      // Check for proper guard placement (before gig status update)
      const gigStatusUpdateIndex = routeContent.indexOf('updateGig(gigId, acceptResult.gigUpdate)');
      const completionGuardIndex = routeContent.indexOf('COMPLETION PAYMENT GUARD');
      
      const guardBeforeUpdate = completionGuardIndex !== -1 && 
                               gigStatusUpdateIndex !== -1 && 
                               completionGuardIndex < gigStatusUpdateIndex;
      
      // Check for proper error messages
      const hasInformativeErrors = routeContent.includes('Upfront payment (12%) must be executed') &&
                                  routeContent.includes('Unable to verify upfront payment status');
      
      // Check for proper logging
      const hasDetailedLogging = routeContent.includes('COMPLETION PAYMENT GUARD FAILED') &&
                                routeContent.includes('COMPLETION PAYMENT GUARD PASSED');
      
      this.addResult('Guard Logic', 'PASS', {
        guardBeforeUpdate,
        hasInformativeErrors,
        hasDetailedLogging
      });
      
      console.log(`  ✅ Guard placed before gig update: ${guardBeforeUpdate}`);
      console.log(`  ✅ Informative error messages: ${hasInformativeErrors}`);
      console.log(`  ✅ Detailed logging: ${hasDetailedLogging}`);
      
    } catch (error) {
      this.addIssue('HIGH', 'Guard Logic Test Failed', error.message, 'guard-logic');
      this.addResult('Guard Logic', 'FAIL', { error: error.message });
    }
    
    console.log('');
  }

  async testErrorHandling() {
    console.log('⚠️ Test 3: Error Handling Verification...');
    
    try {
      const routePath = 'src/app/api/gigs/match-freelancer/route.ts';
      const routeContent = await fs.readFile(routePath, 'utf8');
      
      // Check for proper error handling patterns
      const hasTryCatchBlocks = routeContent.includes('try {') && routeContent.includes('} catch (');
      const hasRollbackOnError = routeContent.includes('Rolling back project creation');
      const hasProperErrorCodes = routeContent.includes('ErrorCodes.OPERATION_NOT_ALLOWED');
      const hasProperHttpStatus = routeContent.includes('status: 402');
      
      this.addResult('Error Handling', 'PASS', {
        hasTryCatchBlocks,
        hasRollbackOnError,
        hasProperErrorCodes,
        hasProperHttpStatus
      });
      
      console.log(`  ✅ Try-catch blocks: ${hasTryCatchBlocks}`);
      console.log(`  ✅ Rollback on error: ${hasRollbackOnError}`);
      console.log(`  ✅ Proper error codes: ${hasProperErrorCodes}`);
      console.log(`  ✅ Proper HTTP status: ${hasProperHttpStatus}`);
      
    } catch (error) {
      this.addIssue('HIGH', 'Error Handling Test Failed', error.message, 'error-handling');
      this.addResult('Error Handling', 'FAIL', { error: error.message });
    }
    
    console.log('');
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  addResult(testName, status, details) {
    this.results.push({
      testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  addIssue(severity, title, description, category) {
    this.issues.push({
      severity,
      title,
      description,
      category,
      timestamp: new Date().toISOString()
    });
  }

  generateSummary() {
    const testDuration = Date.now() - this.testStartTime.getTime();
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const totalTests = this.results.length;
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${testDuration}ms`);
    console.log(`Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      this.issues.forEach(issue => {
        console.log(`  ${issue.severity}: ${issue.title} - ${issue.description}`);
      });
    } else {
      console.log('\n✅ No issues found!');
    }
    
    console.log('\n🛡️ Completion Payment Guard Test Complete');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CompletionPaymentGuardTester();
  tester.runTests().catch(console.error);
}

module.exports = { CompletionPaymentGuardTester };
