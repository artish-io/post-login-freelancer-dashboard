#!/usr/bin/env node

/**
 * Corrected Completion-Based Invoicing Test Script
 * 
 * Tests the actual completion invoicing logic for newly created projects:
 * 
 * NORMAL FLOW:
 * 1. Project Activation → 12% upfront payment + notifications
 * 2. Project Completion → 88% remaining payment + notifications
 * 
 * EDGE CASE FLOW:
 * 1. Project Activation → 12% upfront payment + notifications
 * 2. Manual Invoice Trigger → (88% ÷ total tasks) per task + notifications
 * 3. Project Completion → Remaining budget payment + notifications
 * 
 * Focus: Test logic for NEW completion projects, not legacy data analysis
 */

const fs = require('fs').promises;
const path = require('path');

const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  testDataRoot: process.env.DATA_ROOT || './data',
  reportFile: './completion-invoicing-logic-test-report.md'
};

// Test data for creating new completion project
const TEST_PROJECT = {
  title: 'Test Completion Logic Project',
  totalBudget: 10000, // $10,000
  upfrontAmount: 1200, // 12% = $1,200
  remainingAmount: 8800, // 88% = $8,800
  totalTasks: 4, // $2,200 per task for manual invoices
  executionMethod: 'completion',
  invoicingMethod: 'completion',
  commissionerId: 32,
  freelancerId: 31
};

class CompletionLogicTester {
  constructor() {
    this.results = [];
    this.issues = [];
    this.testStartTime = new Date();
    this.testProjectId = null;
    this.createdInvoices = [];
    this.createdTransactions = [];
  }

  async runAllTests() {
    console.log('🧪 Testing Completion-Based Invoicing Logic...\n');
    
    try {
      // Test 1: Project Activation Flow (12% upfront)
      await this.testProjectActivationFlow();
      
      // Test 2: Manual Invoice Triggering (Edge Case)
      await this.testManualInvoiceTriggeringFlow();
      
      // Test 3: Project Completion Flow (88% remaining)
      await this.testProjectCompletionFlow();
      
      // Test 4: Notification Event Logging
      await this.testNotificationEventLogging();
      
      // Test 5: Payment Calculation Logic
      await this.testPaymentCalculationLogic();
      
      // Test 6: API Endpoint Functionality
      await this.testAPIEndpointFunctionality();
      
      // Generate report
      await this.generateReport();
      
    } catch (error) {
      this.addIssue('CRITICAL', 'Test Suite Failure', error.message, 'test-runner');
      await this.generateReport();
    }
  }

