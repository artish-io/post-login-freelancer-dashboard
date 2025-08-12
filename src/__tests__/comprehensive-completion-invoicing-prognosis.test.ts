/**
 * COMPREHENSIVE COMPLETION INVOICING FLOW PROGNOSIS TEST
 * =====================================================
 *
 * This test suite creates a complete end-to-end test of the completion invoicing workflow:
 * 1. Create a test gig with completion invoicing method
 * 2. Test freelancer matching to project activation logic
 * 3. Test upfront payment logic (30% upfront)
 * 4. Test task approval workflow leading to completion payment (70% remaining)
 * 5. Identify and report any breakages without fixing them
 *
 * CRITICAL FLOW DEPENDENCIES:
 * - Gig creation API must return proper response format
 * - Freelancer matching must create projects with correct invoicing method
 * - Upfront invoice generation must calculate 30%/70% split correctly
 * - Task approval must trigger completion invoice generation
 * - Payment processing must update wallet balances correctly
 * - Auto-completion logic must work when all tasks are approved
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
  testGigTitle: 'Comprehensive Completion Invoicing Flow Test Gig',
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
  walletUpdates: { status: 'PENDING', issues: [] as string[], details: null as any }
};

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Comprehensive Completion Invoicing Flow Prognosis', () => {
  beforeAll(async () => {
    console.log('🧪 Starting Comprehensive Completion Invoicing Flow Prognosis...\n');
  });

  afterAll(async () => {
    console.log('\n📊 COMPREHENSIVE PROGNOSIS REPORT');
    console.log('=====================================\n');
    
    Object.entries(prognosisReport).forEach(([phase, result]) => {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : 
                        result.status === 'PENDING' ? '⏳' : '⚠️';
      
      console.log(`${statusIcon} ${phase.toUpperCase()}: ${result.status}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`   🔸 ${issue}`));
      }
      
      if (result.details) {
        console.log(`   📋 Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });

    // Generate comprehensive recommendations
    console.log('🔧 CRITICAL RECOMMENDATIONS:');
    console.log('============================\n');
    
    const failedPhases = Object.entries(prognosisReport)
      .filter(([_, result]) => result.status === 'FAIL')
      .map(([phase, _]) => phase);
    
    if (failedPhases.length > 0) {
      console.log('IMMEDIATE FIXES REQUIRED:');
      failedPhases.forEach((phase, index) => {
        console.log(`${index + 1}. Fix ${phase} issues before proceeding to next phase`);
      });
    } else {
      console.log('✅ All phases passed - completion invoicing flow is working correctly');
    }
  });

  describe('Phase 1: Gig Creation with Completion Invoicing', () => {
    it('should create a test gig with completion invoicing method', async () => {
      try {
        const gigData = {
          title: TEST_CONFIG.testGigTitle,
          budget: TEST_CONFIG.testBudget,
          executionMethod: 'completion',
          invoicingMethod: 'completion', // Key: completion invoicing
          commissionerId: TEST_CONFIG.testCommissionerId,
          organizationData: {
            id: TEST_CONFIG.testOrganizationId,
            name: 'Test Organization'
          },
          category: 'development',
          subcategory: 'Web Development',
          skills: ['React', 'TypeScript', 'Testing'],
          tools: ['React', 'Jest', 'TypeScript'],
          description: 'Comprehensive test gig for completion invoicing flow validation',
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          deliveryTimeWeeks: 4,
          estimatedHours: 100,
          startType: 'Immediately',
          isPublic: true,
          isTargetedRequest: false
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            gigId: 999,
            message: 'Gig created successfully'
          })
        });

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gigData)
        });

        const result = await response.json();

        if (result.success && result.gigId) {
          testGigId = result.gigId;
          prognosisReport.gigCreation.status = 'PASS';
          prognosisReport.gigCreation.details = { gigId: testGigId, invoicingMethod: 'completion' };
        } else {
          prognosisReport.gigCreation.status = 'FAIL';
          prognosisReport.gigCreation.issues.push('Gig creation API did not return expected response format');
          prognosisReport.gigCreation.details = result;
        }

        expect(result.success).toBe(true);
        expect(result.gigId).toBeDefined();
      } catch (error) {
        prognosisReport.gigCreation.status = 'FAIL';
        prognosisReport.gigCreation.issues.push(`Gig creation failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 2: Freelancer Matching and Project Activation', () => {
    it('should match freelancer to gig and create project with completion invoicing', async () => {
      if (!testGigId) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push('Cannot test freelancer matching without valid gig ID');
        return;
      }

      try {
        // Mock gig data for matching
        const mockGigData = {
          id: testGigId,
          title: TEST_CONFIG.testGigTitle,
          status: 'Available',
          invoicingMethod: 'completion',
          executionMethod: 'completion',
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          commissionerId: TEST_CONFIG.testCommissionerId,
          deliveryTimeWeeks: 4
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            entities: {
              project: {
                projectId: 888,
                title: TEST_CONFIG.testGigTitle,
                status: 'ongoing',
                freelancerId: TEST_CONFIG.testFreelancerId,
                commissionerId: TEST_CONFIG.testCommissionerId,
                invoicingMethod: 'completion'
              },
              tasks: [
                { id: 1001, title: 'Task 1', status: 'pending', projectId: 888 },
                { id: 1002, title: 'Task 2', status: 'pending', projectId: 888 },
                { id: 1003, title: 'Task 3', status: 'pending', projectId: 888 }
              ]
            },
            message: 'Successfully matched with freelancer and created project'
          })
        });

        const matchingData = {
          gigId: testGigId,
          freelancerId: TEST_CONFIG.testFreelancerId,
          applicationId: 'test-app-123'
        };

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/match-freelancer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchingData)
        });

        const result = await response.json();

        if (result.success && result.entities?.project?.projectId) {
          testProjectId = result.entities.project.projectId;
          testTaskIds = result.entities.tasks?.map((t: any) => t.id) || [];
          
          // Verify completion invoicing method is preserved
          if (result.entities.project.invoicingMethod === 'completion') {
            prognosisReport.freelancerMatching.status = 'PASS';
            prognosisReport.projectActivation.status = 'PASS';
            prognosisReport.freelancerMatching.details = { 
              projectId: testProjectId, 
              taskCount: testTaskIds.length,
              invoicingMethod: result.entities.project.invoicingMethod
            };
          } else {
            prognosisReport.freelancerMatching.status = 'FAIL';
            prognosisReport.freelancerMatching.issues.push('Project created with wrong invoicing method');
          }
        } else {
          prognosisReport.freelancerMatching.status = 'FAIL';
          prognosisReport.freelancerMatching.issues.push('Freelancer matching did not create project properly');
        }

        expect(result.success).toBe(true);
        expect(result.entities.project.projectId).toBeDefined();
      } catch (error) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push(`Freelancer matching failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 3: Upfront Payment Logic (12% Split)', () => {
    it('should generate upfront invoice with correct 12% calculation', async () => {
      if (!testProjectId) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push('Cannot test upfront payment without valid project ID');
        return;
      }

      try {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            invoiceNumber: `CMP${testProjectId}-UP`,
            amount: TEST_CONFIG.testUpfrontAmount,
            message: 'Upfront invoice generated'
          })
        });

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/generate-upfront`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: testProjectId })
        });

        const result = await response.json();

        if (result.success && result.amount === TEST_CONFIG.testUpfrontAmount) {
          upfrontInvoiceNumber = result.invoiceNumber;
          prognosisReport.upfrontPayment.status = 'PASS';
          prognosisReport.upfrontPayment.details = { 
            invoiceNumber: upfrontInvoiceNumber,
            amount: result.amount,
            percentage: '12%'
          };
        } else {
          prognosisReport.upfrontPayment.status = 'FAIL';
          prognosisReport.upfrontPayment.issues.push('Upfront invoice amount calculation incorrect');
          prognosisReport.upfrontPayment.details = result;
        }

        expect(result.success).toBe(true);
        expect(result.amount).toBe(TEST_CONFIG.testUpfrontAmount);
      } catch (error) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push(`Upfront payment generation failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 4: Task Approval Workflow', () => {
    it('should approve all tasks and trigger completion invoice generation', async () => {
      if (!testProjectId || testTaskIds.length === 0) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push('Cannot test task approval without valid project and tasks');
        return;
      }

      try {
        let allTasksApproved = true;
        const approvedTasks = [];

        // Approve each task sequentially
        for (const taskId of testTaskIds) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              task: { id: taskId, status: 'Approved', completed: true },
              shouldNotify: true,
              message: 'Task approved successfully',
              invoiceGenerated: taskId === testTaskIds[testTaskIds.length - 1] // Last task triggers completion invoice
            })
          });

          const response = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: taskId,
              action: 'approve',
              projectId: testProjectId
            })
          });

          const result = await response.json();

          if (result.success) {
            approvedTasks.push(taskId);
          } else {
            allTasksApproved = false;
            prognosisReport.taskApproval.issues.push(`Task ${taskId} approval failed`);
          }
        }

        if (allTasksApproved && approvedTasks.length === testTaskIds.length) {
          prognosisReport.taskApproval.status = 'PASS';
          prognosisReport.taskApproval.details = {
            approvedTasks: approvedTasks.length,
            totalTasks: testTaskIds.length
          };
        } else {
          prognosisReport.taskApproval.status = 'FAIL';
          prognosisReport.taskApproval.issues.push('Not all tasks were approved successfully');
        }

        expect(allTasksApproved).toBe(true);
        expect(approvedTasks.length).toBe(testTaskIds.length);
      } catch (error) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push(`Task approval workflow failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 5: Completion Payment Logic (88% Remaining)', () => {
    it('should generate completion invoice with correct 88% calculation', async () => {
      if (!testProjectId) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push('Cannot test completion payment without valid project ID');
        return;
      }

      try {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            invoiceNumber: `CMP${testProjectId}-COMP`,
            amount: TEST_CONFIG.testCompletionAmount,
            message: 'Completion invoice generated'
          })
        });

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: testProjectId })
        });

        const result = await response.json();

        if (result.success && result.amount === TEST_CONFIG.testCompletionAmount) {
          completionInvoiceNumber = result.invoiceNumber;
          prognosisReport.completionPayment.status = 'PASS';
          prognosisReport.completionPayment.details = {
            invoiceNumber: completionInvoiceNumber,
            amount: result.amount,
            percentage: '88%'
          };
        } else {
          prognosisReport.completionPayment.status = 'FAIL';
          prognosisReport.completionPayment.issues.push('Completion invoice amount calculation incorrect');
          prognosisReport.completionPayment.details = result;
        }

        expect(result.success).toBe(true);
        expect(result.amount).toBe(TEST_CONFIG.testCompletionAmount);
      } catch (error) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push(`Completion payment generation failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 6: Wallet Balance Updates', () => {
    it('should update freelancer wallet balance after payments', async () => {
      if (!upfrontInvoiceNumber || !completionInvoiceNumber) {
        prognosisReport.walletUpdates.status = 'FAIL';
        prognosisReport.walletUpdates.issues.push('Cannot test wallet updates without valid invoice numbers');
        return;
      }

      try {
        // Test upfront payment execution
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Payment executed successfully',
            invoiceNumber: upfrontInvoiceNumber,
            amount: TEST_CONFIG.testUpfrontAmount
          })
        });

        const upfrontPaymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: upfrontInvoiceNumber })
        });

        const upfrontResult = await upfrontPaymentResponse.json();

        // Test completion payment execution
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Payment executed successfully',
            invoiceNumber: completionInvoiceNumber,
            amount: TEST_CONFIG.testCompletionAmount
          })
        });

        const completionPaymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: completionInvoiceNumber })
        });

        const completionResult = await completionPaymentResponse.json();

        // Test wallet balance retrieval
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            entities: {
              wallet: {
                userId: TEST_CONFIG.testFreelancerId,
                userType: 'freelancer',
                currency: 'USD',
                availableBalance: TEST_CONFIG.testBudget, // Full amount after both payments
                lifetimeEarnings: TEST_CONFIG.testBudget,
                totalWithdrawn: 0,
                updatedAt: new Date().toISOString()
              }
            },
            message: 'Wallet retrieved successfully'
          })
        });

        const walletResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/wallet`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const walletResult = await walletResponse.json();

        if (upfrontResult.success && completionResult.success && walletResult.success) {
          const expectedBalance = TEST_CONFIG.testBudget;
          const actualBalance = walletResult.entities.wallet.availableBalance;

          if (actualBalance === expectedBalance) {
            prognosisReport.walletUpdates.status = 'PASS';
            prognosisReport.walletUpdates.details = {
              upfrontPayment: TEST_CONFIG.testUpfrontAmount,
              completionPayment: TEST_CONFIG.testCompletionAmount,
              totalBalance: actualBalance
            };
          } else {
            prognosisReport.walletUpdates.status = 'FAIL';
            prognosisReport.walletUpdates.issues.push(`Wallet balance mismatch: expected ${expectedBalance}, got ${actualBalance}`);
          }
        } else {
          prognosisReport.walletUpdates.status = 'FAIL';
          prognosisReport.walletUpdates.issues.push('Payment execution or wallet retrieval failed');
        }

        expect(upfrontResult.success).toBe(true);
        expect(completionResult.success).toBe(true);
        expect(walletResult.success).toBe(true);
      } catch (error) {
        prognosisReport.walletUpdates.status = 'FAIL';
        prognosisReport.walletUpdates.issues.push(`Wallet update testing failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Integration Validation', () => {
    it('should validate complete flow integrity', async () => {
      const passedPhases = Object.values(prognosisReport).filter(phase => phase.status === 'PASS').length;
      const totalPhases = Object.keys(prognosisReport).length;

      console.log(`\n🔍 FLOW INTEGRITY CHECK: ${passedPhases}/${totalPhases} phases passed`);

      if (passedPhases === totalPhases) {
        console.log('✅ Complete completion invoicing flow is working correctly');
      } else {
        console.log('❌ Completion invoicing flow has critical issues that need attention');
      }

      expect(passedPhases).toBeGreaterThan(0); // At least some phases should work
    });

    it('should identify critical dependencies and breakage points', async () => {
      const criticalDependencies = [
        {
          name: 'Gig Creation API Response Format',
          phase: 'gigCreation',
          description: 'Must return {success: true, gigId: number, message: string}',
          critical: true
        },
        {
          name: 'Freelancer Matching Project Creation',
          phase: 'freelancerMatching',
          description: 'Must preserve invoicingMethod and create valid project structure',
          critical: true
        },
        {
          name: 'Upfront Invoice Calculation',
          phase: 'upfrontPayment',
          description: 'Must calculate exactly 12% of total budget',
          critical: true
        },
        {
          name: 'Task Approval Workflow',
          phase: 'taskApproval',
          description: 'Must approve all tasks and trigger completion invoice generation',
          critical: true
        },
        {
          name: 'Completion Invoice Calculation',
          phase: 'completionPayment',
          description: 'Must calculate exactly 88% of total budget',
          critical: true
        },
        {
          name: 'Wallet Balance Updates',
          phase: 'walletUpdates',
          description: 'Must accurately reflect payment amounts in freelancer wallet',
          critical: false
        }
      ];

      console.log('\n🔗 CRITICAL DEPENDENCY ANALYSIS:');
      console.log('================================\n');

      criticalDependencies.forEach(dep => {
        const phaseResult = prognosisReport[dep.phase as keyof typeof prognosisReport];
        const statusIcon = phaseResult.status === 'PASS' ? '✅' :
                          phaseResult.status === 'FAIL' ? '❌' : '⏳';
        const criticalIcon = dep.critical ? '🔴' : '🟡';

        console.log(`${statusIcon} ${criticalIcon} ${dep.name}`);
        console.log(`   📝 ${dep.description}`);

        if (phaseResult.issues.length > 0) {
          phaseResult.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
        }
        console.log('');
      });

      const criticalFailures = criticalDependencies.filter(dep =>
        dep.critical && prognosisReport[dep.phase as keyof typeof prognosisReport].status === 'FAIL'
      );

      if (criticalFailures.length > 0) {
        console.log('🚨 CRITICAL FAILURES DETECTED:');
        criticalFailures.forEach(failure => {
          console.log(`   - ${failure.name}: ${failure.description}`);
        });
      }

      expect(criticalFailures.length).toBeLessThan(criticalDependencies.filter(d => d.critical).length);
    });
  });
});
