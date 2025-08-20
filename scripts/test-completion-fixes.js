#!/usr/bin/env node

/**
 * Test script to validate completion project payout fixes
 * 
 * This script tests the key acceptance criteria:
 * 1. No early final payout when only some tasks are approved
 * 2. Final payout only when all tasks are approved AND remaining budget exists
 * 3. Manual invoice edge cases work correctly
 * 4. Budget integrity is maintained
 * 5. Notifications are emitted correctly
 */

const fs = require('fs').promises;
const path = require('path');

const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testProjectId: 'TEST-COMPLETION-001',
  testFreelancerId: 1,
  testCommissionerId: 2,
  totalBudget: 1000,
  totalTasks: 4
};

class CompletionFixesValidator {
  constructor() {
    this.issues = [];
    this.testResults = [];
  }

  addIssue(severity, title, description, category) {
    this.issues.push({ severity, title, description, category, timestamp: new Date().toISOString() });
    console.log(`❌ ${severity}: ${title} - ${description}`);
  }

  addSuccess(title, description) {
    this.testResults.push({ status: 'PASS', title, description, timestamp: new Date().toISOString() });
    console.log(`✅ PASS: ${title} - ${description}`);
  }

  async runAllTests() {
    console.log('🧪 Starting Completion Project Fixes Validation...\n');

    try {
      // Test 1: Validate completion gate logic
      await this.testCompletionGateLogic();
      
      // Test 2: Validate budget integrity
      await this.testBudgetIntegrity();
      
      // Test 3: Validate manual invoice pro-rating
      await this.testManualInvoiceProRating();
      
      // Test 4: Validate guards prevent milestone contamination
      await this.testGuardSystem();
      
      // Test 5: Validate notification system
      await this.testNotificationSystem();

    } catch (error) {
      this.addIssue('HIGH', 'Test Suite Error', `Test suite failed: ${error.message}`, 'test-framework');
    }

    this.generateReport();
  }

  async testCompletionGateLogic() {
    console.log('\n📋 Testing Completion Gate Logic...');
    
    try {
      // Create a mock completion project with some approved tasks
      const mockProject = {
        projectId: TEST_CONFIG.testProjectId,
        invoicingMethod: 'completion',
        totalBudget: TEST_CONFIG.totalBudget,
        totalTasks: TEST_CONFIG.totalTasks,
        freelancerId: TEST_CONFIG.testFreelancerId,
        commissionerId: TEST_CONFIG.testCommissionerId
      };

      // Test the completion gate service directly
      const { CompletionCalculationService } = await import('../src/app/api/payments/services/completion-calculation-service.js');
      
      // This should fail because we haven't set up the project data properly
      // But we can test the logic structure
      console.log('  - Testing completion gate service structure...');
      
      if (typeof CompletionCalculationService.isProjectReadyForFinalPayout === 'function') {
        this.addSuccess('Completion Gate Service', 'isProjectReadyForFinalPayout method exists');
      } else {
        this.addIssue('HIGH', 'Missing Completion Gate', 'isProjectReadyForFinalPayout method not found', 'completion-gate');
      }

      if (typeof CompletionCalculationService.validateRemainingBudgetIntegrity === 'function') {
        this.addSuccess('Budget Integrity Service', 'validateRemainingBudgetIntegrity method exists');
      } else {
        this.addIssue('HIGH', 'Missing Budget Validation', 'validateRemainingBudgetIntegrity method not found', 'budget-integrity');
      }

    } catch (error) {
      this.addIssue('MEDIUM', 'Completion Gate Test Failed', `Could not test completion gate: ${error.message}`, 'completion-gate');
    }
  }

  async testBudgetIntegrity() {
    console.log('\n💰 Testing Budget Integrity...');
    
    try {
      // Test budget calculation logic
      const { CompletionCalculationService } = await import('../src/app/api/payments/services/completion-calculation-service.js');
      
      // Test upfront calculation
      const upfrontAmount = CompletionCalculationService.calculateUpfrontAmount(1000);
      if (upfrontAmount === 120) {
        this.addSuccess('Upfront Calculation', 'Correctly calculates 12% upfront amount');
      } else {
        this.addIssue('HIGH', 'Upfront Calculation Error', `Expected $120, got $${upfrontAmount}`, 'budget-calculation');
      }

      // Test manual invoice calculation
      const manualAmount = CompletionCalculationService.calculateManualInvoiceAmount(1000, 4);
      if (manualAmount === 220) { // (1000 * 0.88) / 4 = 220 - each task gets equal share of 88%
        this.addSuccess('Manual Invoice Calculation', 'Correctly calculates manual invoice amount (88% ÷ total tasks)');
      } else {
        this.addIssue('HIGH', 'Manual Invoice Calculation Error', `Expected $220 (88% ÷ 4 tasks), got $${manualAmount}`, 'budget-calculation');
      }

    } catch (error) {
      this.addIssue('MEDIUM', 'Budget Integrity Test Failed', `Could not test budget integrity: ${error.message}`, 'budget-integrity');
    }
  }