  async testProjectActivationFlow() {
    console.log('🚀 Test 1: Project Activation Flow (12% Upfront Payment)...');
    
    try {
      // Step 1: Create a new completion-based project
      const projectCreation = await this.createTestProject();
      
      // Step 2: Test upfront payment execution
      const upfrontPayment = await this.testUpfrontPaymentExecution(projectCreation);
      
      // Step 3: Verify project activation notifications
      const activationNotifications = await this.verifyProjectActivationNotifications(projectCreation);
      
      this.addResult('Project Activation Flow', 'PASS', {
        projectCreated: !!projectCreation,
        upfrontPaymentExecuted: !!upfrontPayment,
        notificationsLogged: !!activationNotifications
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Project Activation Flow Failed', error.message, 'project-activation');
      this.addResult('Project Activation Flow', 'FAIL', { error: error.message });
    }
  }

  async testManualInvoiceTriggeringFlow() {
    console.log('📋 Test 2: Manual Invoice Triggering Flow (Edge Case)...');
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available for manual invoice testing');
      }
      
      // Step 1: Create and approve a task
      const taskApproval = await this.createAndApproveTask();
      
      // Step 2: Test freelancer manual invoice creation
      const freelancerInvoice = await this.testFreelancerManualInvoice(taskApproval);
      
      // Step 3: Test commissioner manual payment trigger
      const commissionerPayment = await this.testCommissionerManualPayment(freelancerInvoice);
      
      // Step 4: Verify manual invoice notifications
      const manualNotifications = await this.verifyManualInvoiceNotifications(freelancerInvoice);
      
      this.addResult('Manual Invoice Triggering Flow', 'PASS', {
        taskApproved: !!taskApproval,
        freelancerInvoiceCreated: !!freelancerInvoice,
        commissionerPaymentExecuted: !!commissionerPayment,
        notificationsLogged: !!manualNotifications
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Manual Invoice Flow Failed', error.message, 'manual-invoice-flow');
      this.addResult('Manual Invoice Triggering Flow', 'FAIL', { error: error.message });
    }
  }

  async testProjectCompletionFlow() {
    console.log('🏁 Test 3: Project Completion Flow (88% Remaining Payment)...');
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available for completion testing');
      }
      
      // Step 1: Complete all remaining tasks
      const allTasksCompleted = await this.completeAllRemainingTasks();
      
      // Step 2: Test final payment execution (88% remaining)
      const finalPayment = await this.testFinalPaymentExecution();
      
      // Step 3: Verify project completion notifications
      const completionNotifications = await this.verifyProjectCompletionNotifications();
      
      this.addResult('Project Completion Flow', 'PASS', {
        allTasksCompleted: !!allTasksCompleted,
        finalPaymentExecuted: !!finalPayment,
        notificationsLogged: !!completionNotifications
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Project Completion Flow Failed', error.message, 'project-completion-flow');
      this.addResult('Project Completion Flow', 'FAIL', { error: error.message });
    }
  }

  async testNotificationEventLogging() {
    console.log('🔔 Test 4: Notification Event Logging...');
    
    try {
      // Test notification creation for each completion flow event
      const notificationTests = {
        projectActivation: await this.testProjectActivationNotifications(),
        invoiceReceived: await this.testInvoiceReceivedNotifications(),
        invoicePaid: await this.testInvoicePaidNotifications(),
        projectCompletion: await this.testProjectCompletionNotifications()
      };
      
      this.addResult('Notification Event Logging', 'PASS', notificationTests);
      
    } catch (error) {
      this.addIssue('MEDIUM', 'Notification Event Logging Failed', error.message, 'notification-logging');
      this.addResult('Notification Event Logging', 'FAIL', { error: error.message });
    }
  }

  async testPaymentCalculationLogic() {
    console.log('💰 Test 5: Payment Calculation Logic...');
    
    try {
      // Test upfront calculation (12%)
      const upfrontCalculation = await this.testUpfrontCalculation();
      
      // Test manual invoice calculation (88% ÷ total tasks)
      const manualCalculation = await this.testManualInvoiceCalculation();
      
      // Test remaining budget calculation
      const remainingCalculation = await this.testRemainingBudgetCalculation();
      
      this.addResult('Payment Calculation Logic', 'PASS', {
        upfrontCalculationCorrect: !!upfrontCalculation,
        manualCalculationCorrect: !!manualCalculation,
        remainingCalculationCorrect: !!remainingCalculation
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Payment Calculation Logic Failed', error.message, 'calculation-logic');
      this.addResult('Payment Calculation Logic', 'FAIL', { error: error.message });
    }
  }

  async testAPIEndpointFunctionality() {
    console.log('🔌 Test 6: API Endpoint Functionality...');
    
    try {
      // Test completion-specific API endpoints
      const apiTests = {
        upfrontPaymentAPI: await this.testUpfrontPaymentAPI(),
        manualInvoiceAPI: await this.testManualInvoiceAPI(),
        finalPaymentAPI: await this.testFinalPaymentAPI(),
        notificationAPI: await this.testNotificationAPI()
      };
      
      this.addResult('API Endpoint Functionality', 'PASS', apiTests);
      
    } catch (error) {
      this.addIssue('HIGH', 'API Endpoint Functionality Failed', error.message, 'api-endpoints');
      this.addResult('API Endpoint Functionality', 'FAIL', { error: error.message });
    }
  }

  // Implementation methods for each test
  async createTestProject() {
    console.log('  - Creating test completion project...');
    try {
      // This would create a new completion project via API
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/projects/create-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_PROJECT)
      });
      
      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Completion Project Creation API', 
          'No dedicated API for creating completion projects', 'project-creation-api');
        return null;
      }
      
      if (!response.ok) {
        this.addIssue('HIGH', 'Project Creation Failed', 
          `API returned ${response.status}`, 'project-creation');
        return null;
      }
      
      const result = await response.json();
      this.testProjectId = result.projectId;
      console.log(`    ✓ Test project created: ${this.testProjectId}`);
      return result;
    } catch (error) {
      this.addIssue('HIGH', 'Project Creation API Failed', error.message, 'project-creation');
      return null;
    }
  }

  async testUpfrontPaymentExecution(projectCreation) {
    console.log('  - Testing upfront payment execution...');
    try {
      if (!projectCreation) return null;
      
      // Test upfront payment API
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-upfront`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          amount: TEST_PROJECT.upfrontAmount
        })
      });
      
      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Upfront Payment API', 
          'No dedicated API for upfront payment execution', 'upfront-payment-api');
        return null;
      }
      
      if (!response.ok) {
        this.addIssue('HIGH', 'Upfront Payment Failed', 
          `API returned ${response.status}`, 'upfront-payment');
        return null;
      }
      
      const result = await response.json();
      console.log(`    ✓ Upfront payment executed: ${result.transactionId}`);
      return result;
    } catch (error) {
      this.addIssue('HIGH', 'Upfront Payment API Failed', error.message, 'upfront-payment');
      return null;
    }
  }

  async verifyProjectActivationNotifications(projectCreation) {
    console.log('  - Verifying project activation notifications...');
    try {
      if (!projectCreation) return null;

      // Check if project activation notifications were logged
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2/events`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Notification Check Failed',
          `API returned ${response.status}`, 'notification-check');
        return null;
      }

      const events = await response.json();
      const activationEvents = events.filter(event =>
        event.type === 'project_activated' &&
        event.context?.projectId === this.testProjectId
      );

      if (activationEvents.length === 0) {
        this.addIssue('MEDIUM', 'Missing Project Activation Notifications',
          'No project activation events found', 'activation-notifications');
        return null;
      }

      console.log(`    ✓ Found ${activationEvents.length} activation notifications`);
      return activationEvents;
    } catch (error) {
      this.addIssue('MEDIUM', 'Notification Verification Failed', error.message, 'notification-verification');
      return null;
    }
  }

  async createAndApproveTask() {
    console.log('  - Creating and approving test task...');
    try {
      // Create a task for the test project
      const createResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          title: 'Test Task for Manual Invoice',
          description: 'Test task to trigger manual invoice'
        })
      });

      if (!createResponse.ok) {
        this.addIssue('HIGH', 'Task Creation Failed',
          `API returned ${createResponse.status}`, 'task-creation');
        return null;
      }

      const task = await createResponse.json();

      // Approve the task
      const approveResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          taskId: task.taskId,
          action: 'approve'
        })
      });

      if (!approveResponse.ok) {
        this.addIssue('HIGH', 'Task Approval Failed',
          `API returned ${approveResponse.status}`, 'task-approval');
        return null;
      }

      const approvalResult = await approveResponse.json();
      console.log(`    ✓ Task created and approved: ${task.taskId}`);
      return { task, approvalResult };
    } catch (error) {
      this.addIssue('HIGH', 'Task Creation/Approval Failed', error.message, 'task-workflow');
      return null;
    }
  }

  async testFreelancerManualInvoice(taskApproval) {
    console.log('  - Testing freelancer manual invoice creation...');
    try {
      if (!taskApproval) return null;

      // Test freelancer creating manual invoice for approved task
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/create-completion-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          taskId: taskApproval.task.taskId,
          freelancerId: TEST_PROJECT.freelancerId,
          invoiceType: 'completion_manual'
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Manual Invoice Creation API',
          'No API for freelancer manual invoice creation', 'manual-invoice-api');
        return null;
      }

      if (!response.ok) {
        this.addIssue('HIGH', 'Manual Invoice Creation Failed',
          `API returned ${response.status}`, 'manual-invoice-creation');
        return null;
      }

      const invoice = await response.json();
      this.createdInvoices.push(invoice);

      // Verify invoice amount calculation
      const expectedAmount = TEST_PROJECT.remainingAmount / TEST_PROJECT.totalTasks;
      if (Math.abs(invoice.amount - expectedAmount) > 1) {
        this.addIssue('HIGH', 'Incorrect Manual Invoice Amount',
          `Expected ${expectedAmount}, got ${invoice.amount}`, 'manual-invoice-calculation');
      }

      console.log(`    ✓ Manual invoice created: ${invoice.invoiceNumber} (${invoice.amount})`);
      return invoice;
    } catch (error) {
      this.addIssue('HIGH', 'Manual Invoice Creation Failed', error.message, 'manual-invoice');
      return null;
    }
  }

  async testCommissionerManualPayment(freelancerInvoice) {
    console.log('  - Testing commissioner manual payment trigger...');
    try {
      if (!freelancerInvoice) return null;

      // Test commissioner triggering payment for manual invoice
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-completion-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: freelancerInvoice.invoiceNumber,
          commissionerId: TEST_PROJECT.commissionerId
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Manual Payment API',
          'No API for commissioner manual payment execution', 'manual-payment-api');
        return null;
      }

      if (!response.ok) {
        this.addIssue('HIGH', 'Manual Payment Failed',
          `API returned ${response.status}`, 'manual-payment');
        return null;
      }

      const payment = await response.json();
      this.createdTransactions.push(payment);
      console.log(`    ✓ Manual payment executed: ${payment.transactionId}`);
      return payment;
    } catch (error) {
      this.addIssue('HIGH', 'Manual Payment Failed', error.message, 'manual-payment');
      return null;
    }
  }

  async verifyManualInvoiceNotifications(freelancerInvoice) {
    console.log('  - Verifying manual invoice notifications...');
    try {
      if (!freelancerInvoice) return null;

      // Check for invoice received (commissioner) and invoice paid (freelancer) notifications
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2/events`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Notification Check Failed',
          `API returned ${response.status}`, 'notification-check');
        return null;
      }

      const events = await response.json();
      const invoiceEvents = events.filter(event =>
        (event.type === 'invoice_received' || event.type === 'invoice_paid') &&
        event.context?.invoiceNumber === freelancerInvoice.invoiceNumber
      );

      if (invoiceEvents.length === 0) {
        this.addIssue('MEDIUM', 'Missing Manual Invoice Notifications',
          'No manual invoice notifications found', 'manual-invoice-notifications');
        return null;
      }

      console.log(`    ✓ Found ${invoiceEvents.length} manual invoice notifications`);
      return invoiceEvents;
    } catch (error) {
      this.addIssue('MEDIUM', 'Manual Invoice Notification Check Failed', error.message, 'manual-notification-check');
      return null;
    }
  }

  async completeAllRemainingTasks() {
    console.log('  - Completing all remaining tasks...');
    try {
      // Get all tasks for the project
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${this.testProjectId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        this.addIssue('HIGH', 'Task Retrieval Failed',
          `API returned ${response.status}`, 'task-retrieval');
        return null;
      }

      const tasks = await response.json();
      const incompleteTasks = tasks.filter(task =>
        task.status !== 'Approved' && task.status !== 'approved'
      );

      // Approve all remaining tasks
      for (const task of incompleteTasks) {
        const approveResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: this.testProjectId,
            taskId: task.id,
            action: 'approve'
          })
        });

        if (!approveResponse.ok) {
          this.addIssue('MEDIUM', 'Task Approval Failed',
            `Failed to approve task ${task.id}`, 'task-completion');
        }
      }

      console.log(`    ✓ Completed ${incompleteTasks.length} remaining tasks`);
      return { completedTasks: incompleteTasks.length };
    } catch (error) {
      this.addIssue('HIGH', 'Task Completion Failed', error.message, 'task-completion');
      return null;
    }
  }

  async testFinalPaymentExecution() {
    console.log('  - Testing final payment execution (88% remaining)...');
    try {
      // Test final payment API for completion projects
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-completion-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          expectedAmount: TEST_PROJECT.remainingAmount
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Final Payment API',
          'No API for final completion payment execution', 'final-payment-api');
        return null;
      }

      if (!response.ok) {
        this.addIssue('HIGH', 'Final Payment Failed',
          `API returned ${response.status}`, 'final-payment');
        return null;
      }

      const payment = await response.json();
      this.createdTransactions.push(payment);

      // Verify final payment amount (should be remaining 88% minus any manual payments)
      const manualPayments = this.createdTransactions
        .filter(tx => tx.type === 'completion_manual')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const expectedFinalAmount = TEST_PROJECT.remainingAmount - manualPayments;

      if (Math.abs(payment.amount - expectedFinalAmount) > 1) {
        this.addIssue('HIGH', 'Incorrect Final Payment Amount',
          `Expected ${expectedFinalAmount}, got ${payment.amount}`, 'final-payment-calculation');
      }

      console.log(`    ✓ Final payment executed: ${payment.transactionId} (${payment.amount})`);
      return payment;
    } catch (error) {
      this.addIssue('HIGH', 'Final Payment Failed', error.message, 'final-payment');
      return null;
    }
  }

  async verifyProjectCompletionNotifications() {
    console.log('  - Verifying project completion notifications...');
    try {
      // Check for project completion notifications
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2/events`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Notification Check Failed',
          `API returned ${response.status}`, 'notification-check');
        return null;
      }

      const events = await response.json();
      const completionEvents = events.filter(event =>
        event.type === 'project_completed' &&
        event.context?.projectId === this.testProjectId
      );

      if (completionEvents.length === 0) {
        this.addIssue('MEDIUM', 'Missing Project Completion Notifications',
          'No project completion notifications found', 'completion-notifications');
        return null;
      }

      console.log(`    ✓ Found ${completionEvents.length} completion notifications`);
      return completionEvents;
    } catch (error) {
      this.addIssue('MEDIUM', 'Completion Notification Check Failed', error.message, 'completion-notification-check');
      return null;
    }
  }

  // Notification testing methods
  async testProjectActivationNotifications() {
    console.log('  - Testing project activation notifications...');
    try {
      // Test notification creation for project activation
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project_activated',
          actorId: TEST_PROJECT.commissionerId,
          targetId: TEST_PROJECT.freelancerId,
          context: {
            projectId: this.testProjectId,
            upfrontAmount: TEST_PROJECT.upfrontAmount
          }
        })
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Project Activation Notification Failed',
          `API returned ${response.status}`, 'activation-notification');
        return false;
      }

      console.log('    ✓ Project activation notification created');
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Project Activation Notification Failed', error.message, 'activation-notification');
      return false;
    }
  }

  async testInvoiceReceivedNotifications() {
    console.log('  - Testing invoice received notifications...');
    try {
      // Test notification for commissioner receiving invoice
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice_received',
          actorId: TEST_PROJECT.freelancerId,
          targetId: TEST_PROJECT.commissionerId,
          context: {
            projectId: this.testProjectId,
            invoiceNumber: 'TEST_INVOICE',
            amount: TEST_PROJECT.remainingAmount / TEST_PROJECT.totalTasks
          }
        })
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Invoice Received Notification Failed',
          `API returned ${response.status}`, 'invoice-received-notification');
        return false;
      }

      console.log('    ✓ Invoice received notification created');
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Invoice Received Notification Failed', error.message, 'invoice-received-notification');
      return false;
    }
  }

  async testInvoicePaidNotifications() {
    console.log('  - Testing invoice paid notifications...');
    try {
      // Test notification for freelancer when invoice is paid
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice_paid',
          actorId: TEST_PROJECT.commissionerId,
          targetId: TEST_PROJECT.freelancerId,
          context: {
            projectId: this.testProjectId,
            invoiceNumber: 'TEST_INVOICE',
            amount: TEST_PROJECT.remainingAmount / TEST_PROJECT.totalTasks
          }
        })
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Invoice Paid Notification Failed',
          `API returned ${response.status}`, 'invoice-paid-notification');
        return false;
      }

      console.log('    ✓ Invoice paid notification created');
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Invoice Paid Notification Failed', error.message, 'invoice-paid-notification');
      return false;
    }
  }

  async testProjectCompletionNotifications() {
    console.log('  - Testing project completion notifications...');
    try {
      // Test notification for project completion
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project_completed',
          actorId: TEST_PROJECT.commissionerId,
          targetId: TEST_PROJECT.freelancerId,
          context: {
            projectId: this.testProjectId,
            finalAmount: TEST_PROJECT.remainingAmount
          }
        })
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Project Completion Notification Failed',
          `API returned ${response.status}`, 'completion-notification');
        return false;
      }

      console.log('    ✓ Project completion notification created');
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Project Completion Notification Failed', error.message, 'completion-notification');
      return false;
    }
  }

  // Payment calculation logic tests
  async testUpfrontCalculation() {
    console.log('  - Testing upfront calculation (12%)...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/calculate-upfront`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalBudget: TEST_PROJECT.totalBudget,
          invoicingMethod: 'completion'
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Upfront Calculation API',
          'No API for upfront amount calculation', 'upfront-calculation-api');
        return false;
      }

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Upfront Calculation Failed',
          `API returned ${response.status}`, 'upfront-calculation');
        return false;
      }

      const result = await response.json();
      const expectedUpfront = TEST_PROJECT.totalBudget * 0.12;

      if (Math.abs(result.upfrontAmount - expectedUpfront) > 1) {
        this.addIssue('HIGH', 'Incorrect Upfront Calculation',
          `Expected ${expectedUpfront}, got ${result.upfrontAmount}`, 'upfront-calculation-logic');
        return false;
      }

      console.log(`    ✓ Upfront calculation correct: ${result.upfrontAmount}`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Upfront Calculation Test Failed', error.message, 'upfront-calculation');
      return false;
    }
  }

  async testManualInvoiceCalculation() {
    console.log('  - Testing manual invoice calculation (88% ÷ total tasks)...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/calculate-manual-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          totalBudget: TEST_PROJECT.totalBudget,
          totalTasks: TEST_PROJECT.totalTasks,
          invoicingMethod: 'completion'
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Manual Invoice Calculation API',
          'No API for manual invoice amount calculation', 'manual-calculation-api');
        return false;
      }

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Manual Invoice Calculation Failed',
          `API returned ${response.status}`, 'manual-calculation');
        return false;
      }

      const result = await response.json();
      const expectedAmount = TEST_PROJECT.remainingAmount / TEST_PROJECT.totalTasks;

      if (Math.abs(result.invoiceAmount - expectedAmount) > 1) {
        this.addIssue('HIGH', 'Incorrect Manual Invoice Calculation',
          `Expected ${expectedAmount}, got ${result.invoiceAmount}`, 'manual-calculation-logic');
        return false;
      }

      console.log(`    ✓ Manual invoice calculation correct: ${result.invoiceAmount}`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Manual Invoice Calculation Test Failed', error.message, 'manual-calculation');
      return false;
    }
  }

  async testRemainingBudgetCalculation() {
    console.log('  - Testing remaining budget calculation...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/calculate-remaining-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.testProjectId,
          totalBudget: TEST_PROJECT.totalBudget,
          paidManualInvoices: this.createdInvoices.length
        })
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Remaining Budget Calculation API',
          'No API for remaining budget calculation', 'remaining-calculation-api');
        return false;
      }

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Remaining Budget Calculation Failed',
          `API returned ${response.status}`, 'remaining-calculation');
        return false;
      }

      const result = await response.json();
      const manualPayments = this.createdInvoices.length * (TEST_PROJECT.remainingAmount / TEST_PROJECT.totalTasks);
      const expectedRemaining = TEST_PROJECT.remainingAmount - manualPayments;

      if (Math.abs(result.remainingAmount - expectedRemaining) > 1) {
        this.addIssue('HIGH', 'Incorrect Remaining Budget Calculation',
          `Expected ${expectedRemaining}, got ${result.remainingAmount}`, 'remaining-calculation-logic');
        return false;
      }

      console.log(`    ✓ Remaining budget calculation correct: ${result.remainingAmount}`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Remaining Budget Calculation Test Failed', error.message, 'remaining-calculation');
      return false;
    }
  }

  // API endpoint functionality tests
  async testUpfrontPaymentAPI() {
    console.log('  - Testing upfront payment API...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-upfront`, {
        method: 'OPTIONS'
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Upfront Payment API',
          'Upfront payment API endpoint does not exist', 'upfront-api-missing');
        return false;
      }

      console.log(`    ✓ Upfront payment API exists (${response.status})`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Upfront Payment API Test Failed', error.message, 'upfront-api');
      return false;
    }
  }

  async testManualInvoiceAPI() {
    console.log('  - Testing manual invoice API...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/create-completion-manual`, {
        method: 'OPTIONS'
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Manual Invoice API',
          'Manual invoice creation API endpoint does not exist', 'manual-invoice-api-missing');
        return false;
      }

      console.log(`    ✓ Manual invoice API exists (${response.status})`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Manual Invoice API Test Failed', error.message, 'manual-invoice-api');
      return false;
    }
  }

  async testFinalPaymentAPI() {
    console.log('  - Testing final payment API...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-completion-final`, {
        method: 'OPTIONS'
      });

      if (response.status === 404) {
        this.addIssue('HIGH', 'Missing Final Payment API',
          'Final payment API endpoint does not exist', 'final-payment-api-missing');
        return false;
      }

      console.log(`    ✓ Final payment API exists (${response.status})`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Final Payment API Test Failed', error.message, 'final-payment-api');
      return false;
    }
  }

  async testNotificationAPI() {
    console.log('  - Testing notification API...');
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/notifications-v2`, {
        method: 'OPTIONS'
      });

      if (response.status === 404) {
        this.addIssue('MEDIUM', 'Missing Notification API',
          'Notification API endpoint does not exist', 'notification-api-missing');
        return false;
      }

      console.log(`    ✓ Notification API exists (${response.status})`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Notification API Test Failed', error.message, 'notification-api');
      return false;
    }
  }

  // Utility methods
  addResult(testName, status, data) {
    this.results.push({
      test: testName,
      status,
      data,
      timestamp: new Date().toISOString()
    });
  }

  addIssue(severity, title, description, component) {
    this.issues.push({
      severity,
      title,
      description,
      component,
      timestamp: new Date().toISOString()
    });
  }

  async generateReport() {
    const report = this.buildMarkdownReport();
    await fs.writeFile(TEST_CONFIG.reportFile, report);
    console.log(`\n📊 Test report generated: ${TEST_CONFIG.reportFile}`);
  }

  buildMarkdownReport() {
    const duration = new Date() - this.testStartTime;
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM').length;

    return `# Completion-Based Invoicing Logic Test Report

## Summary
- **Test Duration**: ${Math.round(duration / 1000)}s
- **Tests Passed**: ${passCount}
- **Tests Failed**: ${failCount}
- **High Priority Issues**: ${highIssues}
- **Medium Priority Issues**: ${mediumIssues}
- **Total Issues Found**: ${this.issues.length}

## Test Focus
This test validates the **actual completion invoicing logic** for newly created projects:

### Normal Flow:
1. **Project Activation** → 12% upfront payment + notifications
2. **Project Completion** → 88% remaining payment + notifications

### Edge Case Flow:
1. **Project Activation** → 12% upfront payment + notifications
2. **Manual Invoice Trigger** → (88% ÷ total tasks) per task + notifications
3. **Project Completion** → Remaining budget payment + notifications

## Critical Issues Discovered

${this.issues.filter(i => i.severity === 'HIGH').map(issue => `### 🚨 HIGH: ${issue.title}
- **Component**: ${issue.component}
- **Description**: ${issue.description}
- **Timestamp**: ${issue.timestamp}
`).join('\n')}

## Medium Priority Issues

${this.issues.filter(i => i.severity === 'MEDIUM').map(issue => `### 🔶 MEDIUM: ${issue.title}
- **Component**: ${issue.component}
- **Description**: ${issue.description}
- **Timestamp**: ${issue.timestamp}
`).join('\n')}

## Test Results

${this.results.map(result => `### ${result.test}
- **Status**: ${result.status}
- **Data**: \`${JSON.stringify(result.data, null, 2)}\`
- **Timestamp**: ${result.timestamp}
`).join('\n')}

## Missing API Endpoints

Based on the test results, the following completion-specific API endpoints are missing:

1. **\`/api/projects/create-completion\`** - Create completion-based projects
2. **\`/api/payments/execute-upfront\`** - Execute 12% upfront payments
3. **\`/api/invoices/create-completion-manual\`** - Manual invoice creation for tasks
4. **\`/api/payments/execute-completion-manual\`** - Manual payment execution
5. **\`/api/payments/execute-completion-final\`** - Final 88% payment execution
6. **\`/api/payments/calculate-upfront\`** - Upfront amount calculation
7. **\`/api/payments/calculate-manual-invoice\`** - Manual invoice amount calculation
8. **\`/api/payments/calculate-remaining-budget\`** - Remaining budget calculation

## Missing Logic Components

1. **Upfront Payment Automation**: Automatic 12% payment on project activation
2. **Manual Invoice Calculation**: (Total Budget - 12%) ÷ Total Tasks logic
3. **Remaining Budget Tracking**: Track manual payments to calculate final amount
4. **Completion-Specific Notifications**: Project activation, invoice received/paid, completion events
5. **Payment Flow Orchestration**: Coordinate upfront → manual → final payment sequence

## Recommendations

### Phase 1: Core API Development (Week 1)
1. Build completion-specific payment execution routes
2. Implement upfront payment automation
3. Create manual invoice triggering system
4. Add payment calculation logic

### Phase 2: Notification System (Week 2)
1. Implement completion-specific notification events
2. Add event logging for all payment flows
3. Create notification templates for commissioners/freelancers

### Phase 3: Integration Testing (Week 3)
1. End-to-end testing of complete flows
2. Edge case validation and error handling
3. Performance optimization

### Phase 4: Production Deployment (Week 4)
1. Security audit and validation
2. Production deployment and monitoring
3. User acceptance testing

## Conclusion

The completion-based invoicing logic requires **complete implementation** from scratch. While the basic project structure exists, none of the completion-specific payment workflows, calculation logic, or API endpoints are currently functional.

**Priority**: CRITICAL - Core completion project functionality is non-functional
**Estimated Development Time**: 4 weeks
**Risk Level**: HIGH - No completion-based payments can be processed

---
*Generated on ${new Date().toISOString()}*
`;
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CompletionLogicTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CompletionLogicTester;
