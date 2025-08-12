/**
 * REAL API COMPLETION INVOICING FLOW PROGNOSIS TEST
 * ================================================
 * 
 * This test suite tests the completion invoicing workflow against REAL APIs:
 * 1. Create a test gig with completion invoicing method (REAL API)
 * 2. Test freelancer matching to project activation logic (REAL API)
 * 3. Test upfront payment logic (30% upfront) (REAL API)
 * 4. Test task approval workflow leading to completion payment (70% remaining) (REAL API)
 * 5. Test auto-completion logic when all tasks are approved (REAL API)
 * 6. Identify and report any REAL breakages without fixing them
 * 
 * CRITICAL: This test uses REAL APIs and will create REAL data
 * Only run this test when you want to validate the actual system
 */

import { jest } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';

// Test configuration
const TEST_CONFIG = {
  testFreelancerId: 1, // Tobi Philly
  testCommissionerId: 31, // Commissioner from users.json
  testOrganizationId: 1,
  baseDataPath: path.join(process.cwd(), 'data'),
  testGigTitle: 'REAL API Completion Invoicing Flow Test Gig',
  testBudget: 5000,
  testUpfrontAmount: 1500,  // 30% upfront
  testCompletionAmount: 3500,  // 70% completion
  baseUrl: 'http://localhost:3000',
  testTaskCount: 3 // Number of tasks to create for testing
};

// Test state tracking
let testGigId: number | null = null;
let testProjectId: number | null = null;
let testTaskIds: number[] = [];
let upfrontInvoiceNumber: string | null = null;
let completionInvoiceNumber: string | null = null;

// Prognosis tracking
const prognosisReport = {
  gigCreation: { status: 'PENDING', issues: [] as string[], details: null as any },
  freelancerMatching: { status: 'PENDING', issues: [] as string[], details: null as any },
  projectActivation: { status: 'PENDING', issues: [] as string[], details: null as any },
  upfrontPayment: { status: 'PENDING', issues: [] as string[], details: null as any },
  taskApproval: { status: 'PENDING', issues: [] as string[], details: null as any },
  completionPayment: { status: 'PENDING', issues: [] as string[], details: null as any },
  autoCompletion: { status: 'PENDING', issues: [] as string[], details: null as any },
  walletIntegration: { status: 'PENDING', issues: [] as string[], details: null as any },
  overallFlow: { status: 'PENDING', issues: [] as string[], criticalBreakages: [] as string[] }
};

// Helper functions for data validation
const validateGigStructure = (gig: any): string[] => {
  const issues: string[] = [];
  
  if (!gig.id) issues.push('Missing gig ID');
  if (gig.executionMethod !== 'completion') issues.push('ExecutionMethod not set to completion');
  if (gig.invoicingMethod !== 'completion') issues.push('InvoicingMethod not set to completion');
  if (!gig.lowerBudget || !gig.upperBudget) issues.push('Budget fields missing or invalid');
  if (gig.status !== 'Available') issues.push('Gig status not set to Available');
  
  return issues;
};

const validateProjectStructure = (project: any): string[] => {
  const issues: string[] = [];
  
  if (!project.projectId) issues.push('Missing project ID');
  if (project.invoicingMethod !== 'completion') issues.push('Project invoicingMethod not preserved from gig');
  if (!project.freelancerId) issues.push('Missing freelancer ID');
  if (!project.commissionerId) issues.push('Missing commissioner ID');
  if (project.status !== 'ongoing') issues.push('Project status not set to ongoing');
  if (!project.budget || (!project.budget.upper && !project.budget.lower)) issues.push('Project budget not properly set');
  
  return issues;
};

const validateUpfrontPaymentCalculation = (amount: number, totalBudget: number): string[] => {
  const issues: string[] = [];
  const expectedUpfront = Math.round(totalBudget * 0.30); // 30% upfront
  const tolerance = 10; // Allow small rounding differences
  
  if (Math.abs(amount - expectedUpfront) > tolerance) {
    issues.push(`Upfront amount ${amount} does not match expected 30% (${expectedUpfront}) of total budget ${totalBudget}`);
  }
  
  return issues;
};

const validateCompletionPaymentCalculation = (amount: number, totalBudget: number, upfrontPaid: number): string[] => {
  const issues: string[] = [];
  const expectedCompletion = totalBudget - upfrontPaid; // Remaining 70%
  const tolerance = 10; // Allow small rounding differences
  
  if (Math.abs(amount - expectedCompletion) > tolerance) {
    issues.push(`Completion amount ${amount} does not match expected remaining amount (${expectedCompletion}) after upfront payment ${upfrontPaid}`);
  }
  
  return issues;
};