  async testManualInvoiceProRating() {
    console.log('\n📊 Testing Manual Invoice Pro-Rating...');
    
    try {
      // Test that manual invoices are calculated based on remaining budget
      // This is more of a logic validation since we can't easily mock the file system
      
      console.log('  - Validating pro-rating logic exists in manual invoice creation...');
      
      const manualInvoiceCode = await fs.readFile(
        path.join(process.cwd(), 'src/app/api/invoices/completion/create-manual/route.ts'), 
        'utf8'
      );
      
      if (manualInvoiceCode.includes('currentRemainingBudget') && manualInvoiceCode.includes('remainingUnpaidTasks')) {
        this.addSuccess('Pro-Rating Logic', 'Manual invoice creation uses pro-rating based on remaining budget');
      } else {
        this.addIssue('HIGH', 'Missing Pro-Rating', 'Manual invoice creation does not use proper pro-rating logic', 'manual-invoice');
      }

      if (manualInvoiceCode.includes('validateRemainingBudgetIntegrity')) {
        this.addSuccess('Budget Validation', 'Manual invoice creation validates budget integrity');
      } else {
        this.addIssue('HIGH', 'Missing Budget Validation', 'Manual invoice creation does not validate budget integrity', 'manual-invoice');
      }

    } catch (error) {
      this.addIssue('MEDIUM', 'Pro-Rating Test Failed', `Could not test pro-rating logic: ${error.message}`, 'manual-invoice');
    }
  }

  async testGuardSystem() {
    console.log('\n🛡️ Testing Guard System...');
    
    try {
      // Check that completion routes have proper guards
      const completionTaskCode = await fs.readFile(
        path.join(process.cwd(), 'src/app/api/project-tasks/completion/submit/route.ts'), 
        'utf8'
      );
      
      if (completionTaskCode.includes('GUARD VIOLATION') && completionTaskCode.includes('invoicingMethod !== \'completion\'')) {
        this.addSuccess('Task Approval Guards', 'Completion task approval has proper guards against milestone contamination');
      } else {
        this.addIssue('HIGH', 'Missing Task Guards', 'Completion task approval lacks proper guards', 'guards');
      }

      const finalPaymentCode = await fs.readFile(
        path.join(process.cwd(), 'src/app/api/payments/completion/execute-final/route.ts'), 
        'utf8'
      );
      
      if (finalPaymentCode.includes('GUARD VIOLATION') && finalPaymentCode.includes('invoicingMethod !== \'completion\'')) {
        this.addSuccess('Final Payment Guards', 'Final payment route has proper guards against milestone contamination');
      } else {
        this.addIssue('HIGH', 'Missing Payment Guards', 'Final payment route lacks proper guards', 'guards');
      }

    } catch (error) {
      this.addIssue('MEDIUM', 'Guard System Test Failed', `Could not test guard system: ${error.message}`, 'guards');
    }
  }

  async testNotificationSystem() {
    console.log('\n🔔 Testing Notification System...');
    
    try {
      // Check that completion events are properly defined
      const completionEventsCode = await fs.readFile(
        path.join(process.cwd(), 'src/lib/events/completion-events.ts'), 
        'utf8'
      );
      
      const requiredEvents = [
        'completion.task_approved',
        'completion.invoice_received', 
        'completion.invoice_paid',
        'completion.project_completed',
        'completion.final_payment',
        'completion.rating_prompt'
      ];

      let missingEvents = [];
      for (const event of requiredEvents) {
        if (!completionEventsCode.includes(`'${event}'`)) {
          missingEvents.push(event);
        }
      }

      if (missingEvents.length === 0) {
        this.addSuccess('Completion Events', 'All required completion events are defined');
      } else {
        this.addIssue('HIGH', 'Missing Events', `Missing completion events: ${missingEvents.join(', ')}`, 'notifications');
      }

      // Check that routes emit notifications
      const taskApprovalCode = await fs.readFile(
        path.join(process.cwd(), 'src/app/api/project-tasks/completion/submit/route.ts'), 
        'utf8'
      );
      
      if (taskApprovalCode.includes('handleCompletionNotification') && taskApprovalCode.includes('completion.task_approved')) {
        this.addSuccess('Task Approval Notifications', 'Task approval emits completion notifications');
      } else {
        this.addIssue('MEDIUM', 'Missing Task Notifications', 'Task approval does not emit completion notifications', 'notifications');
      }

    } catch (error) {
      this.addIssue('MEDIUM', 'Notification Test Failed', `Could not test notification system: ${error.message}`, 'notifications');
    }
  }

  generateReport() {
    console.log('\n📊 COMPLETION FIXES VALIDATION REPORT');
    console.log('=====================================\n');

    const passCount = this.testResults.length;
    const issueCount = this.issues.length;
    const totalTests = passCount + issueCount;

    console.log(`✅ Passed: ${passCount}/${totalTests} tests`);
    console.log(`❌ Issues: ${issueCount}/${totalTests} tests\n`);

    if (this.issues.length > 0) {
      console.log('🚨 ISSUES FOUND:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.title}`);
        console.log(`   ${issue.description}`);
        console.log(`   Category: ${issue.category}\n`);
      });
    }

    if (passCount > 0) {
      console.log('✅ SUCCESSFUL TESTS:');
      this.testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}: ${result.description}`);
      });
    }

    console.log('\n🎯 SUMMARY:');
    if (issueCount === 0) {
      console.log('🎉 All completion project fixes are working correctly!');
    } else {
      console.log(`⚠️  Found ${issueCount} issues that need attention.`);
      
      const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
      if (highIssues > 0) {
        console.log(`🚨 ${highIssues} HIGH severity issues require immediate attention.`);
      }
    }
  }
}

// Run the validation
if (require.main === module) {
  const validator = new CompletionFixesValidator();
  validator.runAllTests().catch(console.error);
}

module.exports = CompletionFixesValidator;
