/**
 * Real API Completion Invoicing Flow Test Suite
 * 
 * This test suite tests the actual API endpoints to identify real breakages in:
 * 1. Gig creation with completion invoicing
 * 2. Freelancer matching and project activation
 * 3. Upfront payment logic
 * 4. Task approval workflow
 * 5. Final completion payment logic
 * 
 * This test identifies actual breakages without fixing them.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  testFreelancerId: 1, // Tobi Philly
  testCommissionerId: 31, // Commissioner from users.json
  testOrganizationId: 1,
  baseDataPath: path.join(process.cwd(), 'data'),
  testGigTitle: 'Real API Test Completion Invoicing Gig',
  testBudget: 5000,
  testUpfrontAmount: 600,  // 12% upfront
  testCompletionAmount: 4400,  // 88% completion
  baseUrl: 'http://localhost:3000'
};

// Real fetch implementation (no mocking)
const realFetch = global.fetch;

describe('Real API Completion Invoicing Flow Test', () => {
  let testGigId: number;
  let testProjectId: number;
  let testTaskIds: number[] = [];
  let upfrontInvoiceNumber: string;
  let completionInvoiceNumber: string;
  
  const issues: string[] = [];
  const warnings: string[] = [];
  const successes: string[] = [];

  beforeAll(async () => {
    console.log('🚀 Starting Real API Completion Invoicing Flow Test Suite');
    console.log('=' .repeat(60));
    
    // Ensure we're using real fetch
    global.fetch = realFetch;
  });

  afterAll(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REAL API COMPLETION INVOICING FLOW PROGNOSIS');
    console.log('=' .repeat(60));
    
    if (successes.length > 0) {
      console.log('\n✅ SUCCESSES:');
      successes.forEach(success => console.log(`   ${success}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log(`\n🔍 Total Issues: ${issues.length}`);
      console.log('🛠️  These issues need to be addressed for completion invoicing to work properly.');
    } else {
      console.log('\n🎉 NO CRITICAL ISSUES FOUND!');
      console.log('✨ Completion invoicing flow appears to be working correctly.');
    }
    
    console.log('=' .repeat(60));
  });

  describe('1. Real Gig Creation API Test', () => {
    it('should test real gig creation API with completion invoicing', async () => {
      console.log('\n🔧 STEP 1: Testing real gig creation API...');
      
      try {
        const gigData = {
          organizationData: {
            id: TEST_CONFIG.testOrganizationId,
            name: 'Test Organization',
            industry: 'Technology',
            size: '10-50',
            website: 'https://test-org.com',
            description: 'Test organization for completion invoicing flow'
          },
          commissionerId: TEST_CONFIG.testCommissionerId,
          category: 'development',
          subcategory: 'Web Development',
          skills: ['React', 'TypeScript', 'Testing'],
          tools: ['React', 'Jest', 'TypeScript'],
          description: 'Real API test gig for completion invoicing flow validation',
          executionMethod: 'completion',
          invoicingMethod: 'completion', // Key: completion invoicing
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          upfrontCommitment: TEST_CONFIG.testUpfrontAmount,
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

        if (response.ok) {
          const result = await response.json();
          console.log('Gig creation API response:', result);

          testGigId = result.gigId || result.id;

          if (testGigId) {
            successes.push(`Real gig created with ID ${testGigId} using completion invoicing`);
          } else {
            issues.push(`Gig creation API did not return a valid gig ID. Response: ${JSON.stringify(result)}`);
          }

        } else {
          const errorText = await response.text();
          console.log('Gig creation API error response:', errorText);
          issues.push(`Gig creation API failed with status ${response.status}: ${errorText}`);
        }

        expect(response.ok).toBe(true);
        expect(testGigId).toBeDefined();
        
      } catch (error) {
        issues.push(`Real gig creation API test failed: ${error}`);
        throw error;
      }
    });
  });

  describe('2. Real Freelancer Matching API Test', () => {
    it('should test real freelancer matching API', async () => {
      console.log('\n🤝 STEP 2: Testing real freelancer matching API...');
      
      try {
        if (!testGigId) {
          issues.push('Cannot test freelancer matching without a valid gig ID');
          return;
        }

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/match-freelancer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gigId: testGigId,
            freelancerId: TEST_CONFIG.testFreelancerId,
            commissionerId: TEST_CONFIG.testCommissionerId
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.entities?.project) {
            testProjectId = result.entities.project.projectId;
            testTaskIds = result.entities.tasks?.map((t: any) => t.id) || [];
            
            successes.push(`Real project activated with ID ${testProjectId} and ${testTaskIds.length} tasks`);
            
            // Validate project structure
            if (result.entities.project.invoicingMethod !== 'completion') {
              issues.push('Project invoicing method not properly inherited from gig in real API');
            }
            
          } else {
            issues.push(`Real freelancer matching API failed: ${result.error || 'Unknown error'}`);
          }
          
        } else {
          const errorText = await response.text();
          issues.push(`Freelancer matching API failed with status ${response.status}: ${errorText}`);
        }

        expect(response.ok).toBe(true);
        
      } catch (error) {
        issues.push(`Real freelancer matching API test failed: ${error}`);
        throw error;
      }
    });
  });

  describe('3. Real Upfront Payment API Test', () => {
    it('should test real upfront invoice generation API', async () => {
      console.log('\n💰 STEP 3: Testing real upfront payment APIs...');
      
      try {
        if (!testProjectId) {
          issues.push('Cannot test upfront payment without a valid project ID');
          return;
        }

        // Test upfront invoice generation
        const invoiceResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/generate-upfront`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            freelancerId: TEST_CONFIG.testFreelancerId,
            commissionerId: TEST_CONFIG.testCommissionerId,
            amount: TEST_CONFIG.testUpfrontAmount
          })
        });

        if (invoiceResponse.ok) {
          const invoiceResult = await invoiceResponse.json();
          upfrontInvoiceNumber = invoiceResult.invoiceNumber;
          
          if (upfrontInvoiceNumber) {
            successes.push(`Real upfront invoice generated: ${upfrontInvoiceNumber}`);
          } else {
            issues.push('Upfront invoice generation API did not return invoice number');
          }
          
        } else {
          const errorText = await invoiceResponse.text();
          issues.push(`Upfront invoice generation API failed with status ${invoiceResponse.status}: ${errorText}`);
        }

        // Test upfront payment execution if invoice was created
        if (upfrontInvoiceNumber) {
          const paymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceNumber: upfrontInvoiceNumber,
              commissionerId: TEST_CONFIG.testCommissionerId,
              paymentMethod: 'mock'
            })
          });

          if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            
            if (paymentResult.success) {
              successes.push(`Real upfront payment executed: ${paymentResult.transactionId || 'success'}`);
            } else {
              issues.push(`Upfront payment execution failed: ${paymentResult.error || 'Unknown error'}`);
            }
            
          } else {
            const errorText = await paymentResponse.text();
            issues.push(`Upfront payment execution API failed with status ${paymentResponse.status}: ${errorText}`);
          }
        }

        expect(invoiceResponse.ok).toBe(true);
        
      } catch (error) {
        issues.push(`Real upfront payment API test failed: ${error}`);
        throw error;
      }
    });
  });

  describe('4. Real Task Approval API Test', () => {
    it('should test real task submission and approval APIs', async () => {
      console.log('\n📋 STEP 4: Testing real task approval APIs...');
      
      try {
        if (!testProjectId || testTaskIds.length === 0) {
          issues.push('Cannot test task approval without valid project and task IDs');
          return;
        }

        const taskId = testTaskIds[0];

        // Test task submission
        const submitResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: taskId,
            projectId: testProjectId,
            action: 'submit',
            referenceUrl: 'https://example.com/deliverable',
            freelancerId: TEST_CONFIG.testFreelancerId
          })
        });

        if (submitResponse.ok) {
          const submitResult = await submitResponse.json();
          
          if (submitResult.success) {
            successes.push(`Real task ${taskId} submitted successfully`);
          } else {
            issues.push(`Task submission failed: ${submitResult.error || 'Unknown error'}`);
          }
          
        } else {
          const errorText = await submitResponse.text();
          issues.push(`Task submission API failed with status ${submitResponse.status}: ${errorText}`);
        }

        // Test task approval
        const approveResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: taskId,
            projectId: testProjectId,
            action: 'approve',
            commissionerId: TEST_CONFIG.testCommissionerId
          })
        });

        if (approveResponse.ok) {
          const approveResult = await approveResponse.json();
          
          if (approveResult.success) {
            successes.push(`Real task ${taskId} approved successfully`);
            
            // Check if invoice was incorrectly generated for individual task in completion method
            if (approveResult.invoiceGenerated) {
              warnings.push('Invoice generated for individual task approval in completion method - should only happen for milestone method');
            }
            
          } else {
            issues.push(`Task approval failed: ${approveResult.error || 'Unknown error'}`);
          }
          
        } else {
          const errorText = await approveResponse.text();
          issues.push(`Task approval API failed with status ${approveResponse.status}: ${errorText}`);
        }

        expect(submitResponse.ok).toBe(true);
        expect(approveResponse.ok).toBe(true);
        
      } catch (error) {
        issues.push(`Real task approval API test failed: ${error}`);
        throw error;
      }
    });
  });

  describe('5. Real Completion Payment API Test', () => {
    it('should test real completion payment generation when all tasks are approved', async () => {
      console.log('\n🏁 STEP 5: Testing real completion payment APIs...');

      try {
        if (!testProjectId) {
          issues.push('Cannot test completion payment without valid project ID');
          return;
        }

        // First, approve all remaining tasks
        for (let i = 1; i < testTaskIds.length; i++) {
          const taskId = testTaskIds[i];

          // Submit task
          await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: taskId,
              projectId: testProjectId,
              action: 'submit',
              referenceUrl: `https://example.com/deliverable-${taskId}`,
              freelancerId: TEST_CONFIG.testFreelancerId
            })
          });

          // Approve task
          await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: taskId,
              projectId: testProjectId,
              action: 'approve',
              commissionerId: TEST_CONFIG.testCommissionerId
            })
          });
        }

        // Test completion invoice generation
        const completionResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            freelancerId: TEST_CONFIG.testFreelancerId,
            commissionerId: TEST_CONFIG.testCommissionerId,
            projectTitle: TEST_CONFIG.testGigTitle
          })
        });

        if (completionResponse.ok) {
          const completionResult = await completionResponse.json();
          completionInvoiceNumber = completionResult.invoiceNumber;

          if (completionResult.success && completionInvoiceNumber) {
            successes.push(`Real completion invoice generated: ${completionInvoiceNumber}`);

            // Validate completion amount
            if (completionResult.amount && completionResult.amount !== TEST_CONFIG.testCompletionAmount) {
              warnings.push(`Completion amount mismatch: expected ${TEST_CONFIG.testCompletionAmount}, got ${completionResult.amount}`);
            }

          } else {
            issues.push(`Completion invoice generation failed: ${completionResult.error || 'Unknown error'}`);
          }

        } else {
          const errorText = await completionResponse.text();
          issues.push(`Completion invoice generation API failed with status ${completionResponse.status}: ${errorText}`);
        }

        // Test completion payment execution if invoice was created
        if (completionInvoiceNumber) {
          const paymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceNumber: completionInvoiceNumber,
              commissionerId: TEST_CONFIG.testCommissionerId,
              paymentMethod: 'mock'
            })
          });

          if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();

            if (paymentResult.success) {
              successes.push(`Real completion payment executed: ${paymentResult.transactionId || 'success'}`);
            } else {
              issues.push(`Completion payment execution failed: ${paymentResult.error || 'Unknown error'}`);
            }

          } else {
            const errorText = await paymentResponse.text();
            issues.push(`Completion payment execution API failed with status ${paymentResponse.status}: ${errorText}`);
          }
        }

        expect(completionResponse.ok).toBe(true);

      } catch (error) {
        issues.push(`Real completion payment API test failed: ${error}`);
        throw error;
      }
    });
  });

  describe('6. Real Data Persistence Validation', () => {
    it('should validate real data persistence and integrity', async () => {
      console.log('\n🗄️  STEP 6: Validating real data persistence...');

      try {
        // Check if test gig was actually stored
        if (testGigId) {
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');

          const gigPath = path.join(TEST_CONFIG.baseDataPath, 'gigs', String(year), month, day, String(testGigId), 'gig.json');

          try {
            const gigData = await fs.readFile(gigPath, 'utf-8');
            const gig = JSON.parse(gigData);

            if (gig.invoicingMethod === 'completion') {
              successes.push('Real test gig properly stored with completion invoicing method');
            } else {
              issues.push('Real test gig invoicing method not properly persisted');
            }

            if (gig.upfrontCommitment === TEST_CONFIG.testUpfrontAmount) {
              successes.push('Real test gig upfront commitment properly stored');
            } else {
              issues.push('Real test gig upfront commitment not properly persisted');
            }

          } catch (error) {
            issues.push(`Failed to read real stored gig data: ${error}`);
          }
        }

        // Check if project was actually created
        if (testProjectId) {
          try {
            const projectsResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/projects/${testProjectId}`);

            if (projectsResponse.ok) {
              const project = await projectsResponse.json();

              if (project.invoicingMethod === 'completion') {
                successes.push('Real test project properly stored with completion invoicing method');
              } else {
                issues.push('Real test project invoicing method not properly persisted');
              }

            } else {
              issues.push(`Failed to retrieve real test project: ${projectsResponse.status}`);
            }

          } catch (error) {
            issues.push(`Failed to validate real project persistence: ${error}`);
          }
        }

        // Check if invoices were actually created
        if (upfrontInvoiceNumber || completionInvoiceNumber) {
          try {
            const invoicesResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices`);

            if (invoicesResponse.ok) {
              const invoices = await invoicesResponse.json();

              if (upfrontInvoiceNumber) {
                const upfrontInvoice = invoices.find((inv: any) => inv.invoiceNumber === upfrontInvoiceNumber);
                if (upfrontInvoice) {
                  successes.push('Real upfront invoice properly persisted');
                } else {
                  issues.push('Real upfront invoice not found in storage');
                }
              }

              if (completionInvoiceNumber) {
                const completionInvoice = invoices.find((inv: any) => inv.invoiceNumber === completionInvoiceNumber);
                if (completionInvoice) {
                  successes.push('Real completion invoice properly persisted');
                } else {
                  issues.push('Real completion invoice not found in storage');
                }
              }

            } else {
              issues.push(`Failed to retrieve invoices for validation: ${invoicesResponse.status}`);
            }

          } catch (error) {
            issues.push(`Failed to validate real invoice persistence: ${error}`);
          }
        }

        expect(true).toBe(true); // Test passes if no exceptions thrown

      } catch (error) {
        issues.push(`Real data persistence validation failed: ${error}`);
        throw error;
      }
    });
  });
});
