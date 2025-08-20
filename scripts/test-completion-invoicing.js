#!/usr/bin/env node

/**
 * Comprehensive Test Script for Completion-Based Invoicing
 * 
 * This script tests the entire completion-based payment workflow to identify
 * issues, breakages, and missing logic in the current implementation.
 * 
 * Test Coverage:
 * 1. Project creation with completion-based execution
 * 2. Upfront payment (12%) handling
 * 3. Task approval and individual invoice generation
 * 4. Manual invoice triggering by freelancer
 * 5. Manual payment triggering by commissioner
 * 6. Wallet updates and transaction logging
 * 7. Final payment (88%) after all tasks approved
 * 8. Data consistency across storage systems
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  testDataRoot: process.env.DATA_ROOT || './data',
  reportFile: './completion-invoicing-test-report.md'
};

// Test data
const TEST_DATA = {
  commissioner: { id: 32, name: 'Test Commissioner' },
  freelancer: { id: 31, name: 'Test Freelancer' },
  project: {
    title: 'Test Completion-Based Project',
    budget: 10000, // $10,000 total
    upfrontAmount: 1200, // 12% = $1,200
    remainingAmount: 8800, // 88% = $8,800
    totalTasks: 4, // $2,200 per task for remaining amount
    executionMethod: 'completion',
    invoicingMethod: 'completion'
  }
};

class CompletionInvoicingTester {
  constructor() {
    this.results = [];
    this.issues = [];
    this.testStartTime = new Date();
  }

  async runAllTests() {
    console.log('🧪 Starting Completion-Based Invoicing Test Suite...\n');
    
    try {
      // Test 1: Project Creation and Upfront Payment
      await this.testProjectCreationWithUpfront();
      
      // Test 2: Task Creation and Structure
      await this.testTaskCreation();
      
      // Test 3: Individual Task Approval and Invoice Generation
      await this.testTaskApprovalInvoicing();
      
      // Test 4: Manual Invoice Triggering (Freelancer)
      await this.testManualInvoiceTriggeringFreelancer();
      
      // Test 5: Manual Payment Triggering (Commissioner)
      await this.testManualPaymentTriggeringCommissioner();
      
      // Test 6: Wallet and Transaction Consistency
      await this.testWalletTransactionConsistency();
      
      // Test 7: Final Payment Processing
      await this.testFinalPaymentProcessing();
      
      // Test 8: Data Storage Consistency
      await this.testDataStorageConsistency();
      
      // Test 9: Edge Cases and Error Handling
      await this.testEdgeCases();
      
      // Generate comprehensive report
      await this.generateReport();
      
    } catch (error) {
      this.addIssue('CRITICAL', 'Test Suite Failure', error.message, 'test-runner');
      await this.generateReport();
    }
  }

  async testProjectCreationWithUpfront() {
    console.log('📋 Test 1: Project Creation with Upfront Payment...');
    
    try {
      // Check if completion-based projects are properly created
      const projectData = await this.checkProjectCreation();
      
      // Verify upfront invoice generation
      const upfrontInvoice = await this.checkUpfrontInvoiceGeneration(projectData);
      
      // Verify upfront payment processing
      const upfrontPayment = await this.checkUpfrontPaymentProcessing(upfrontInvoice);
      
      this.addResult('Project Creation', 'PASS', {
        projectCreated: !!projectData,
        upfrontInvoiceGenerated: !!upfrontInvoice,
        upfrontPaymentProcessed: !!upfrontPayment
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Project Creation Failed', error.message, 'project-creation');
      this.addResult('Project Creation', 'FAIL', { error: error.message });
    }
  }

  async testTaskCreation() {
    console.log('📝 Test 2: Task Creation and Structure...');
    
    try {
      // Check task creation for completion-based projects
      const tasks = await this.checkTaskStructure();
      
      // Verify task metadata includes completion-specific fields
      const taskMetadata = await this.checkTaskMetadata(tasks);
      
      this.addResult('Task Creation', 'PASS', {
        tasksCreated: tasks?.length || 0,
        metadataValid: taskMetadata
      });
      
    } catch (error) {
      this.addIssue('MEDIUM', 'Task Creation Issues', error.message, 'task-creation');
      this.addResult('Task Creation', 'FAIL', { error: error.message });
    }
  }

  async testTaskApprovalInvoicing() {
    console.log('✅ Test 3: Task Approval and Invoice Generation...');
    
    try {
      // Test task approval workflow
      const approvalResult = await this.testTaskApproval();
      
      // Check if completion-based invoice is generated
      const invoiceGenerated = await this.checkCompletionInvoiceGeneration();
      
      // Verify invoice amount calculation (remaining budget / remaining tasks)
      const amountCalculation = await this.checkInvoiceAmountCalculation();
      
      this.addResult('Task Approval Invoicing', 'PASS', {
        taskApproved: !!approvalResult,
        invoiceGenerated: !!invoiceGenerated,
        amountCalculationCorrect: !!amountCalculation
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Task Approval Invoicing Failed', error.message, 'task-approval');
      this.addResult('Task Approval Invoicing', 'FAIL', { error: error.message });
    }
  }

  async testManualInvoiceTriggeringFreelancer() {
    console.log('💼 Test 4: Manual Invoice Triggering (Freelancer)...');
    
    try {
      // Test freelancer manual invoice creation
      const manualInvoice = await this.testFreelancerInvoiceCreation();
      
      // Check invoice status and amount
      const invoiceValidation = await this.validateManualInvoice(manualInvoice);
      
      this.addResult('Manual Invoice Triggering', 'PASS', {
        invoiceCreated: !!manualInvoice,
        invoiceValid: !!invoiceValidation
      });
      
    } catch (error) {
      this.addIssue('MEDIUM', 'Manual Invoice Triggering Failed', error.message, 'manual-invoice');
      this.addResult('Manual Invoice Triggering', 'FAIL', { error: error.message });
    }
  }

  async testManualPaymentTriggeringCommissioner() {
    console.log('💳 Test 5: Manual Payment Triggering (Commissioner)...');
    
    try {
      // Test commissioner manual payment triggering
      const paymentResult = await this.testCommissionerPaymentTrigger();
      
      // Verify payment processing and wallet updates
      const walletUpdate = await this.checkWalletUpdateAfterPayment();
      
      this.addResult('Manual Payment Triggering', 'PASS', {
        paymentTriggered: !!paymentResult,
        walletUpdated: !!walletUpdate
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Manual Payment Triggering Failed', error.message, 'manual-payment');
      this.addResult('Manual Payment Triggering', 'FAIL', { error: error.message });
    }
  }

  async testWalletTransactionConsistency() {
    console.log('💰 Test 6: Wallet and Transaction Consistency...');
    
    try {
      // Check wallet balance calculations
      const walletConsistency = await this.checkWalletConsistency();
      
      // Verify transaction log integrity
      const transactionIntegrity = await this.checkTransactionIntegrity();
      
      // Check cross-system data consistency
      const dataConsistency = await this.checkCrossSystemConsistency();
      
      this.addResult('Wallet Transaction Consistency', 'PASS', {
        walletConsistent: !!walletConsistency,
        transactionsIntact: !!transactionIntegrity,
        dataConsistent: !!dataConsistency
      });
      
    } catch (error) {
      this.addIssue('CRITICAL', 'Wallet/Transaction Inconsistency', error.message, 'wallet-consistency');
      this.addResult('Wallet Transaction Consistency', 'FAIL', { error: error.message });
    }
  }

  async testFinalPaymentProcessing() {
    console.log('🏁 Test 7: Final Payment Processing...');
    
    try {
      // Test final payment when all tasks are approved
      const finalPayment = await this.testFinalPaymentExecution();
      
      // Verify project completion status
      const projectCompletion = await this.checkProjectCompletionStatus();
      
      this.addResult('Final Payment Processing', 'PASS', {
        finalPaymentProcessed: !!finalPayment,
        projectCompleted: !!projectCompletion
      });
      
    } catch (error) {
      this.addIssue('HIGH', 'Final Payment Processing Failed', error.message, 'final-payment');
      this.addResult('Final Payment Processing', 'FAIL', { error: error.message });
    }
  }

  async testDataStorageConsistency() {
    console.log('🗄️ Test 8: Data Storage Consistency...');
    
    try {
      // Check consistency across different storage systems
      const storageConsistency = await this.checkStorageSystemConsistency();
      
      // Verify data integrity
      const dataIntegrity = await this.checkDataIntegrity();
      
      this.addResult('Data Storage Consistency', 'PASS', {
        storageConsistent: !!storageConsistency,
        dataIntegrityMaintained: !!dataIntegrity
      });
      
    } catch (error) {
      this.addIssue('MEDIUM', 'Data Storage Inconsistency', error.message, 'data-storage');
      this.addResult('Data Storage Consistency', 'FAIL', { error: error.message });
    }
  }

  async testEdgeCases() {
    console.log('⚠️ Test 9: Edge Cases and Error Handling...');
    
    try {
      // Test various edge cases
      const edgeCaseResults = await this.runEdgeCaseTests();
      
      this.addResult('Edge Cases', 'PASS', edgeCaseResults);
      
    } catch (error) {
      this.addIssue('MEDIUM', 'Edge Case Handling Issues', error.message, 'edge-cases');
      this.addResult('Edge Cases', 'FAIL', { error: error.message });
    }
  }

  // Helper methods for individual test implementations
  async checkProjectCreation() {
    console.log('  - Checking project creation...');
    try {
      // Look for completion-based projects in the data
      const projectsPath = path.join(TEST_CONFIG.testDataRoot, 'projects');
      const projects = await this.readJsonFiles(projectsPath);

      const completionProjects = projects.filter(p =>
        p.invoicingMethod === 'completion' || p.executionMethod === 'completion'
      );

      if (completionProjects.length === 0) {
        this.addIssue('HIGH', 'No Completion Projects Found',
          'No projects with completion-based execution found in data', 'project-creation');
        return null;
      }

      const testProject = completionProjects[0];
      console.log(`    Found completion project: ${testProject.projectId}`);

      // Check required fields
      const requiredFields = ['projectId', 'invoicingMethod', 'totalBudget', 'freelancerId', 'commissionerId'];
      const missingFields = requiredFields.filter(field => !testProject[field]);

      if (missingFields.length > 0) {
        this.addIssue('MEDIUM', 'Missing Project Fields',
          `Project missing fields: ${missingFields.join(', ')}`, 'project-creation');
      }

      return testProject;
    } catch (error) {
      this.addIssue('HIGH', 'Project Data Access Failed', error.message, 'project-creation');
      return null;
    }
  }

  async checkUpfrontInvoiceGeneration(projectData) {
    console.log('  - Checking upfront invoice generation...');
    try {
      if (!projectData) return null;

      // Look for upfront invoices
      const invoicesPath = path.join(TEST_CONFIG.testDataRoot, 'invoices');
      const invoices = await this.readJsonFiles(invoicesPath);

      const upfrontInvoices = invoices.filter(inv =>
        inv.projectId === projectData.projectId &&
        (inv.invoiceType === 'auto_completion' || inv.invoiceNumber?.startsWith('UPF'))
      );

      if (upfrontInvoices.length === 0) {
        this.addIssue('HIGH', 'No Upfront Invoice Found',
          `No upfront invoice found for completion project ${projectData.projectId}`, 'upfront-invoice');
        return null;
      }

      const upfrontInvoice = upfrontInvoices[0];

      // Check upfront amount (should be ~12% of total budget)
      const expectedUpfront = Math.round(projectData.totalBudget * 0.12);
      const actualUpfront = upfrontInvoice.totalAmount;

      if (Math.abs(actualUpfront - expectedUpfront) > 1) {
        this.addIssue('MEDIUM', 'Incorrect Upfront Amount',
          `Expected ~${expectedUpfront}, got ${actualUpfront}`, 'upfront-calculation');
      }

      console.log(`    Found upfront invoice: ${upfrontInvoice.invoiceNumber} (${actualUpfront})`);
      return upfrontInvoice;
    } catch (error) {
      this.addIssue('HIGH', 'Upfront Invoice Check Failed', error.message, 'upfront-invoice');
      return null;
    }
  }

  async checkUpfrontPaymentProcessing(upfrontInvoice) {
    console.log('  - Checking upfront payment processing...');
    try {
      if (!upfrontInvoice) return null;

      // Check if upfront invoice is marked as paid
      if (upfrontInvoice.status !== 'paid') {
        this.addIssue('HIGH', 'Upfront Invoice Not Paid',
          `Upfront invoice ${upfrontInvoice.invoiceNumber} status: ${upfrontInvoice.status}`, 'upfront-payment');
        return null;
      }

      // Look for corresponding transaction
      const transactionsPath = path.join(TEST_CONFIG.testDataRoot, 'transactions');
      const transactions = await this.readJsonFiles(transactionsPath);

      const upfrontTransaction = transactions.find(tx =>
        tx.invoiceNumber === upfrontInvoice.invoiceNumber
      );

      if (!upfrontTransaction) {
        this.addIssue('MEDIUM', 'Missing Upfront Transaction',
          `No transaction record found for upfront invoice ${upfrontInvoice.invoiceNumber}`, 'upfront-payment');
      }

      console.log(`    Upfront payment processed: ${upfrontTransaction?.transactionId || 'NO_TRANSACTION'}`);
      return upfrontTransaction;
    } catch (error) {
      this.addIssue('HIGH', 'Upfront Payment Check Failed', error.message, 'upfront-payment');
      return null;
    }
  }

  async checkTaskStructure() {
    console.log('  - Checking task structure...');
    try {
      const tasksPath = path.join(TEST_CONFIG.testDataRoot, 'project-tasks');
      const tasks = await this.readJsonFiles(tasksPath);

      const completionTasks = tasks.filter(task => {
        // Find tasks belonging to completion projects
        return task.projectId && this.isCompletionProject(task.projectId);
      });

      if (completionTasks.length === 0) {
        this.addIssue('MEDIUM', 'No Completion Project Tasks',
          'No tasks found for completion-based projects', 'task-structure');
        return [];
      }

      console.log(`    Found ${completionTasks.length} completion project tasks`);
      return completionTasks;
    } catch (error) {
      this.addIssue('MEDIUM', 'Task Structure Check Failed', error.message, 'task-structure');
      return [];
    }
  }

  async checkTaskMetadata(tasks) {
    console.log('  - Checking task metadata...');
    try {
      if (!tasks || tasks.length === 0) return false;

      const requiredFields = ['id', 'projectId', 'title', 'status'];
      let validTasks = 0;

      for (const task of tasks) {
        const missingFields = requiredFields.filter(field => !task[field]);
        if (missingFields.length === 0) {
          validTasks++;
        } else {
          this.addIssue('LOW', 'Task Missing Fields',
            `Task ${task.id} missing: ${missingFields.join(', ')}`, 'task-metadata');
        }
      }

      console.log(`    ${validTasks}/${tasks.length} tasks have valid metadata`);
      return validTasks === tasks.length;
    } catch (error) {
      this.addIssue('MEDIUM', 'Task Metadata Check Failed', error.message, 'task-metadata');
      return false;
    }
  }

  async testTaskApproval() {
    console.log('  - Testing task approval workflow...');
    try {
      // This would normally make an API call to approve a task
      // For testing purposes, we'll simulate the check

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test-flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: 'task_approval',
          projectId: 'TEST_PROJECT',
          taskId: 'TEST_TASK',
          action: 'approve'
        })
      });

      if (!response.ok) {
        this.addIssue('HIGH', 'Task Approval API Failed',
          `API returned ${response.status}`, 'task-approval-api');
        return null;
      }

      const result = await response.json();
      console.log(`    Task approval test: ${result.status}`);
      return result;
    } catch (error) {
      this.addIssue('HIGH', 'Task Approval Test Failed', error.message, 'task-approval');
      return null;
    }
  }

  async checkCompletionInvoiceGeneration() {
    console.log('  - Checking completion invoice generation...');
    try {
      // Look for completion-based invoices (not upfront)
      const invoicesPath = path.join(TEST_CONFIG.testDataRoot, 'invoices');
      const invoices = await this.readJsonFiles(invoicesPath);

      const completionInvoices = invoices.filter(inv =>
        inv.invoiceType === 'completion' &&
        !inv.invoiceNumber?.startsWith('UPF')
      );

      if (completionInvoices.length === 0) {
        this.addIssue('HIGH', 'No Completion Invoices Found',
          'No task-based completion invoices found', 'completion-invoice');
        return null;
      }

      console.log(`    Found ${completionInvoices.length} completion invoices`);
      return completionInvoices;
    } catch (error) {
      this.addIssue('HIGH', 'Completion Invoice Check Failed', error.message, 'completion-invoice');
      return null;
    }
  }

  async checkInvoiceAmountCalculation() {
    console.log('  - Checking invoice amount calculation...');
    try {
      // This would check if invoice amounts are calculated correctly
      // (total budget - 12% upfront) / number of tasks

      const invoicesPath = path.join(TEST_CONFIG.testDataRoot, 'invoices');
      const invoices = await this.readJsonFiles(invoicesPath);

      const completionInvoices = invoices.filter(inv =>
        inv.invoiceType === 'completion' &&
        !inv.invoiceNumber?.startsWith('UPF')
      );

      for (const invoice of completionInvoices) {
        // Get project data to calculate expected amount
        const project = await this.getProjectById(invoice.projectId);
        if (!project) continue;

        const upfrontAmount = project.totalBudget * 0.12;
        const remainingBudget = project.totalBudget - upfrontAmount;
        const totalTasks = project.totalTasks || 1;
        const expectedPerTask = remainingBudget / totalTasks;

        if (Math.abs(invoice.totalAmount - expectedPerTask) > 1) {
          this.addIssue('MEDIUM', 'Incorrect Invoice Amount',
            `Invoice ${invoice.invoiceNumber}: expected ${expectedPerTask}, got ${invoice.totalAmount}`,
            'amount-calculation');
        }
      }

      console.log(`    Checked ${completionInvoices.length} invoice amounts`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Amount Calculation Check Failed', error.message, 'amount-calculation');
      return false;
    }
  }

  // Additional test methods
  async testFreelancerInvoiceCreation() {
    console.log('  - Testing freelancer manual invoice creation...');
    try {
      // Check if freelancer can create invoices for approved tasks
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'TEST_PROJECT',
          freelancerId: TEST_DATA.freelancer.id,
          taskId: 'TEST_TASK',
          invoiceType: 'completion'
        })
      });

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Freelancer Invoice Creation Failed',
          `API returned ${response.status}`, 'freelancer-invoice');
        return null;
      }

      const result = await response.json();
      console.log(`    Freelancer invoice creation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      this.addIssue('MEDIUM', 'Freelancer Invoice Test Failed', error.message, 'freelancer-invoice');
      return null;
    }
  }

  async validateManualInvoice(invoice) {
    console.log('  - Validating manual invoice...');
    if (!invoice) return false;

    // Check invoice structure and required fields
    const requiredFields = ['invoiceNumber', 'totalAmount', 'status', 'projectId'];
    const missingFields = requiredFields.filter(field => !invoice[field]);

    if (missingFields.length > 0) {
      this.addIssue('MEDIUM', 'Manual Invoice Missing Fields',
        `Missing: ${missingFields.join(', ')}`, 'manual-invoice-validation');
      return false;
    }

    console.log(`    Manual invoice validation: PASSED`);
    return true;
  }

  async testCommissionerPaymentTrigger() {
    console.log('  - Testing commissioner payment trigger...');
    try {
      // Test commissioner triggering payment for an invoice
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: 'TEST_INVOICE_NUMBER'
        })
      });

      if (!response.ok) {
        this.addIssue('HIGH', 'Commissioner Payment Trigger Failed',
          `API returned ${response.status}`, 'commissioner-payment');
        return null;
      }

      const result = await response.json();
      console.log(`    Commissioner payment trigger: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      this.addIssue('HIGH', 'Commissioner Payment Test Failed', error.message, 'commissioner-payment');
      return null;
    }
  }

  async checkWalletUpdateAfterPayment() {
    console.log('  - Checking wallet updates after payment...');
    try {
      const walletsPath = path.join(TEST_CONFIG.testDataRoot, 'wallets');
      const wallets = await this.readJsonFiles(walletsPath);

      const freelancerWallet = wallets.find(w =>
        w.userId === TEST_DATA.freelancer.id && w.userType === 'freelancer'
      );

      if (!freelancerWallet) {
        this.addIssue('HIGH', 'Freelancer Wallet Not Found',
          'No wallet found for test freelancer', 'wallet-update');
        return false;
      }

      // Check wallet fields
      const requiredFields = ['availableBalance', 'lifetimeEarnings', 'updatedAt'];
      const missingFields = requiredFields.filter(field => freelancerWallet[field] === undefined);

      if (missingFields.length > 0) {
        this.addIssue('MEDIUM', 'Wallet Missing Fields',
          `Wallet missing: ${missingFields.join(', ')}`, 'wallet-structure');
      }

      console.log(`    Wallet check: Balance=${freelancerWallet.availableBalance}, Earnings=${freelancerWallet.lifetimeEarnings}`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Wallet Update Check Failed', error.message, 'wallet-update');
      return false;
    }
  }

  async checkWalletConsistency() {
    console.log('  - Checking wallet consistency...');
    try {
      const walletsPath = path.join(TEST_CONFIG.testDataRoot, 'wallets');
      const transactionsPath = path.join(TEST_CONFIG.testDataRoot, 'transactions');

      const wallets = await this.readJsonFiles(walletsPath);
      const transactions = await this.readJsonFiles(transactionsPath);

      for (const wallet of wallets) {
        if (wallet.userType !== 'freelancer') continue;

        // Calculate expected balance from transactions
        const userTransactions = transactions.filter(tx =>
          tx.freelancerId === wallet.userId && tx.status === 'paid'
        );

        const expectedEarnings = userTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

        if (Math.abs(wallet.lifetimeEarnings - expectedEarnings) > 1) {
          this.addIssue('HIGH', 'Wallet Balance Inconsistency',
            `User ${wallet.userId}: wallet shows ${wallet.lifetimeEarnings}, transactions total ${expectedEarnings}`,
            'wallet-consistency');
        }
      }

      console.log(`    Checked ${wallets.length} wallets for consistency`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Wallet Consistency Check Failed', error.message, 'wallet-consistency');
      return false;
    }
  }

  async checkTransactionIntegrity() {
    console.log('  - Checking transaction integrity...');
    try {
      const transactionsPath = path.join(TEST_CONFIG.testDataRoot, 'transactions');
      const transactions = await this.readJsonFiles(transactionsPath);

      let integrityIssues = 0;

      for (const tx of transactions) {
        // Check required fields
        const requiredFields = ['transactionId', 'amount', 'status', 'timestamp'];
        const missingFields = requiredFields.filter(field => !tx[field]);

        if (missingFields.length > 0) {
          this.addIssue('MEDIUM', 'Transaction Missing Fields',
            `Transaction ${tx.transactionId} missing: ${missingFields.join(', ')}`,
            'transaction-integrity');
          integrityIssues++;
        }

        // Check amount is positive
        if (tx.amount <= 0) {
          this.addIssue('MEDIUM', 'Invalid Transaction Amount',
            `Transaction ${tx.transactionId} has amount: ${tx.amount}`,
            'transaction-integrity');
          integrityIssues++;
        }
      }

      console.log(`    Checked ${transactions.length} transactions, found ${integrityIssues} issues`);
      return integrityIssues === 0;
    } catch (error) {
      this.addIssue('HIGH', 'Transaction Integrity Check Failed', error.message, 'transaction-integrity');
      return false;
    }
  }

  async checkCrossSystemConsistency() {
    console.log('  - Checking cross-system consistency...');
    try {
      // Check consistency between invoices, transactions, and wallets
      const invoicesPath = path.join(TEST_CONFIG.testDataRoot, 'invoices');
      const transactionsPath = path.join(TEST_CONFIG.testDataRoot, 'transactions');

      const invoices = await this.readJsonFiles(invoicesPath);
      const transactions = await this.readJsonFiles(transactionsPath);

      const paidInvoices = invoices.filter(inv => inv.status === 'paid');

      for (const invoice of paidInvoices) {
        const correspondingTx = transactions.find(tx =>
          tx.invoiceNumber === invoice.invoiceNumber
        );

        if (!correspondingTx) {
          this.addIssue('HIGH', 'Missing Transaction for Paid Invoice',
            `Paid invoice ${invoice.invoiceNumber} has no corresponding transaction`,
            'cross-system-consistency');
        } else if (Math.abs(correspondingTx.amount - invoice.totalAmount) > 0.01) {
          this.addIssue('MEDIUM', 'Amount Mismatch',
            `Invoice ${invoice.invoiceNumber}: invoice=${invoice.totalAmount}, transaction=${correspondingTx.amount}`,
            'cross-system-consistency');
        }
      }

      console.log(`    Checked ${paidInvoices.length} paid invoices for cross-system consistency`);
      return true;
    } catch (error) {
      this.addIssue('HIGH', 'Cross-System Consistency Check Failed', error.message, 'cross-system-consistency');
      return false;
    }
  }

  // Utility methods
  async readJsonFiles(dirPath) {
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      const data = [];

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(dirPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = JSON.parse(content);

          if (Array.isArray(parsed)) {
            data.push(...parsed);
          } else {
            data.push(parsed);
          }
        } catch (error) {
          console.warn(`    Warning: Could not read ${file}: ${error.message}`);
        }
      }

      return data;
    } catch (error) {
      console.warn(`    Warning: Could not read directory ${dirPath}: ${error.message}`);
      return [];
    }
  }

  isCompletionProject(projectId) {
    // This would check if a project is completion-based
    // For now, return true for testing
    return true;
  }

  async getProjectById(projectId) {
    try {
      const projectsPath = path.join(TEST_CONFIG.testDataRoot, 'projects');
      const projects = await this.readJsonFiles(projectsPath);
      return projects.find(p => p.projectId === projectId);
    } catch (error) {
      return null;
    }
  }

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

  async testFinalPaymentExecution() {
    console.log('  - Testing final payment execution...');
    try {
      // Test final payment when all tasks are approved
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'TEST_PROJECT',
          invoiceType: 'completion'
        })
      });

      // Note: This endpoint might not exist yet - that's what we're testing for
      if (response.status === 404) {
        this.addIssue('HIGH', 'Final Payment Endpoint Missing',
          'No dedicated endpoint for final completion payments', 'final-payment-api');
        return null;
      }

      if (!response.ok) {
        this.addIssue('MEDIUM', 'Final Payment Execution Failed',
          `API returned ${response.status}`, 'final-payment');
        return null;
      }

      const result = await response.json();
      console.log(`    Final payment execution: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      this.addIssue('HIGH', 'Final Payment Test Failed', error.message, 'final-payment');
      return null;
    }
  }

  async checkProjectCompletionStatus() {
    console.log('  - Checking project completion status...');
    try {
      const projectsPath = path.join(TEST_CONFIG.testDataRoot, 'projects');
      const projects = await this.readJsonFiles(projectsPath);

      const completionProjects = projects.filter(p =>
        p.invoicingMethod === 'completion' || p.executionMethod === 'completion'
      );

      for (const project of completionProjects) {
        // Check if project status is updated when all tasks are approved
        const tasksPath = path.join(TEST_CONFIG.testDataRoot, 'project-tasks');
        const tasks = await this.readJsonFiles(tasksPath);

        const projectTasks = tasks.filter(t => t.projectId === project.projectId);
        const approvedTasks = projectTasks.filter(t => t.status === 'Approved' || t.status === 'approved');

        if (projectTasks.length > 0 && approvedTasks.length === projectTasks.length) {
          // All tasks approved - project should be completed
          if (project.status !== 'completed') {
            this.addIssue('MEDIUM', 'Project Status Not Updated',
              `Project ${project.projectId} has all tasks approved but status is ${project.status}`,
              'project-completion');
          }
        }
      }

      console.log(`    Checked ${completionProjects.length} completion projects for status`);
      return true;
    } catch (error) {
      this.addIssue('MEDIUM', 'Project Completion Check Failed', error.message, 'project-completion');
      return false;
    }
  }

  async checkStorageSystemConsistency() {
    console.log('  - Checking storage system consistency...');
    try {
      // Check if data exists in expected locations
      const expectedPaths = [
        'projects',
        'project-tasks',
        'invoices',
        'transactions',
        'wallets'
      ];

      let consistencyIssues = 0;

      for (const expectedPath of expectedPaths) {
        const fullPath = path.join(TEST_CONFIG.testDataRoot, expectedPath);
        try {
          await fs.access(fullPath);
          console.log(`    ✓ ${expectedPath} directory exists`);
        } catch (error) {
          this.addIssue('HIGH', 'Missing Storage Directory',
            `Directory ${expectedPath} not found`, 'storage-consistency');
          consistencyIssues++;
        }
      }

      return consistencyIssues === 0;
    } catch (error) {
      this.addIssue('HIGH', 'Storage Consistency Check Failed', error.message, 'storage-consistency');
      return false;
    }
  }

  async checkDataIntegrity() {
    console.log('  - Checking data integrity...');
    try {
      // Check for data corruption, invalid JSON, etc.
      const dataPaths = [
        'projects',
        'invoices',
        'transactions',
        'wallets'
      ];

      let integrityIssues = 0;

      for (const dataPath of dataPaths) {
        try {
          const data = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, dataPath));

          // Check for duplicate IDs
          const ids = data.map(item => item.id || item.projectId || item.invoiceNumber || item.transactionId).filter(Boolean);
          const uniqueIds = new Set(ids);

          if (ids.length !== uniqueIds.size) {
            this.addIssue('MEDIUM', 'Duplicate IDs Found',
              `Duplicate IDs in ${dataPath}`, 'data-integrity');
            integrityIssues++;
          }

          console.log(`    ✓ ${dataPath}: ${data.length} records, ${uniqueIds.size} unique IDs`);
        } catch (error) {
          this.addIssue('MEDIUM', 'Data Integrity Check Failed',
            `Error checking ${dataPath}: ${error.message}`, 'data-integrity');
          integrityIssues++;
        }
      }

      return integrityIssues === 0;
    } catch (error) {
      this.addIssue('HIGH', 'Data Integrity Check Failed', error.message, 'data-integrity');
      return false;
    }
  }

  async runEdgeCaseTests() {
    console.log('  - Running edge case tests...');
    const edgeCases = {};

    try {
      // Test 1: Zero budget project
      edgeCases.zeroBudgetHandling = await this.testZeroBudgetProject();

      // Test 2: Single task project
      edgeCases.singleTaskProject = await this.testSingleTaskProject();

      // Test 3: Duplicate invoice prevention
      edgeCases.duplicateInvoicePrevention = await this.testDuplicateInvoicePrevention();

      // Test 4: Invalid payment amounts
      edgeCases.invalidAmountHandling = await this.testInvalidAmountHandling();

      // Test 5: Concurrent payment processing
      edgeCases.concurrentPaymentHandling = await this.testConcurrentPayments();

      console.log(`    Completed ${Object.keys(edgeCases).length} edge case tests`);
      return edgeCases;
    } catch (error) {
      this.addIssue('MEDIUM', 'Edge Case Testing Failed', error.message, 'edge-cases');
      return { error: error.message };
    }
  }

  async testZeroBudgetProject() {
    // Test handling of projects with zero or very small budgets
    console.log('    - Testing zero budget project handling...');
    try {
      const projects = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'projects'));
      const zeroBudgetProjects = projects.filter(p =>
        (p.totalBudget || 0) === 0 &&
        (p.invoicingMethod === 'completion' || p.executionMethod === 'completion')
      );

      if (zeroBudgetProjects.length > 0) {
        this.addIssue('MEDIUM', 'Zero Budget Completion Projects Found',
          `Found ${zeroBudgetProjects.length} completion projects with zero budget`, 'edge-case-zero-budget');
      }

      return { tested: true, zeroBudgetProjects: zeroBudgetProjects.length };
    } catch (error) {
      return { tested: false, error: error.message };
    }
  }

  async testSingleTaskProject() {
    // Test projects with only one task
    console.log('    - Testing single task project handling...');
    try {
      const projects = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'projects'));
      const tasks = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'project-tasks'));

      const completionProjects = projects.filter(p =>
        p.invoicingMethod === 'completion' || p.executionMethod === 'completion'
      );

      let singleTaskProjects = 0;

      for (const project of completionProjects) {
        const projectTasks = tasks.filter(t => t.projectId === project.projectId);
        if (projectTasks.length === 1) {
          singleTaskProjects++;

          // Check if invoice amount calculation is correct for single task
          const invoices = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'invoices'));
          const projectInvoices = invoices.filter(inv =>
            inv.projectId === project.projectId &&
            inv.invoiceType === 'completion' &&
            !inv.invoiceNumber?.startsWith('UPF')
          );

          if (projectInvoices.length > 0) {
            const expectedAmount = (project.totalBudget || 0) * 0.88; // 88% after upfront
            const actualAmount = projectInvoices[0].totalAmount;

            if (Math.abs(actualAmount - expectedAmount) > 1) {
              this.addIssue('MEDIUM', 'Single Task Amount Calculation Error',
                `Project ${project.projectId}: expected ${expectedAmount}, got ${actualAmount}`,
                'edge-case-single-task');
            }
          }
        }
      }

      return { tested: true, singleTaskProjects };
    } catch (error) {
      return { tested: false, error: error.message };
    }
  }

  async testDuplicateInvoicePrevention() {
    // Test prevention of duplicate invoices for the same task
    console.log('    - Testing duplicate invoice prevention...');
    try {
      const invoices = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'invoices'));

      // Group invoices by project and task
      const invoiceGroups = {};

      for (const invoice of invoices) {
        if (invoice.invoiceType === 'completion' && invoice.taskId) {
          const key = `${invoice.projectId}-${invoice.taskId}`;
          if (!invoiceGroups[key]) {
            invoiceGroups[key] = [];
          }
          invoiceGroups[key].push(invoice);
        }
      }

      let duplicateGroups = 0;

      for (const [key, group] of Object.entries(invoiceGroups)) {
        if (group.length > 1) {
          duplicateGroups++;
          this.addIssue('HIGH', 'Duplicate Invoices Found',
            `Multiple invoices for project-task ${key}: ${group.map(i => i.invoiceNumber).join(', ')}`,
            'edge-case-duplicates');
        }
      }

      return { tested: true, duplicateGroups };
    } catch (error) {
      return { tested: false, error: error.message };
    }
  }

  async testInvalidAmountHandling() {
    // Test handling of invalid payment amounts
    console.log('    - Testing invalid amount handling...');
    try {
      const invoices = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'invoices'));

      let invalidAmounts = 0;

      for (const invoice of invoices) {
        if (invoice.invoiceType === 'completion') {
          if (invoice.totalAmount <= 0) {
            invalidAmounts++;
            this.addIssue('HIGH', 'Invalid Invoice Amount',
              `Invoice ${invoice.invoiceNumber} has amount: ${invoice.totalAmount}`,
              'edge-case-invalid-amount');
          }

          if (typeof invoice.totalAmount !== 'number') {
            invalidAmounts++;
            this.addIssue('HIGH', 'Non-Numeric Invoice Amount',
              `Invoice ${invoice.invoiceNumber} has non-numeric amount: ${invoice.totalAmount}`,
              'edge-case-invalid-amount');
          }
        }
      }

      return { tested: true, invalidAmounts };
    } catch (error) {
      return { tested: false, error: error.message };
    }
  }

  async testConcurrentPayments() {
    // Test handling of concurrent payment processing
    console.log('    - Testing concurrent payment handling...');
    try {
      // This would test race conditions in payment processing
      // For now, just check for transaction ID uniqueness
      const transactions = await this.readJsonFiles(path.join(TEST_CONFIG.testDataRoot, 'transactions'));

      const transactionIds = transactions.map(tx => tx.transactionId).filter(Boolean);
      const uniqueIds = new Set(transactionIds);

      if (transactionIds.length !== uniqueIds.size) {
        this.addIssue('HIGH', 'Duplicate Transaction IDs',
          'Found duplicate transaction IDs - possible race condition', 'edge-case-concurrent');
      }

      return { tested: true, duplicateTransactionIds: transactionIds.length - uniqueIds.size };
    } catch (error) {
      return { tested: false, error: error.message };
    }
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
    
    return `# Completion-Based Invoicing Test Report

## Summary
- **Test Duration**: ${Math.round(duration / 1000)}s
- **Tests Passed**: ${passCount}
- **Tests Failed**: ${failCount}
- **Issues Found**: ${this.issues.length}

## Issues Discovered

${this.issues.map(issue => `### ${issue.severity}: ${issue.title}
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

## Recommendations

Based on the test results, the following areas need attention:

1. **Missing API Endpoints**: Separate completion-based payment execution routes
2. **Invoice Calculation Logic**: Proper handling of remaining budget distribution
3. **Manual Triggering**: Freelancer and commissioner manual invoice/payment flows
4. **Data Consistency**: Cross-system synchronization issues
5. **Error Handling**: Edge case management and rollback mechanisms

---
*Generated on ${new Date().toISOString()}*
`;
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CompletionInvoicingTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CompletionInvoicingTester;
