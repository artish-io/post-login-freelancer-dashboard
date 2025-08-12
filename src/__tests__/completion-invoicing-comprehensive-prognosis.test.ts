/**
 * COMPLETION INVOICING COMPREHENSIVE PROGNOSIS TEST
 * ================================================
 * 
 * This test creates a comprehensive prognosis of the completion invoicing workflow:
 * 1. Create test gig with completion invoicing method
 * 2. Test freelancer matching to project activation logic
 * 3. Test upfront payment logic (12% upfront)
 * 4. Test task approval workflow leading to completion payment (88% remaining)
 * 5. Identify and report ALL breakages without fixing them
 * 
 * FOCUS: Comprehensive diagnosis, not fixes
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
  testGigTitle: 'COMPREHENSIVE Completion Invoicing Prognosis Test Gig',
  testBudget: 10000,
  testUpfrontAmount: 1200,  // 12% upfront
  testCompletionAmount: 8800,  // 88% completion
  baseUrl: 'http://localhost:3000',
  testTaskCount: 3,
  timeout: 30000 // 30 second timeout for API calls
};

// Test state tracking
let testGigId: number | null = null;
let testProjectId: number | null = null;
let testTaskIds: number[] = [];
let upfrontInvoiceNumber: string | null = null;
let completionInvoiceNumber: string | null = null;

// Comprehensive prognosis tracking
const prognosisReport = {
  gigCreation: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  freelancerMatching: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  projectActivation: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  upfrontPayment: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  taskApproval: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  completionPayment: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  autoCompletion: { 
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED', 
    issues: [] as string[], 
    details: null as any,
    apiResponse: null as any,
    dataValidation: null as any
  },
  dataIntegrity: {
    status: 'PENDING' as 'PENDING' | 'SUCCESS' | 'FAILED',
    issues: [] as string[],
    details: null as any
  }
};

// Utility functions
async function makeApiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`🌐 API Call: ${method} ${url}`);
  if (body) console.log(`📤 Request Body:`, JSON.stringify(body, null, 2));

  const response = await fetch(url, options);
  const responseData = await response.json();
  
  console.log(`📥 Response Status: ${response.status}`);
  console.log(`📥 Response Data:`, JSON.stringify(responseData, null, 2));

  return { status: response.status, data: responseData, ok: response.ok };
}

async function validateDataExists(filePath: string, description: string): Promise<{ exists: boolean, data?: any, error?: string }> {
  try {
    const fullPath = path.join(TEST_CONFIG.baseDataPath, filePath);
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    
    if (!exists) {
      return { exists: false, error: `File does not exist: ${fullPath}` };
    }

    const data = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
    console.log(`✅ Data validation passed for ${description}: ${fullPath}`);
    return { exists: true, data };
  } catch (error) {
    const errorMsg = `Data validation failed for ${description}: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return { exists: false, error: errorMsg };
  }
}

async function findProjectInHierarchy(projectId: number): Promise<{ found: boolean, data?: any, path?: string, error?: string }> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');
    
    // Check hierarchical project storage
    const hierarchicalPath = `projects/${currentYear}/${currentMonth}/${currentDay}/${projectId}/project.json`;
    const validation = await validateDataExists(hierarchicalPath, `Project ${projectId} in hierarchical storage`);
    
    if (validation.exists) {
      return { found: true, data: validation.data, path: hierarchicalPath };
    }

    // Check legacy projects.json
    const legacyValidation = await validateDataExists('projects.json', 'Legacy projects file');
    if (legacyValidation.exists) {
      const project = legacyValidation.data.find((p: any) => p.projectId === projectId);
      if (project) {
        return { found: true, data: project, path: 'projects.json' };
      }
    }

    return { found: false, error: `Project ${projectId} not found in hierarchical or legacy storage` };
  } catch (error) {
    return { found: false, error: `Error searching for project ${projectId}: ${error}` };
  }
}

async function findTasksForProject(projectId: number): Promise<{ found: boolean, tasks?: any[], path?: string, error?: string }> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');
    
    // Check hierarchical task storage
    const hierarchicalPath = `project-tasks/${currentYear}/${currentMonth}/${currentDay}`;
    const fullPath = path.join(TEST_CONFIG.baseDataPath, hierarchicalPath);
    
    try {
      const files = await fs.readdir(fullPath);
      const tasks = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const taskData = JSON.parse(await fs.readFile(path.join(fullPath, file), 'utf-8'));
          if (taskData.projectId === projectId) {
            tasks.push(taskData);
          }
        }
      }
      
      if (tasks.length > 0) {
        return { found: true, tasks, path: hierarchicalPath };
      }
    } catch (error) {
      // Hierarchical storage might not exist yet
    }

    // Check legacy project-tasks.json
    const legacyValidation = await validateDataExists('project-tasks.json', 'Legacy project tasks file');
    if (legacyValidation.exists) {
      const projectTasks = legacyValidation.data.filter((t: any) => t.projectId === projectId);
      if (projectTasks.length > 0) {
        return { found: true, tasks: projectTasks, path: 'project-tasks.json' };
      }
    }

    return { found: false, error: `No tasks found for project ${projectId}` };
  } catch (error) {
    return { found: false, error: `Error searching for tasks for project ${projectId}: ${error}` };
  }
}

async function findInvoicesForProject(projectId: number): Promise<{ found: boolean, invoices?: any[], paths?: string[], error?: string }> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');
    
    const invoices = [];
    const paths = [];
    
    // Check hierarchical invoice storage
    const hierarchicalPath = `invoices/${currentYear}/${currentMonth}/${currentDay}`;
    const fullPath = path.join(TEST_CONFIG.baseDataPath, hierarchicalPath);
    
    try {
      const files = await fs.readdir(fullPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const invoiceData = JSON.parse(await fs.readFile(path.join(fullPath, file), 'utf-8'));
          if (invoiceData.projectId === projectId) {
            invoices.push(invoiceData);
            paths.push(`${hierarchicalPath}/${file}`);
          }
        }
      }
    } catch (error) {
      // Hierarchical storage might not exist yet
    }

    return invoices.length > 0 
      ? { found: true, invoices, paths }
      : { found: false, error: `No invoices found for project ${projectId}` };
  } catch (error) {
    return { found: false, error: `Error searching for invoices for project ${projectId}: ${error}` };
  }
}

describe('🔍 COMPLETION INVOICING COMPREHENSIVE PROGNOSIS', () => {
  // Set longer timeout for comprehensive testing
  jest.setTimeout(TEST_CONFIG.timeout);

  beforeAll(async () => {
    console.log('\n🚀 Starting Completion Invoicing Comprehensive Prognosis...');
    console.log('📋 Test Configuration:', TEST_CONFIG);
  });

  afterAll(async () => {
    console.log('\n📊 COMPREHENSIVE PROGNOSIS REPORT');
    console.log('=====================================');

    Object.entries(prognosisReport).forEach(([phase, report]) => {
      const statusIcon = report.status === 'SUCCESS' ? '✅' : report.status === 'FAILED' ? '❌' : '⏳';
      console.log(`\n${statusIcon} ${phase.toUpperCase()}: ${report.status}`);

      if (report.issues.length > 0) {
        console.log('  🚨 Issues:');
        report.issues.forEach(issue => console.log(`    - ${issue}`));
      }

      if (report.details) {
        console.log('  📝 Details:', JSON.stringify(report.details, null, 2));
      }
    });

    console.log('\n🎯 SUMMARY');
    console.log('===========');
    const phases = Object.keys(prognosisReport);
    const successful = phases.filter(phase => prognosisReport[phase as keyof typeof prognosisReport].status === 'SUCCESS').length;
    const failed = phases.filter(phase => prognosisReport[phase as keyof typeof prognosisReport].status === 'FAILED').length;
    const pending = phases.filter(phase => prognosisReport[phase as keyof typeof prognosisReport].status === 'PENDING').length;

    console.log(`✅ Successful: ${successful}/${phases.length}`);
    console.log(`❌ Failed: ${failed}/${phases.length}`);
    console.log(`⏳ Pending: ${pending}/${phases.length}`);

    const totalIssues = Object.values(prognosisReport).reduce((sum, report) => sum + report.issues.length, 0);
    console.log(`🚨 Total Issues Identified: ${totalIssues}`);
  });

  describe('Phase 1: Gig Creation with Completion Invoicing', () => {
    it('should create a test gig with completion invoicing method', async () => {
      try {
        console.log('\n🎯 Phase 1: Creating test gig with completion invoicing...');

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
          description: 'COMPREHENSIVE test gig for completion invoicing flow validation',
          lowerBudget: TEST_CONFIG.testBudget,
          upperBudget: TEST_CONFIG.testBudget,
          deliveryTimeWeeks: 4,
          estimatedHours: 100,
          startType: 'Immediately',
          isPublic: true,
          isTargetedRequest: false
        };

        const response = await makeApiCall('/api/gigs/post', 'POST', gigData);
        prognosisReport.gigCreation.apiResponse = response;

        if (!response.ok) {
          prognosisReport.gigCreation.status = 'FAILED';
          prognosisReport.gigCreation.issues.push(`API call failed with status ${response.status}`);
          prognosisReport.gigCreation.issues.push(`Response: ${JSON.stringify(response.data)}`);
          return;
        }

        if (!response.data.success || !response.data.gigId) {
          prognosisReport.gigCreation.status = 'FAILED';
          prognosisReport.gigCreation.issues.push('API response missing success flag or gigId');
          prognosisReport.gigCreation.issues.push(`Response data: ${JSON.stringify(response.data)}`);
          return;
        }

        testGigId = response.data.gigId;
        prognosisReport.gigCreation.details = { gigId: testGigId, gigData };

        // Validate gig was stored correctly
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const currentDay = String(new Date().getDate()).padStart(2, '0');

        const gigPath = `gigs/${currentYear}/${currentMonth}/${currentDay}/${testGigId}/gig.json`;
        const validation = await validateDataExists(gigPath, `Gig ${testGigId} in hierarchical storage`);

        prognosisReport.gigCreation.dataValidation = validation;

        if (!validation.exists) {
          prognosisReport.gigCreation.issues.push(`Gig not found in hierarchical storage: ${gigPath}`);
          prognosisReport.gigCreation.issues.push(validation.error || 'Unknown storage error');
        } else {
          // Validate gig data integrity
          const storedGig = validation.data;
          if (storedGig.executionMethod !== 'completion') {
            prognosisReport.gigCreation.issues.push(`Stored gig has wrong executionMethod: ${storedGig.executionMethod} (expected: completion)`);
          }
          if (storedGig.invoicingMethod !== 'completion') {
            prognosisReport.gigCreation.issues.push(`Stored gig has wrong invoicingMethod: ${storedGig.invoicingMethod} (expected: completion)`);
          }
          if (storedGig.commissionerId !== TEST_CONFIG.testCommissionerId) {
            prognosisReport.gigCreation.issues.push(`Stored gig has wrong commissionerId: ${storedGig.commissionerId} (expected: ${TEST_CONFIG.testCommissionerId})`);
          }
        }

        prognosisReport.gigCreation.status = prognosisReport.gigCreation.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Gig creation phase completed with ${prognosisReport.gigCreation.issues.length} issues`);

      } catch (error) {
        prognosisReport.gigCreation.status = 'FAILED';
        prognosisReport.gigCreation.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Gig creation failed:', error);
      }
    });
  });

  describe('Phase 2: Freelancer Matching and Project Activation', () => {
    it('should test freelancer matching to project activation logic', async () => {
      try {
        console.log('\n🎯 Phase 2: Testing freelancer matching and project activation...');

        if (!testGigId) {
          prognosisReport.freelancerMatching.status = 'FAILED';
          prognosisReport.freelancerMatching.issues.push('No test gig ID available from previous phase');
          prognosisReport.projectActivation.status = 'FAILED';
          prognosisReport.projectActivation.issues.push('Cannot test project activation without gig');
          return;
        }

        // Test freelancer matching via test endpoint
        const matchData = {
          gigId: testGigId,
          freelancerId: TEST_CONFIG.testFreelancerId,
          commissionerId: TEST_CONFIG.testCommissionerId
        };

        const response = await makeApiCall('/api/test/match-freelancer', 'POST', matchData);
        prognosisReport.freelancerMatching.apiResponse = response;

        if (!response.ok) {
          prognosisReport.freelancerMatching.status = 'FAILED';
          prognosisReport.freelancerMatching.issues.push(`Freelancer matching API failed with status ${response.status}`);
          prognosisReport.freelancerMatching.issues.push(`Response: ${JSON.stringify(response.data)}`);
          return;
        }

        if (!response.data.success || !response.data.projectId) {
          prognosisReport.freelancerMatching.status = 'FAILED';
          prognosisReport.freelancerMatching.issues.push('Freelancer matching response missing success flag or projectId');
          prognosisReport.freelancerMatching.issues.push(`Response data: ${JSON.stringify(response.data)}`);
          return;
        }

        testProjectId = response.data.projectId;
        prognosisReport.freelancerMatching.details = { projectId: testProjectId, matchData };
        prognosisReport.freelancerMatching.status = 'SUCCESS';

        // Now test project activation - validate project was created correctly
        console.log('\n🔍 Validating project activation...');

        const projectSearch = await findProjectInHierarchy(testProjectId);
        prognosisReport.projectActivation.dataValidation = projectSearch;

        if (!projectSearch.found) {
          prognosisReport.projectActivation.status = 'FAILED';
          prognosisReport.projectActivation.issues.push(`Project ${testProjectId} not found in storage`);
          prognosisReport.projectActivation.issues.push(projectSearch.error || 'Unknown project search error');
        } else {
          const project = projectSearch.data;
          prognosisReport.projectActivation.details = { project, storagePath: projectSearch.path };

          // Validate project data integrity
          if (project.invoicingMethod !== 'completion') {
            prognosisReport.projectActivation.issues.push(`Project has wrong invoicingMethod: ${project.invoicingMethod} (expected: completion)`);
          }
          if (project.freelancerId !== TEST_CONFIG.testFreelancerId) {
            prognosisReport.projectActivation.issues.push(`Project has wrong freelancerId: ${project.freelancerId} (expected: ${TEST_CONFIG.testFreelancerId})`);
          }
          if (project.commissionerId !== TEST_CONFIG.testCommissionerId) {
            prognosisReport.projectActivation.issues.push(`Project has wrong commissionerId: ${project.commissionerId} (expected: ${TEST_CONFIG.testCommissionerId})`);
          }
          if (project.status !== 'ongoing') {
            prognosisReport.projectActivation.issues.push(`Project has wrong status: ${project.status} (expected: ongoing)`);
          }

          // Validate tasks were created
          const tasksSearch = await findTasksForProject(testProjectId);
          if (!tasksSearch.found) {
            prognosisReport.projectActivation.issues.push(`No tasks found for project ${testProjectId}`);
            prognosisReport.projectActivation.issues.push(tasksSearch.error || 'Unknown task search error');
          } else {
            testTaskIds = tasksSearch.tasks!.map(task => task.taskId || task.id);
            prognosisReport.projectActivation.details.tasks = tasksSearch.tasks;
            prognosisReport.projectActivation.details.taskStoragePath = tasksSearch.path;

            if (tasksSearch.tasks!.length === 0) {
              prognosisReport.projectActivation.issues.push('No tasks created for project');
            }
          }
        }

        prognosisReport.projectActivation.status = prognosisReport.projectActivation.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Project activation phase completed with ${prognosisReport.projectActivation.issues.length} issues`);

      } catch (error) {
        prognosisReport.freelancerMatching.status = 'FAILED';
        prognosisReport.projectActivation.status = 'FAILED';
        prognosisReport.freelancerMatching.issues.push(`Unexpected error: ${error}`);
        prognosisReport.projectActivation.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Freelancer matching/project activation failed:', error);
      }
    });
  });

  describe('Phase 3: Upfront Payment Logic', () => {
    it('should test upfront payment generation (12% upfront)', async () => {
      try {
        console.log('\n🎯 Phase 3: Testing upfront payment logic...');

        if (!testProjectId) {
          prognosisReport.upfrontPayment.status = 'FAILED';
          prognosisReport.upfrontPayment.issues.push('No test project ID available from previous phase');
          return;
        }

        // Generate upfront invoice
        const upfrontData = {
          projectId: testProjectId,
          upfrontPercent: 12 // 12% upfront
        };

        const response = await makeApiCall('/api/invoices/generate-upfront', 'POST', upfrontData);
        prognosisReport.upfrontPayment.apiResponse = response;

        if (!response.ok) {
          prognosisReport.upfrontPayment.status = 'FAILED';
          prognosisReport.upfrontPayment.issues.push(`Upfront invoice generation API failed with status ${response.status}`);
          prognosisReport.upfrontPayment.issues.push(`Response: ${JSON.stringify(response.data)}`);
          return;
        }

        if (!response.data.success || !response.data.invoiceNumber) {
          prognosisReport.upfrontPayment.status = 'FAILED';
          prognosisReport.upfrontPayment.issues.push('Upfront invoice response missing success flag or invoiceNumber');
          prognosisReport.upfrontPayment.issues.push(`Response data: ${JSON.stringify(response.data)}`);
          return;
        }

        upfrontInvoiceNumber = response.data.invoiceNumber;
        prognosisReport.upfrontPayment.details = {
          invoiceNumber: upfrontInvoiceNumber,
          amount: response.data.amount,
          expectedAmount: TEST_CONFIG.testUpfrontAmount
        };

        // Validate invoice amount calculation
        const actualAmount = response.data.amount;
        const expectedAmount = Math.round(TEST_CONFIG.testBudget * 0.12); // 12%

        if (actualAmount !== expectedAmount) {
          prognosisReport.upfrontPayment.issues.push(`Upfront amount calculation incorrect: ${actualAmount} (expected: ${expectedAmount})`);
        }

        // Validate invoice was stored correctly
        const invoicesSearch = await findInvoicesForProject(testProjectId);
        prognosisReport.upfrontPayment.dataValidation = invoicesSearch;

        if (!invoicesSearch.found) {
          prognosisReport.upfrontPayment.issues.push(`No invoices found for project ${testProjectId}`);
          prognosisReport.upfrontPayment.issues.push(invoicesSearch.error || 'Unknown invoice search error');
        } else {
          const upfrontInvoice = invoicesSearch.invoices!.find(inv => inv.type === 'upfront');
          if (!upfrontInvoice) {
            prognosisReport.upfrontPayment.issues.push('No upfront invoice found in stored invoices');
          } else {
            if (upfrontInvoice.method !== 'completion') {
              prognosisReport.upfrontPayment.issues.push(`Upfront invoice has wrong method: ${upfrontInvoice.method} (expected: completion)`);
            }
            if (upfrontInvoice.status !== 'unpaid') {
              prognosisReport.upfrontPayment.issues.push(`Upfront invoice has wrong status: ${upfrontInvoice.status} (expected: unpaid)`);
            }
            if (upfrontInvoice.amount !== expectedAmount) {
              prognosisReport.upfrontPayment.issues.push(`Stored upfront invoice has wrong amount: ${upfrontInvoice.amount} (expected: ${expectedAmount})`);
            }
          }
        }

        prognosisReport.upfrontPayment.status = prognosisReport.upfrontPayment.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Upfront payment phase completed with ${prognosisReport.upfrontPayment.issues.length} issues`);

      } catch (error) {
        prognosisReport.upfrontPayment.status = 'FAILED';
        prognosisReport.upfrontPayment.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Upfront payment failed:', error);
      }
    });
  });

  describe('Phase 4: Task Approval Workflow', () => {
    it('should test task approval workflow', async () => {
      try {
        console.log('\n🎯 Phase 4: Testing task approval workflow...');

        if (!testProjectId || testTaskIds.length === 0) {
          prognosisReport.taskApproval.status = 'FAILED';
          prognosisReport.taskApproval.issues.push('No test project ID or task IDs available from previous phases');
          return;
        }

        const approvalResults = [];

        // Submit and approve each task
        for (const taskId of testTaskIds) {
          console.log(`📝 Processing task ${taskId}...`);

          // First submit the task
          const submitResponse = await makeApiCall('/api/project-tasks/submit', 'POST', {
            taskId,
            action: 'submit',
            referenceUrl: 'https://example.com/task-submission'
          });

          if (!submitResponse.ok) {
            prognosisReport.taskApproval.issues.push(`Task ${taskId} submission failed with status ${submitResponse.status}`);
            continue;
          }

          // Then approve the task
          const approveResponse = await makeApiCall('/api/project-tasks/submit', 'POST', {
            taskId,
            action: 'approve'
          });

          approvalResults.push({
            taskId,
            submitResponse,
            approveResponse
          });

          if (!approveResponse.ok) {
            prognosisReport.taskApproval.issues.push(`Task ${taskId} approval failed with status ${approveResponse.status}`);
          } else if (!approveResponse.data.success) {
            prognosisReport.taskApproval.issues.push(`Task ${taskId} approval response missing success flag`);
          }
        }

        prognosisReport.taskApproval.apiResponse = approvalResults;
        prognosisReport.taskApproval.details = { approvalResults };

        // Validate all tasks are now approved
        const tasksSearch = await findTasksForProject(testProjectId);
        if (tasksSearch.found) {
          const approvedTasks = tasksSearch.tasks!.filter(task => task.status === 'Approved' || task.completed === true);
          const totalTasks = tasksSearch.tasks!.length;

          prognosisReport.taskApproval.details.taskValidation = {
            totalTasks,
            approvedTasks: approvedTasks.length,
            allApproved: approvedTasks.length === totalTasks
          };

          if (approvedTasks.length !== totalTasks) {
            prognosisReport.taskApproval.issues.push(`Not all tasks approved: ${approvedTasks.length}/${totalTasks} approved`);
          }
        } else {
          prognosisReport.taskApproval.issues.push('Could not validate task approval status - tasks not found');
        }

        prognosisReport.taskApproval.status = prognosisReport.taskApproval.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Task approval phase completed with ${prognosisReport.taskApproval.issues.length} issues`);

      } catch (error) {
        prognosisReport.taskApproval.status = 'FAILED';
        prognosisReport.taskApproval.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Task approval failed:', error);
      }
    });
  });

  describe('Phase 5: Completion Payment Logic', () => {
    it('should test completion payment generation (88% remaining)', async () => {
      try {
        console.log('\n🎯 Phase 5: Testing completion payment logic...');

        if (!testProjectId) {
          prognosisReport.completionPayment.status = 'FAILED';
          prognosisReport.completionPayment.issues.push('No test project ID available from previous phases');
          return;
        }

        // Generate completion invoice
        const completionData = {
          projectId: testProjectId
        };

        const response = await makeApiCall('/api/invoices/auto-generate-completion', 'POST', completionData);
        prognosisReport.completionPayment.apiResponse = response;

        if (!response.ok) {
          prognosisReport.completionPayment.status = 'FAILED';
          prognosisReport.completionPayment.issues.push(`Completion invoice generation API failed with status ${response.status}`);
          prognosisReport.completionPayment.issues.push(`Response: ${JSON.stringify(response.data)}`);
          return;
        }

        if (!response.data.success || !response.data.invoiceNumber) {
          prognosisReport.completionPayment.status = 'FAILED';
          prognosisReport.completionPayment.issues.push('Completion invoice response missing success flag or invoiceNumber');
          prognosisReport.completionPayment.issues.push(`Response data: ${JSON.stringify(response.data)}`);
          return;
        }

        completionInvoiceNumber = response.data.invoiceNumber;
        prognosisReport.completionPayment.details = {
          invoiceNumber: completionInvoiceNumber,
          amount: response.data.amount,
          expectedAmount: TEST_CONFIG.testCompletionAmount
        };

        // Validate invoice amount calculation
        const actualAmount = response.data.amount;
        const expectedAmount = TEST_CONFIG.testBudget - Math.round(TEST_CONFIG.testBudget * 0.12); // 88%

        if (actualAmount !== expectedAmount) {
          prognosisReport.completionPayment.issues.push(`Completion amount calculation incorrect: ${actualAmount} (expected: ${expectedAmount})`);
        }

        // Validate completion invoice was stored correctly
        const invoicesSearch = await findInvoicesForProject(testProjectId);
        prognosisReport.completionPayment.dataValidation = invoicesSearch;

        if (!invoicesSearch.found) {
          prognosisReport.completionPayment.issues.push(`No invoices found for project ${testProjectId}`);
        } else {
          const completionInvoice = invoicesSearch.invoices!.find(inv => inv.type === 'completion');
          if (!completionInvoice) {
            prognosisReport.completionPayment.issues.push('No completion invoice found in stored invoices');
          } else {
            if (completionInvoice.method !== 'completion') {
              prognosisReport.completionPayment.issues.push(`Completion invoice has wrong method: ${completionInvoice.method} (expected: completion)`);
            }
            if (completionInvoice.status !== 'unpaid') {
              prognosisReport.completionPayment.issues.push(`Completion invoice has wrong status: ${completionInvoice.status} (expected: unpaid)`);
            }
            if (completionInvoice.amount !== expectedAmount) {
              prognosisReport.completionPayment.issues.push(`Stored completion invoice has wrong amount: ${completionInvoice.amount} (expected: ${expectedAmount})`);
            }
          }

          // Validate we have both upfront and completion invoices
          const upfrontInvoice = invoicesSearch.invoices!.find(inv => inv.type === 'upfront');
          const completionInvoice2 = invoicesSearch.invoices!.find(inv => inv.type === 'completion');

          if (!upfrontInvoice || !completionInvoice2) {
            prognosisReport.completionPayment.issues.push('Missing either upfront or completion invoice');
          } else {
            const totalInvoiceAmount = upfrontInvoice.amount + completionInvoice2.amount;
            if (totalInvoiceAmount !== TEST_CONFIG.testBudget) {
              prognosisReport.completionPayment.issues.push(`Total invoice amounts don't match budget: ${totalInvoiceAmount} (expected: ${TEST_CONFIG.testBudget})`);
            }
          }
        }

        prognosisReport.completionPayment.status = prognosisReport.completionPayment.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Completion payment phase completed with ${prognosisReport.completionPayment.issues.length} issues`);

      } catch (error) {
        prognosisReport.completionPayment.status = 'FAILED';
        prognosisReport.completionPayment.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Completion payment failed:', error);
      }
    });
  });

  describe('Phase 6: Auto-Completion Logic', () => {
    it('should test auto-completion when all tasks are approved', async () => {
      try {
        console.log('\n🎯 Phase 6: Testing auto-completion logic...');

        if (!testProjectId) {
          prognosisReport.autoCompletion.status = 'FAILED';
          prognosisReport.autoCompletion.issues.push('No test project ID available from previous phases');
          return;
        }

        // Trigger auto-completion check
        const autoCompleteData = {
          projectId: testProjectId
        };

        const response = await makeApiCall('/api/projects/auto-complete-check', 'POST', autoCompleteData);
        prognosisReport.autoCompletion.apiResponse = response;

        if (!response.ok) {
          prognosisReport.autoCompletion.status = 'FAILED';
          prognosisReport.autoCompletion.issues.push(`Auto-completion API failed with status ${response.status}`);
          prognosisReport.autoCompletion.issues.push(`Response: ${JSON.stringify(response.data)}`);
          return;
        }

        if (!response.data.success) {
          prognosisReport.autoCompletion.status = 'FAILED';
          prognosisReport.autoCompletion.issues.push('Auto-completion response missing success flag');
          prognosisReport.autoCompletion.issues.push(`Response data: ${JSON.stringify(response.data)}`);
          return;
        }

        prognosisReport.autoCompletion.details = response.data;

        // Validate project status was updated to completed
        const projectSearch = await findProjectInHierarchy(testProjectId);
        if (projectSearch.found) {
          const project = projectSearch.data;
          if (project.status !== 'completed') {
            prognosisReport.autoCompletion.issues.push(`Project status not updated to completed: ${project.status}`);
          }
        } else {
          prognosisReport.autoCompletion.issues.push('Could not validate project completion status - project not found');
        }

        prognosisReport.autoCompletion.status = prognosisReport.autoCompletion.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Auto-completion phase completed with ${prognosisReport.autoCompletion.issues.length} issues`);

      } catch (error) {
        prognosisReport.autoCompletion.status = 'FAILED';
        prognosisReport.autoCompletion.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Auto-completion failed:', error);
      }
    });
  });

  describe('Phase 7: Data Integrity Validation', () => {
    it('should validate overall data integrity across the workflow', async () => {
      try {
        console.log('\n🎯 Phase 7: Validating overall data integrity...');

        const integrityReport = {
          gigExists: false,
          projectExists: false,
          tasksExist: false,
          invoicesExist: false,
          dataConsistency: []
        };

        // Check gig exists
        if (testGigId) {
          const currentYear = new Date().getFullYear();
          const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
          const currentDay = String(new Date().getDate()).padStart(2, '0');

          const gigPath = `gigs/${currentYear}/${currentMonth}/${currentDay}/${testGigId}/gig.json`;
          const gigValidation = await validateDataExists(gigPath, `Gig ${testGigId}`);
          integrityReport.gigExists = gigValidation.exists;

          if (!gigValidation.exists) {
            prognosisReport.dataIntegrity.issues.push('Test gig no longer exists in storage');
          }
        }

        // Check project exists
        if (testProjectId) {
          const projectSearch = await findProjectInHierarchy(testProjectId);
          integrityReport.projectExists = projectSearch.found;

          if (!projectSearch.found) {
            prognosisReport.dataIntegrity.issues.push('Test project no longer exists in storage');
          }
        }

        // Check tasks exist
        if (testProjectId) {
          const tasksSearch = await findTasksForProject(testProjectId);
          integrityReport.tasksExist = tasksSearch.found;

          if (!tasksSearch.found) {
            prognosisReport.dataIntegrity.issues.push('Test project tasks no longer exist in storage');
          }
        }

        // Check invoices exist
        if (testProjectId) {
          const invoicesSearch = await findInvoicesForProject(testProjectId);
          integrityReport.invoicesExist = invoicesSearch.found;

          if (!invoicesSearch.found) {
            prognosisReport.dataIntegrity.issues.push('Test project invoices no longer exist in storage');
          } else {
            const upfrontInvoice = invoicesSearch.invoices!.find(inv => inv.type === 'upfront');
            const completionInvoice = invoicesSearch.invoices!.find(inv => inv.type === 'completion');

            if (!upfrontInvoice) {
              prognosisReport.dataIntegrity.issues.push('Upfront invoice missing from final validation');
            }
            if (!completionInvoice) {
              prognosisReport.dataIntegrity.issues.push('Completion invoice missing from final validation');
            }
          }
        }

        prognosisReport.dataIntegrity.details = integrityReport;
        prognosisReport.dataIntegrity.status = prognosisReport.dataIntegrity.issues.length === 0 ? 'SUCCESS' : 'FAILED';

        console.log(`✅ Data integrity validation completed with ${prognosisReport.dataIntegrity.issues.length} issues`);

      } catch (error) {
        prognosisReport.dataIntegrity.status = 'FAILED';
        prognosisReport.dataIntegrity.issues.push(`Unexpected error: ${error}`);
        console.error('❌ Data integrity validation failed:', error);
      }
    });
  });
});
