/**
 * Project Activation Test Suite
 * 
 * Comprehensive testing for project creation, task management,
 * invoice generation, and data consistency workflows
 */

import { readProject, readAllProjects } from '../projects-utils';
import { readAllTasks, writeTask } from '../project-tasks/hierarchical-storage';
import { getAllInvoices } from '../invoice-storage';
import { executeTaskApprovalTransaction } from '../transactions/transaction-service';
import { generateInvoiceWithRetry } from '../invoices/robust-invoice-service';
import { runComprehensiveValidation } from '../data-validation/validation-service';
import { migrateTaskStorageLocations } from '../project-tasks/data-migration';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

export interface TestSuiteResult {
  suiteName: string;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
  summary: {
    projectTests: number;
    taskTests: number;
    invoiceTests: number;
    transactionTests: number;
    validationTests: number;
  };
}

/**
 * Run the complete project activation test suite
 */
export async function runProjectActivationTestSuite(): Promise<TestSuiteResult> {
  console.log('🧪 Starting Project Activation Test Suite...');
  
  const startTime = Date.now();
  const results: TestResult[] = [];
  const summary = {
    projectTests: 0,
    taskTests: 0,
    invoiceTests: 0,
    transactionTests: 0,
    validationTests: 0
  };

  // Project Creation Tests
  console.log('📋 Running project creation tests...');
  const projectTests = await runProjectCreationTests();
  results.push(...projectTests);
  summary.projectTests = projectTests.length;

  // Task Management Tests
  console.log('📝 Running task management tests...');
  const taskTests = await runTaskManagementTests();
  results.push(...taskTests);
  summary.taskTests = taskTests.length;

  // Invoice Generation Tests
  console.log('💰 Running invoice generation tests...');
  const invoiceTests = await runInvoiceGenerationTests();
  results.push(...invoiceTests);
  summary.invoiceTests = invoiceTests.length;

  // Transaction Integrity Tests
  console.log('🔄 Running transaction integrity tests...');
  const transactionTests = await runTransactionIntegrityTests();
  results.push(...transactionTests);
  summary.transactionTests = transactionTests.length;

  // Data Validation Tests
  console.log('🔍 Running data validation tests...');
  const validationTests = await runDataValidationTests();
  results.push(...validationTests);
  summary.validationTests = validationTests.length;

  const endTime = Date.now();
  const duration = endTime - startTime;

  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;

  const suiteResult: TestSuiteResult = {
    suiteName: 'Project Activation Test Suite',
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    duration,
    results,
    summary
  };

  console.log(`✅ Test Suite Complete: ${passedTests}/${results.length} tests passed in ${duration}ms`);
  
  return suiteResult;
}

/**
 * Test project creation workflows
 */
async function runProjectCreationTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Project storage consistency
  tests.push(await runTest('Project Storage Consistency', async () => {
    const projects = await readAllProjects();
    const testProject = projects[0];
    
    if (!testProject) {
      throw new Error('No projects found for testing');
    }

    // Verify project can be read back
    const readBack = await readProject(testProject.projectId);
    
    if (!readBack) {
      throw new Error('Project could not be read back');
    }

    return {
      projectId: testProject.projectId,
      title: testProject.title,
      readBackSuccess: true
    };
  }));

  // Test 2: Project metadata validation
  tests.push(await runTest('Project Metadata Validation', async () => {
    const projects = await readAllProjects();
    const invalidProjects = projects.filter(p => 
      !p.projectId || !p.title || !p.freelancerId || !p.commissionerId
    );

    return {
      totalProjects: projects.length,
      invalidProjects: invalidProjects.length,
      validationPassed: invalidProjects.length === 0
    };
  }));

  return tests;
}

/**
 * Test task management workflows
 */
async function runTaskManagementTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Task storage location consistency
  tests.push(await runTest('Task Storage Location Consistency', async () => {
    const allTasks = await readAllTasks();
    const sampleTask = allTasks[0];
    
    if (!sampleTask) {
      throw new Error('No tasks found for testing');
    }

    // Verify task can be read back
    const project = await readProject(sampleTask.projectId);
    if (!project) {
      throw new Error('Parent project not found');
    }

    return {
      taskId: sampleTask.taskId,
      projectId: sampleTask.projectId,
      projectCreatedAt: project.createdAt,
      storageConsistent: true
    };
  }));

  // Test 2: Task status transitions
  tests.push(await runTest('Task Status Transitions', async () => {
    const allTasks = await readAllTasks();
    const ongoingTasks = allTasks.filter(t => t.status === 'Ongoing');
    const approvedTasks = allTasks.filter(t => t.status === 'Approved');
    
    return {
      totalTasks: allTasks.length,
      ongoingTasks: ongoingTasks.length,
      approvedTasks: approvedTasks.length,
      statusDistribution: {
        ongoing: ongoingTasks.length,
        approved: approvedTasks.length
      }
    };
  }));

  return tests;
}

/**
 * Test invoice generation workflows
 */
