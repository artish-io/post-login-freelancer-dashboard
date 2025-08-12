/**
 * REAL API COMPLETION INVOICING FLOW PROGNOSIS TEST
 * =================================================
 * 
 * This test suite tests the actual API endpoints to identify real breakages in:
 * 1. Gig creation with completion invoicing method
 * 2. Freelancer matching to project activation logic
 * 3. Upfront payment logic (12% upfront)
 * 4. Task approval workflow
 * 5. Completion payment logic (88% remaining)
 * 6. Wallet balance updates
 * 
 * This version calls REAL API endpoints to detect actual system breakages.
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
  testGigTitle: 'Real API Completion Invoicing Test Gig',
  testBudget: 5000,
  testUpfrontAmount: 600,  // 12% upfront
  testCompletionAmount: 4400,  // 88% completion
  baseUrl: 'http://localhost:3000'
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

describe('Real API Completion Invoicing Flow Prognosis', () => {
  beforeAll(async () => {
    console.log('🧪 Starting Real API Completion Invoicing Flow Prognosis...\n');
    console.log('⚠️  This test requires a running development server at localhost:3000\n');
  });

  afterAll(async () => {
    console.log('\n📊 REAL API PROGNOSIS REPORT');
    console.log('==============================\n');
    
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
    console.log('🔧 CRITICAL BREAKAGES IDENTIFIED:');
    console.log('=================================\n');
    
    const failedPhases = Object.entries(prognosisReport)
      .filter(([_, result]) => result.status === 'FAIL')
      .map(([phase, result]) => ({ phase, issues: result.issues }));
    
    if (failedPhases.length > 0) {
      console.log('IMMEDIATE FIXES REQUIRED:');
      failedPhases.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.phase.toUpperCase()} ISSUES:`);
        failure.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('');
      });
    } else {
      console.log('✅ All phases passed - completion invoicing flow is working correctly');
    }
  });

  describe('Phase 1: Real Gig Creation API Test', () => {
    it('should create a test gig with completion invoicing method via real API', async () => {
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
          description: 'Real API test gig for completion invoicing flow validation',
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          deliveryTimeWeeks: 4,
          estimatedHours: 100,
          startType: 'Immediately',
          isPublic: true,
          isTargetedRequest: false
        };

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gigData)
        });

        const result = await response.json();

        console.log('🔍 Gig Creation API Response:', JSON.stringify(result, null, 2));

        if (response.ok && result.success && result.gigId) {
          testGigId = result.gigId;
          prognosisReport.gigCreation.status = 'PASS';
          prognosisReport.gigCreation.details = { 
            gigId: testGigId, 
            invoicingMethod: 'completion',
            responseFormat: 'correct'
          };
        } else {
          prognosisReport.gigCreation.status = 'FAIL';
          if (!response.ok) {
            prognosisReport.gigCreation.issues.push(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (!result.success) {
            prognosisReport.gigCreation.issues.push('API returned success: false');
          }
          if (!result.gigId) {
            prognosisReport.gigCreation.issues.push('API did not return gigId');
          }
          prognosisReport.gigCreation.details = result;
        }

        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        expect(result.gigId).toBeDefined();
      } catch (error) {
        prognosisReport.gigCreation.status = 'FAIL';
        prognosisReport.gigCreation.issues.push(`Network/API error: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 2: Real Freelancer Matching API Test', () => {
    it('should test freelancer matching with real gig data', async () => {
      if (!testGigId) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push('Cannot test freelancer matching without valid gig ID from Phase 1');
        return;
      }

      try {
        // First, verify the gig exists and has correct invoicing method
        const gigPath = path.join(TEST_CONFIG.baseDataPath, 'gigs', '2025', 'August', '11', testGigId.toString(), 'gig.json');
        
        let gigExists = false;
        try {
          await fs.access(gigPath);
          gigExists = true;
          const gigData = JSON.parse(await fs.readFile(gigPath, 'utf-8'));
          console.log('🔍 Created Gig Data:', JSON.stringify(gigData, null, 2));
          
          if (gigData.invoicingMethod !== 'completion') {
            prognosisReport.freelancerMatching.issues.push(`Gig invoicing method is ${gigData.invoicingMethod}, expected 'completion'`);
          }
        } catch (error) {
          prognosisReport.freelancerMatching.issues.push(`Created gig file not found at ${gigPath}`);
        }

        if (!gigExists) {
          prognosisReport.freelancerMatching.status = 'FAIL';
          prognosisReport.freelancerMatching.issues.push('Gig creation did not persist to file system');
          return;
        }

        // Test freelancer matching API
        const matchingData = {
          gigId: testGigId,
          freelancerId: TEST_CONFIG.testFreelancerId,
          applicationId: `test-app-${Date.now()}`
        };

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/match-freelancer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchingData)
        });

        const result = await response.json();

        console.log('🔍 Freelancer Matching API Response:', JSON.stringify(result, null, 2));

        if (response.ok && result.success && result.entities?.project?.projectId) {
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
            prognosisReport.freelancerMatching.issues.push(`Project created with wrong invoicing method: ${result.entities.project.invoicingMethod}`);
          }
        } else {
          prognosisReport.freelancerMatching.status = 'FAIL';
          if (!response.ok) {
            prognosisReport.freelancerMatching.issues.push(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (!result.success) {
            prognosisReport.freelancerMatching.issues.push('Freelancer matching API returned success: false');
          }
          if (!result.entities?.project?.projectId) {
            prognosisReport.freelancerMatching.issues.push('Freelancer matching did not create project');
          }
          prognosisReport.freelancerMatching.details = result;
        }

        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        expect(result.entities.project.projectId).toBeDefined();
      } catch (error) {
        prognosisReport.freelancerMatching.status = 'FAIL';
        prognosisReport.freelancerMatching.issues.push(`Freelancer matching failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 3: Real Upfront Payment API Test', () => {
    it('should generate upfront invoice with correct 12% calculation via real API', async () => {
      if (!testProjectId) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push('Cannot test upfront payment without valid project ID from Phase 2');
        return;
      }

      try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/generate-upfront`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: testProjectId })
        });

        const result = await response.json();

        console.log('🔍 Upfront Invoice API Response:', JSON.stringify(result, null, 2));

        if (response.ok && result.success) {
          const expectedAmount = Math.round(TEST_CONFIG.testBudget * 0.12); // 12%

          if (result.amount === expectedAmount) {
            upfrontInvoiceNumber = result.invoiceNumber;
            prognosisReport.upfrontPayment.status = 'PASS';
            prognosisReport.upfrontPayment.details = {
              invoiceNumber: upfrontInvoiceNumber,
              amount: result.amount,
              expectedAmount: expectedAmount,
              percentage: '12%'
            };
          } else {
            prognosisReport.upfrontPayment.status = 'FAIL';
            prognosisReport.upfrontPayment.issues.push(`Upfront amount calculation incorrect: got ${result.amount}, expected ${expectedAmount}`);
            prognosisReport.upfrontPayment.details = result;
          }
        } else {
          prognosisReport.upfrontPayment.status = 'FAIL';
          if (!response.ok) {
            prognosisReport.upfrontPayment.issues.push(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (!result.success) {
            prognosisReport.upfrontPayment.issues.push('Upfront invoice generation API returned success: false');
          }
          prognosisReport.upfrontPayment.details = result;
        }

        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
      } catch (error) {
        prognosisReport.upfrontPayment.status = 'FAIL';
        prognosisReport.upfrontPayment.issues.push(`Upfront payment API failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 4: Real Task Approval API Test', () => {
    it('should approve all tasks via real API and trigger completion invoice generation', async () => {
      if (!testProjectId || testTaskIds.length === 0) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push('Cannot test task approval without valid project and tasks from Phase 2');
        return;
      }

      try {
        let allTasksApproved = true;
        const approvedTasks = [];

        // Approve each task sequentially
        for (const taskId of testTaskIds) {
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

          console.log(`🔍 Task ${taskId} Approval API Response:`, JSON.stringify(result, null, 2));

          if (response.ok && result.success) {
            approvedTasks.push(taskId);
          } else {
            allTasksApproved = false;
            prognosisReport.taskApproval.issues.push(`Task ${taskId} approval failed: ${result.error || 'Unknown error'}`);
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
          prognosisReport.taskApproval.issues.push(`Only ${approvedTasks.length}/${testTaskIds.length} tasks were approved successfully`);
        }

        expect(allTasksApproved).toBe(true);
        expect(approvedTasks.length).toBe(testTaskIds.length);
      } catch (error) {
        prognosisReport.taskApproval.status = 'FAIL';
        prognosisReport.taskApproval.issues.push(`Task approval API workflow failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 5: Real Completion Payment API Test', () => {
    it('should generate completion invoice with correct 88% calculation via real API', async () => {
      if (!testProjectId) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push('Cannot test completion payment without valid project ID from Phase 2');
        return;
      }

      try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: testProjectId })
        });

        const result = await response.json();

        console.log('🔍 Completion Invoice API Response:', JSON.stringify(result, null, 2));

        if (response.ok && result.success) {
          const expectedAmount = TEST_CONFIG.testBudget - Math.round(TEST_CONFIG.testBudget * 0.12); // 88%

          if (result.amount === expectedAmount) {
            completionInvoiceNumber = result.invoiceNumber;
            prognosisReport.completionPayment.status = 'PASS';
            prognosisReport.completionPayment.details = {
              invoiceNumber: completionInvoiceNumber,
              amount: result.amount,
              expectedAmount: expectedAmount,
              percentage: '88%'
            };
          } else {
            prognosisReport.completionPayment.status = 'FAIL';
            prognosisReport.completionPayment.issues.push(`Completion amount calculation incorrect: got ${result.amount}, expected ${expectedAmount}`);
            prognosisReport.completionPayment.details = result;
          }
        } else {
          prognosisReport.completionPayment.status = 'FAIL';
          if (!response.ok) {
            prognosisReport.completionPayment.issues.push(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (!result.success) {
            prognosisReport.completionPayment.issues.push('Completion invoice generation API returned success: false');
          }
          prognosisReport.completionPayment.details = result;
        }

        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
      } catch (error) {
        prognosisReport.completionPayment.status = 'FAIL';
        prognosisReport.completionPayment.issues.push(`Completion payment API failed: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 6: Real Wallet Balance API Test', () => {
    it('should update freelancer wallet balance after payments via real API', async () => {
      if (!upfrontInvoiceNumber || !completionInvoiceNumber) {
        prognosisReport.walletUpdates.status = 'FAIL';
        prognosisReport.walletUpdates.issues.push('Cannot test wallet updates without valid invoice numbers from previous phases');
        return;
      }

      try {
        // Test upfront payment execution
        const upfrontPaymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: upfrontInvoiceNumber })
        });

        const upfrontResult = await upfrontPaymentResponse.json();
        console.log('🔍 Upfront Payment Execution API Response:', JSON.stringify(upfrontResult, null, 2));

        // Test completion payment execution
        const completionPaymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: completionInvoiceNumber })
        });

        const completionResult = await completionPaymentResponse.json();
        console.log('🔍 Completion Payment Execution API Response:', JSON.stringify(completionResult, null, 2));

        // Test wallet balance retrieval
        const walletResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/wallet`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const walletResult = await walletResponse.json();
        console.log('🔍 Wallet Balance API Response:', JSON.stringify(walletResult, null, 2));

        if (upfrontPaymentResponse.ok && completionPaymentResponse.ok && walletResponse.ok) {
          if (upfrontResult.success && completionResult.success && walletResult.success) {
            prognosisReport.walletUpdates.status = 'PASS';
            prognosisReport.walletUpdates.details = {
              upfrontPaymentSuccess: upfrontResult.success,
              completionPaymentSuccess: completionResult.success,
              walletBalance: walletResult.entities?.wallet?.availableBalance || 'N/A'
            };
          } else {
            prognosisReport.walletUpdates.status = 'FAIL';
            if (!upfrontResult.success) {
              prognosisReport.walletUpdates.issues.push('Upfront payment execution failed');
            }
            if (!completionResult.success) {
              prognosisReport.walletUpdates.issues.push('Completion payment execution failed');
            }
            if (!walletResult.success) {
              prognosisReport.walletUpdates.issues.push('Wallet balance retrieval failed');
            }
          }
        } else {
          prognosisReport.walletUpdates.status = 'FAIL';
          if (!upfrontPaymentResponse.ok) {
            prognosisReport.walletUpdates.issues.push(`Upfront payment HTTP ${upfrontPaymentResponse.status}`);
          }
          if (!completionPaymentResponse.ok) {
            prognosisReport.walletUpdates.issues.push(`Completion payment HTTP ${completionPaymentResponse.status}`);
          }
          if (!walletResponse.ok) {
            prognosisReport.walletUpdates.issues.push(`Wallet API HTTP ${walletResponse.status}`);
          }
        }

        expect(upfrontPaymentResponse.ok).toBe(true);
        expect(completionPaymentResponse.ok).toBe(true);
        expect(walletResponse.ok).toBe(true);
      } catch (error) {
        prognosisReport.walletUpdates.status = 'FAIL';
        prognosisReport.walletUpdates.issues.push(`Wallet update API testing failed: ${error}`);
        throw error;
      }
    });
  });
});