// Real fetch function (no mocking)
const realFetch = global.fetch;

describe('Real API Completion Invoicing Flow Prognosis', () => {
  beforeAll(async () => {
    console.log('🚀 Starting REAL API Completion Invoicing Flow Prognosis Test');
    console.log('⚠️  WARNING: This test uses REAL APIs and creates REAL data');
    console.log('📊 Test Configuration:', TEST_CONFIG);
    console.log('🎯 Testing 30%/70% upfront/completion split with task approval workflow');
  });

  afterAll(async () => {
    console.log('\n📋 REAL API PROGNOSIS REPORT');
    console.log('=====================================');
    
    Object.entries(prognosisReport).forEach(([phase, report]) => {
      const statusIcon = report.status === 'PASS' ? '✅' : 
                        report.status === 'FAIL' ? '❌' : 
                        report.status === 'PARTIAL' ? '⚠️' : '⏳';
      
      console.log(`\n${statusIcon} ${phase.toUpperCase()}: ${report.status}`);
      
      if (report.issues.length > 0) {
        console.log('  🚨 REAL ISSUES FOUND:');
        report.issues.forEach((issue, index) => {
          console.log(`    ${index + 1}. ${issue}`);
        });
      }
      
      if (report.details) {
        console.log('  📊 Real Data:', JSON.stringify(report.details, null, 2));
      }
    });

    // Overall assessment
    const failedPhases = Object.values(prognosisReport).filter(r => r.status === 'FAIL').length;
    const partialPhases = Object.values(prognosisReport).filter(r => r.status === 'PARTIAL').length;
    const passedPhases = Object.values(prognosisReport).filter(r => r.status === 'PASS').length;

    console.log('\n🎯 REAL API ASSESSMENT');
    console.log('======================');
    console.log(`✅ Passed Phases: ${passedPhases}`);
    console.log(`⚠️ Partial Phases: ${partialPhases}`);
    console.log(`❌ Failed Phases: ${failedPhases}`);
    
    if (prognosisReport.overallFlow.criticalBreakages.length > 0) {
      console.log('\n🚨 CRITICAL REAL BREAKAGES IDENTIFIED:');
      prognosisReport.overallFlow.criticalBreakages.forEach((breakage, index) => {
        console.log(`  ${index + 1}. ${breakage}`);
      });
    }

    console.log('\n📝 REAL API RECOMMENDATIONS:');
    if (failedPhases === 0 && partialPhases === 0) {
      console.log('  ✅ All phases passed - completion invoicing flow is working correctly in production');
    } else {
      console.log('  🚨 CRITICAL: Real API issues found that need immediate attention');
      console.log('  🔧 Fix these issues before deploying to production');
      console.log('  🧪 Re-run this test after implementing fixes');
      console.log('  📊 Focus on critical breakages first as they prevent the entire flow');
    }

    // Cleanup recommendation
    if (testGigId || testProjectId) {
      console.log('\n🧹 CLEANUP RECOMMENDATION:');
      console.log(`  Consider cleaning up test data:`);
      if (testGigId) console.log(`    - Gig ID: ${testGigId}`);
      if (testProjectId) console.log(`    - Project ID: ${testProjectId}`);
      if (testTaskIds.length > 0) console.log(`    - Task IDs: ${testTaskIds.join(', ')}`);
    }
  });

  describe('Phase 1: Real Gig Creation with Completion Invoicing', () => {
    it('should create a real test gig with completion invoicing method', async () => {
      try {
        const gigData = {
          title: TEST_CONFIG.testGigTitle,
          budget: TEST_CONFIG.testBudget,
          executionMethod: 'completion',
          invoicingMethod: 'completion', // Key: completion invoicing
          commissionerId: TEST_CONFIG.testCommissionerId,
          category: 'development',
          subcategory: 'Web Development',
          skills: ['React', 'TypeScript', 'Testing'],
          tools: ['React', 'Jest', 'TypeScript'],
          description: 'REAL API test gig for completion invoicing flow validation',
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          deliveryTimeWeeks: 4,
          estimatedHours: 100,
          startType: 'Immediately',
          isPublic: true,
          isTargetedRequest: false
        };

        console.log('🔄 Creating real gig via API...');
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/gigs/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gigData)
        });

        const result = await response.json();

        console.log('🔍 REAL Gig Creation Response:', JSON.stringify(result, null, 2));

        // Validate response structure
        if (!result.success) {
          prognosisReport.gigCreation.status = 'FAIL';
          prognosisReport.gigCreation.issues.push(`REAL API: Gig creation failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Gig creation API failure prevents entire flow');
          return;
        }

        if (!result.gigId) {
          prognosisReport.gigCreation.status = 'FAIL';
          prognosisReport.gigCreation.issues.push('REAL API: Gig creation response missing gigId field');
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Missing gigId prevents freelancer matching');
          return;
        }

        // Validate gig data structure
        if (result.gig) {
          const gigValidationIssues = validateGigStructure(result.gig);
          prognosisReport.gigCreation.issues.push(...gigValidationIssues.map(issue => `REAL API: ${issue}`));
        } else {
          prognosisReport.gigCreation.issues.push('REAL API: Gig creation response missing gig object');
        }

        testGigId = result.gigId;
        prognosisReport.gigCreation.status = prognosisReport.gigCreation.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.gigCreation.details = {
          gigId: testGigId,
          responseStructure: result,
          validationPassed: prognosisReport.gigCreation.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.gigId).toBeDefined();
        expect(testGigId).toBeTruthy();

      } catch (error) {
        prognosisReport.gigCreation.status = 'FAIL';
        prognosisReport.gigCreation.issues.push(`REAL API: Gig creation threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Gig creation API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 2: Real Freelancer Matching and Project Activation', () => {
    it('should match freelancer to gig and create project with completion invoicing via real API', async () => {
      if (!testGigId) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push('REAL API: Cannot test freelancer matching without valid gig ID from Phase 1');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Freelancer matching blocked by Phase 1 failure');
        return;
      }

      try {
        // Create a gig request for the freelancer to accept
        const gigRequestData = {
          gigId: testGigId,
          freelancerId: TEST_CONFIG.testFreelancerId,
          commissionerId: TEST_CONFIG.testCommissionerId,
          title: TEST_CONFIG.testGigTitle,
          skills: ['React', 'TypeScript', 'Testing'],
          tools: ['React', 'Jest', 'TypeScript'],
          notes: 'REAL API test gig request for completion invoicing flow',
          budget: TEST_CONFIG.testBudget
        };

        console.log('🔄 Creating real gig request acceptance via API...');
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/gig-requests/${testGigId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gigRequestData)
        });

        const result = await response.json();

        console.log('🔍 REAL Freelancer Matching Response:', JSON.stringify(result, null, 2));

        // Validate response structure
        if (!result.success) {
          prognosisReport.freelancerMatching.status = 'FAIL';
          prognosisReport.freelancerMatching.issues.push(`REAL API: Freelancer matching failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Freelancer matching failure prevents project creation');
          return;
        }

        if (!result.entities?.project) {
          prognosisReport.freelancerMatching.status = 'FAIL';
          prognosisReport.freelancerMatching.issues.push('REAL API: Freelancer matching response missing project entity');
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Missing project entity prevents upfront payment');
          return;
        }

        // Validate project structure
        const project = result.entities.project;
        const projectValidationIssues = validateProjectStructure(project);
        prognosisReport.freelancerMatching.issues.push(...projectValidationIssues.map(issue => `REAL API: ${issue}`));

        // Validate task creation
        if (!result.entities.tasks || result.entities.tasks.length === 0) {
          prognosisReport.freelancerMatching.issues.push('REAL API: No tasks created during project activation');
        } else if (result.entities.tasks.length !== TEST_CONFIG.testTaskCount) {
          prognosisReport.freelancerMatching.issues.push(`REAL API: Expected ${TEST_CONFIG.testTaskCount} tasks, got ${result.entities.tasks.length}`);
        }

        testProjectId = project.projectId;
        testTaskIds = result.entities.tasks?.map((task: any) => task.id) || [];

        prognosisReport.freelancerMatching.status = prognosisReport.freelancerMatching.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.freelancerMatching.details = {
          projectId: testProjectId,
          taskIds: testTaskIds,
          projectStructure: project,
          validationPassed: prognosisReport.freelancerMatching.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.entities.project).toBeDefined();
        expect(testProjectId).toBeTruthy();

      } catch (error) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push(`REAL API: Freelancer matching threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Freelancer matching API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 3: Real Upfront Payment Logic (30% Split)', () => {
    it('should generate upfront invoice with correct 30% calculation via real API', async () => {
      if (!testProjectId) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push('REAL API: Cannot test upfront payment without valid project ID from Phase 2');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Upfront payment blocked by Phase 2 failure');
        return;
      }

      try {
        console.log('🔄 Generating real upfront invoice via API...');
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/invoices/generate-upfront`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            freelancerId: TEST_CONFIG.testFreelancerId,
            commissionerId: TEST_CONFIG.testCommissionerId,
            upfrontPercent: 30 // 30% upfront
          })
        });

        const result = await response.json();

        console.log('🔍 REAL Upfront Payment Response:', JSON.stringify(result, null, 2));

        // Validate response structure
        if (!result.success) {
          prognosisReport.upfrontPayment.status = 'FAIL';
          prognosisReport.upfrontPayment.issues.push(`REAL API: Upfront invoice generation failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Upfront payment failure prevents task workflow');
          return;
        }

        // Validate upfront payment calculation
        const expectedUpfrontAmount = Math.round(TEST_CONFIG.testBudget * 0.30); // 30% upfront
        const calculationIssues = validateUpfrontPaymentCalculation(result.amount, TEST_CONFIG.testBudget);
        prognosisReport.upfrontPayment.issues.push(...calculationIssues.map(issue => `REAL API: ${issue}`));

        upfrontInvoiceNumber = result.invoiceNumber;

        prognosisReport.upfrontPayment.status = prognosisReport.upfrontPayment.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.upfrontPayment.details = {
          invoiceNumber: upfrontInvoiceNumber,
          amount: result.amount,
          expectedAmount: expectedUpfrontAmount,
          calculationCorrect: Math.abs(result.amount - expectedUpfrontAmount) <= 10,
          validationPassed: prognosisReport.upfrontPayment.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.invoiceNumber).toBeDefined();
        expect(result.amount).toBeCloseTo(expectedUpfrontAmount, -1); // Allow small rounding differences

      } catch (error) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push(`REAL API: Upfront payment threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Upfront payment API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 4: Real Task Approval Workflow', () => {
    it('should approve all tasks and trigger completion invoice generation via real API', async () => {
      if (!testProjectId || testTaskIds.length === 0) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push('REAL API: Cannot test task approval without valid project ID and task IDs from previous phases');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Task approval blocked by previous phase failures');
        return;
      }

      try {
        const approvedTasks: any[] = [];
        let allApprovalsSuccessful = true;

        // Approve each task sequentially via real API
        for (let i = 0; i < testTaskIds.length; i++) {
          const taskId = testTaskIds[i];

          console.log(`🔄 Approving real task ${taskId} via API...`);
          const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: taskId,
              action: 'approve',
              actorId: TEST_CONFIG.testCommissionerId,
              actorType: 'commissioner'
            })
          });

          const result = await response.json();

          console.log(`🔍 REAL Task ${taskId} Approval Response:`, JSON.stringify(result, null, 2));

          if (!result.success) {
            prognosisReport.taskApproval.issues.push(`REAL API: Task ${taskId} approval failed: ${result.error || 'Unknown error'}`);
            allApprovalsSuccessful = false;
          } else {
            approvedTasks.push(result.task);

            // Validate task approval structure
            if (!result.task || result.task.status !== 'Approved') {
              prognosisReport.taskApproval.issues.push(`REAL API: Task ${taskId} not properly marked as approved`);
            }

            if (!result.invoiceGenerated && i === testTaskIds.length - 1) {
              prognosisReport.taskApproval.issues.push(`REAL API: Final task approval did not trigger invoice generation`);
            }
          }
        }

        if (!allApprovalsSuccessful) {
          prognosisReport.taskApproval.status = 'FAIL';
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Task approval failures prevent completion payment');
          return;
        }

        prognosisReport.taskApproval.status = prognosisReport.taskApproval.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.taskApproval.details = {
          approvedTaskCount: approvedTasks.length,
          expectedTaskCount: testTaskIds.length,
          allTasksApproved: approvedTasks.length === testTaskIds.length,
          approvedTasks: approvedTasks,
          validationPassed: prognosisReport.taskApproval.issues.length === 0,
          realApiUsed: true
        };

        expect(approvedTasks.length).toBe(testTaskIds.length);
        expect(allApprovalsSuccessful).toBe(true);

      } catch (error) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push(`REAL API: Task approval threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Task approval API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 5: Real Completion Payment Logic (70% Remaining)', () => {
    it('should generate completion invoice with correct 70% calculation via real API', async () => {
      if (!testProjectId) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push('REAL API: Cannot test completion payment without valid project ID from previous phases');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Completion payment blocked by previous phase failures');
        return;
      }

      try {
        // Calculate expected completion amount (70% of total budget)
        const upfrontPaid = Math.round(TEST_CONFIG.testBudget * 0.30);
        const expectedCompletionAmount = TEST_CONFIG.testBudget - upfrontPaid;

        console.log('🔄 Generating real completion invoice via API...');
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            freelancerId: TEST_CONFIG.testFreelancerId,
            commissionerId: TEST_CONFIG.testCommissionerId,
            projectTitle: TEST_CONFIG.testGigTitle
          })
        });

        const result = await response.json();

        console.log('🔍 REAL Completion Payment Response:', JSON.stringify(result, null, 2));

        // Validate response structure
        if (!result.success) {
          prognosisReport.completionPayment.status = 'FAIL';
          prognosisReport.completionPayment.issues.push(`REAL API: Completion invoice generation failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Completion payment failure prevents project completion');
          return;
        }

        // Validate completion payment calculation
        const calculationIssues = validateCompletionPaymentCalculation(result.amount, TEST_CONFIG.testBudget, upfrontPaid);
        prognosisReport.completionPayment.issues.push(...calculationIssues.map(issue => `REAL API: ${issue}`));

        completionInvoiceNumber = result.invoiceNumber;

        prognosisReport.completionPayment.status = prognosisReport.completionPayment.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.completionPayment.details = {
          invoiceNumber: completionInvoiceNumber,
          amount: result.amount,
          expectedAmount: expectedCompletionAmount,
          upfrontPaid: upfrontPaid,
          totalBudget: TEST_CONFIG.testBudget,
          calculationCorrect: Math.abs(result.amount - expectedCompletionAmount) <= 10,
          validationPassed: prognosisReport.completionPayment.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.invoiceNumber).toBeDefined();
        expect(result.amount).toBeCloseTo(expectedCompletionAmount, -1); // Allow small rounding differences

      } catch (error) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push(`REAL API: Completion payment threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Completion payment API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 6: Real Auto-Completion Logic', () => {
    it('should auto-complete project when all tasks are approved via real API', async () => {
      if (!testProjectId) {
        prognosisReport.autoCompletion.status = 'FAIL';
        prognosisReport.autoCompletion.issues.push('REAL API: Cannot test auto-completion without valid project ID from previous phases');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Auto-completion blocked by previous phase failures');
        return;
      }

      try {
        console.log('🔄 Triggering real auto-completion via API...');
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/projects/auto-complete-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId
          })
        });

        const result = await response.json();

        console.log('🔍 REAL Auto-Completion Response:', JSON.stringify(result, null, 2));

        // Validate response structure
        if (!result.success) {
          prognosisReport.autoCompletion.status = 'FAIL';
          prognosisReport.autoCompletion.issues.push(`REAL API: Auto-completion failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Auto-completion failure prevents proper project closure');
          return;
        }

        // Validate completion logic
        if (!result.completion) {
          prognosisReport.autoCompletion.issues.push('REAL API: Auto-completion response missing completion object');
        } else {
          const completion = result.completion;

          if (!completion.statusChanged) {
            prognosisReport.autoCompletion.issues.push('REAL API: Project status was not changed during auto-completion');
          }

          if (completion.newStatus !== 'completed') {
            prognosisReport.autoCompletion.issues.push(`REAL API: Project status should be 'completed', got '${completion.newStatus}'`);
          }

          if (!completion.allTasksApproved) {
            prognosisReport.autoCompletion.issues.push('REAL API: Auto-completion logic did not recognize all tasks as approved');
          }

          if (completion.approvedTasks !== completion.totalTasks) {
            prognosisReport.autoCompletion.issues.push(`REAL API: Approved tasks (${completion.approvedTasks}) does not match total tasks (${completion.totalTasks})`);
          }
        }

        prognosisReport.autoCompletion.status = prognosisReport.autoCompletion.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.autoCompletion.details = {
          projectId: testProjectId,
          completionResult: result.completion,
          statusChanged: result.completion?.statusChanged || false,
          validationPassed: prognosisReport.autoCompletion.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.completion?.statusChanged).toBe(true);
        expect(result.completion?.newStatus).toBe('completed');

      } catch (error) {
        prognosisReport.autoCompletion.status = 'FAIL';
        prognosisReport.autoCompletion.issues.push(`REAL API: Auto-completion threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Auto-completion API completely broken');
        throw error;
      }
    });
  });

  describe('Phase 7: Real Wallet Integration', () => {
    it('should update freelancer wallet with completion payment via real API', async () => {
      if (!completionInvoiceNumber) {
        prognosisReport.walletIntegration.status = 'FAIL';
        prognosisReport.walletIntegration.issues.push('REAL API: Cannot test wallet integration without completion invoice from previous phases');
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Wallet integration blocked by previous phase failures');
        return;
      }

      try {
        const expectedWalletIncrease = TEST_CONFIG.testCompletionAmount;

        console.log('🔄 Updating real wallet via API...');
        // Note: This endpoint might not exist in real system, so we'll test what's available
        const response = await realFetch(`${TEST_CONFIG.baseUrl}/api/wallet/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freelancerId: TEST_CONFIG.testFreelancerId,
            amount: expectedWalletIncrease,
            type: 'project_payment',
            invoiceNumber: completionInvoiceNumber,
            projectId: testProjectId
          })
        });

        const result = await response.json();

        console.log('🔍 REAL Wallet Integration Response:', JSON.stringify(result, null, 2));

        // Check if wallet API exists
        if (response.status === 404) {
          prognosisReport.walletIntegration.status = 'PARTIAL';
          prognosisReport.walletIntegration.issues.push('REAL API: Wallet update API endpoint does not exist (404)');
          prognosisReport.walletIntegration.details = {
            apiExists: false,
            expectedAmount: expectedWalletIncrease,
            realApiUsed: true,
            note: 'Wallet integration may be handled differently in the real system'
          };
          return;
        }

        // Validate response structure
        if (!result.success) {
          prognosisReport.walletIntegration.status = 'FAIL';
          prognosisReport.walletIntegration.issues.push(`REAL API: Wallet update failed: ${result.error || 'Unknown error'}`);
          prognosisReport.overallFlow.criticalBreakages.push('REAL API: Wallet integration failure prevents payment completion');
          return;
        }

        // Validate wallet update
        if (!result.wallet) {
          prognosisReport.walletIntegration.issues.push('REAL API: Wallet update response missing wallet object');
        } else {
          if (result.wallet.freelancerId !== TEST_CONFIG.testFreelancerId) {
            prognosisReport.walletIntegration.issues.push('REAL API: Wallet update applied to wrong freelancer');
          }

          if (!result.wallet.totalBalance || result.wallet.totalBalance <= 0) {
            prognosisReport.walletIntegration.issues.push('REAL API: Wallet total balance not properly updated');
          }
        }

        // Validate transaction record
        if (!result.transaction) {
          prognosisReport.walletIntegration.issues.push('REAL API: Wallet update response missing transaction record');
        } else {
          if (result.transaction.amount !== expectedWalletIncrease) {
            prognosisReport.walletIntegration.issues.push(`REAL API: Transaction amount ${result.transaction.amount} does not match expected ${expectedWalletIncrease}`);
          }

          if (result.transaction.invoiceNumber !== completionInvoiceNumber) {
            prognosisReport.walletIntegration.issues.push('REAL API: Transaction not properly linked to completion invoice');
          }
        }

        prognosisReport.walletIntegration.status = prognosisReport.walletIntegration.issues.length === 0 ? 'PASS' : 'PARTIAL';
        prognosisReport.walletIntegration.details = {
          walletUpdate: result.wallet,
          transaction: result.transaction,
          expectedAmount: expectedWalletIncrease,
          validationPassed: prognosisReport.walletIntegration.issues.length === 0,
          realApiUsed: true
        };

        expect(result.success).toBe(true);
        expect(result.wallet?.freelancerId).toBe(TEST_CONFIG.testFreelancerId);
        expect(result.transaction?.amount).toBe(expectedWalletIncrease);

      } catch (error) {
        prognosisReport.walletIntegration.status = 'FAIL';
        prognosisReport.walletIntegration.issues.push(`REAL API: Wallet integration threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        prognosisReport.overallFlow.criticalBreakages.push('REAL API: Wallet integration API completely broken');
        throw error;
      }
    });
  });
});