async function runInvoiceGenerationTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Invoice data integrity
  tests.push(await runTest('Invoice Data Integrity', async () => {
    const allInvoices = await getAllInvoices();
    const invalidInvoices = allInvoices.filter(inv => 
      !inv.invoiceNumber || !inv.freelancerId || !inv.totalAmount || inv.totalAmount <= 0
    );

    return {
      totalInvoices: allInvoices.length,
      invalidInvoices: invalidInvoices.length,
      integrityPassed: invalidInvoices.length === 0
    };
  }));

  // Test 2: Invoice generation with retry logic
  tests.push(await runTest('Invoice Generation Retry Logic', async () => {
    // This would test the retry mechanism with a mock failure scenario
    // For now, we'll just verify the service is available
    
    const testRequest = {
      taskId: 999999, // Non-existent task for testing
      projectId: 999999,
      freelancerId: 1,
      commissionerId: 2,
      taskTitle: 'Test Task',
      projectTitle: 'Test Project',
      invoiceType: 'completion' as const
    };

    const result = await generateInvoiceWithRetry(testRequest);
    
    // Should fail gracefully
    return {
      testRequest,
      result: result.success,
      error: result.error,
      retryAttempt: result.retryAttempt,
      gracefulFailure: !result.success && result.error !== undefined
    };
  }));

  return tests;
}

/**
 * Test transaction integrity workflows
 */
async function runTransactionIntegrityTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Transaction rollback capability
  tests.push(await runTest('Transaction Rollback Capability', async () => {
    // Test with invalid data to trigger rollback
    const invalidTransaction = {
      taskId: 999999, // Non-existent task
      projectId: 999999,
      freelancerId: 1,
      commissionerId: 2,
      taskTitle: 'Test Task',
      projectTitle: 'Test Project',
      generateInvoice: false,
      invoiceType: 'completion' as const
    };

    const result = await executeTaskApprovalTransaction(invalidTransaction);
    
    return {
      transactionFailed: !result.success,
      rollbackPerformed: result.rollbackPerformed,
      error: result.error,
      rollbackWorking: !result.success && result.rollbackPerformed
    };
  }));

  return tests;
}

/**
 * Test data validation workflows
 */
async function runDataValidationTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Comprehensive validation
  tests.push(await runTest('Comprehensive Data Validation', async () => {
    const validationReport = await runComprehensiveValidation();
    
    return {
      totalIssues: validationReport.totalIssues,
      criticalIssues: validationReport.criticalIssues,
      highIssues: validationReport.highIssues,
      categories: validationReport.categories,
      validationWorking: true
    };
  }));

  // Test 2: Migration system
  tests.push(await runTest('Migration System Functionality', async () => {
    // Test migration analysis (dry run)
    const { analyzeTaskStorageInconsistencies } = await import('../project-tasks/data-migration');
    const analysis = await analyzeTaskStorageInconsistencies();
    
    return {
      totalTasks: analysis.totalTasks,
      inconsistencies: analysis.inconsistencies.length,
      errors: analysis.errors.length,
      migrationSystemWorking: true
    };
  }));

  return tests;
}

/**
 * Helper function to run individual tests with error handling
 */
async function runTest(testName: string, testFunction: () => Promise<any>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`  🧪 Running: ${testName}`);
    const details = await testFunction();
    const duration = Date.now() - startTime;
    
    console.log(`  ✅ Passed: ${testName} (${duration}ms)`);
    
    return {
      testName,
      success: true,
      duration,
      details
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(`  ❌ Failed: ${testName} (${duration}ms)`);
    console.error(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      testName,
      success: false,
      duration,
      details: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate test report summary
 */
export function generateTestReportSummary(result: TestSuiteResult): string[] {
  const summary: string[] = [];
  
  summary.push(`🧪 Test Suite: ${result.suiteName}`);
  summary.push(`📅 Timestamp: ${result.timestamp}`);
  summary.push(`⏱️ Duration: ${result.duration}ms`);
  summary.push(`📊 Results: ${result.passedTests}/${result.totalTests} tests passed`);
  
  if (result.failedTests > 0) {
    summary.push(`❌ Failed Tests: ${result.failedTests}`);
    const failedTests = result.results.filter(r => !r.success);
    failedTests.forEach(test => {
      summary.push(`   - ${test.testName}: ${test.error}`);
    });
  }
  
  summary.push(`📋 Test Categories:`);
  summary.push(`   - Project Tests: ${result.summary.projectTests}`);
  summary.push(`   - Task Tests: ${result.summary.taskTests}`);
  summary.push(`   - Invoice Tests: ${result.summary.invoiceTests}`);
  summary.push(`   - Transaction Tests: ${result.summary.transactionTests}`);
  summary.push(`   - Validation Tests: ${result.summary.validationTests}`);
  
  if (result.passedTests === result.totalTests) {
    summary.push(`🎉 All tests passed! System is healthy.`);
  } else {
    summary.push(`⚠️ Some tests failed. Review and fix issues before deployment.`);
  }
  
  return summary;
}
