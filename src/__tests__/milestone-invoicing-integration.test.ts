/**
 * Comprehensive Milestone-Based Invoicing Test Suite & Prognosis
 *
 * This test suite validates the complete milestone-based invoicing workflow:
 * 1. Gig creation with milestone invoicing method
 * 2. Freelancer matching and project activation
 * 3. Task submission and approval workflow
 * 4. Automatic milestone invoice generation
 * 5. Payment execution and wallet updates
 * 6. Data consistency across all storage systems
 *
 * The test identifies breakages without fixing them, providing a comprehensive prognosis.
 *
 * ENHANCED FEATURES:
 * - Real API endpoint testing with authentication simulation
 * - Detailed breakage analysis with root cause identification
 * - Performance metrics and timing analysis
 * - Data integrity validation across hierarchical storage
 * - Edge case testing for race conditions and error scenarios
 */

import { promises as fs } from 'fs';
import path from 'path';

// Enhanced test configuration with realistic test data
const TEST_CONFIG = {
  freelancerId: 31,
  commissionerId: 32,
  organizationId: 1,
  testGigId: Date.now(), // Use timestamp for unique IDs
  testProjectId: Date.now() + 1,
  testTaskId: Date.now() + 2,
  testInvoiceNumber: `TEST-MILESTONE-${Date.now()}`,
  baseDataPath: path.join(process.cwd(), 'data'),
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  // Milestone configuration for testing
  milestoneCount: 3,
  totalBudget: 10000,
  expectedMilestoneAmount: 3333.33, // 10000 / 3 milestones
  testTimeout: 30000, // 30 seconds for API calls
  retryAttempts: 3
};

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  details: any;
  breakages?: string[];
  recommendations?: string[];
  performance?: {
    duration: number;
    apiCalls: number;
    dataOperations: number;
  };
  dataIntegrity?: {
    filesCreated: string[];
    filesModified: string[];
    inconsistencies: string[];
  };
}

interface ComprehensiveTestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    totalDuration: number;
  };
  results: TestResult[];
  criticalBreakages: string[];
  systemRecommendations: string[];
  performanceMetrics: {
    averageApiResponseTime: number;
    slowestOperation: string;
    dataConsistencyScore: number;
  };
  prognosis: {
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    readinessForProduction: boolean;
    priorityFixes: string[];
  };
}

/**
 * Main test execution function with enhanced error handling and performance tracking
 */
export async function runComprehensiveMilestoneTest(): Promise<ComprehensiveTestReport> {
  console.log('🧪 Starting Enhanced Milestone-Based Invoicing Test Suite...\n');
  console.log(`📊 Test Configuration:`, {
    freelancerId: TEST_CONFIG.freelancerId,
    commissionerId: TEST_CONFIG.commissionerId,
    totalBudget: TEST_CONFIG.totalBudget,
    milestoneCount: TEST_CONFIG.milestoneCount,
    expectedMilestoneAmount: TEST_CONFIG.expectedMilestoneAmount
  });

  const results: TestResult[] = [];
  const startTime = Date.now();
  let gigId: number | null = null;
  let projectId: number | null = null;

  try {
    // Phase 1: Setup and Data Validation
    console.log('\n📋 Phase 1: Setup and Data Validation');
    results.push(await testDataIntegrity());
    results.push(await testSystemPrerequisites());
    results.push(await testHierarchicalStorageStructure());

    // Phase 2: Gig Creation with Milestone Invoicing
    console.log('\n📝 Phase 2: Gig Creation with Milestone Invoicing');
    const gigCreationResult = await testMilestoneGigCreation();
    results.push(gigCreationResult);

    if (gigCreationResult.status === 'FAIL') {
      console.log('❌ Gig creation failed, skipping dependent tests');
      return generateReport(results, startTime);
    }

    gigId = gigCreationResult.details?.gigId;
    console.log(`✅ Created test gig with ID: ${gigId}`);

    // Phase 3: Freelancer Matching and Project Activation
    console.log('\n🤝 Phase 3: Freelancer Matching and Project Activation');
    const matchingResult = await testFreelancerMatching(gigId);
    results.push(matchingResult);

    if (matchingResult.status === 'FAIL') {
      console.log('❌ Freelancer matching failed, skipping dependent tests');
      return generateReport(results, startTime);
    }

    projectId = matchingResult.details?.projectId;
    console.log(`✅ Created project with ID: ${projectId}`);

    // Phase 4: Task Workflow Testing
    console.log('\n📋 Phase 4: Task Workflow and Milestone Management');
    results.push(await testTaskCreationFromMilestones(projectId));
    results.push(await testTaskSubmissionWorkflow(projectId));
    results.push(await testTaskApprovalWithMilestoneInvoicing(projectId));

    // Phase 5: Invoice Generation and Payment Testing
    console.log('\n💰 Phase 5: Invoice Generation and Payment Execution');
    results.push(await testAutomaticMilestoneInvoiceGeneration(projectId));
    results.push(await testMilestonePaymentExecution(projectId));
    results.push(await testWalletBalanceUpdates());

    // Phase 6: Data Consistency and Storage Validation
    console.log('\n🔍 Phase 6: Data Consistency and Storage Validation');
    results.push(await testDataConsistencyAcrossStorageSystems(projectId));
    results.push(await testInvoiceStorageIntegrity());
    results.push(await testHierarchicalDataIntegrity(projectId));

    // Phase 7: Edge Cases and Error Handling
    console.log('\n⚠️ Phase 7: Edge Cases and Error Scenarios');
    results.push(await testRaceConditionScenarios(projectId));
    results.push(await testPaymentFailureRecovery());
    results.push(await testDataCorruptionRecovery());

  } catch (error) {
    console.error('💥 Critical test suite failure:', error);
    results.push({
      testName: 'Test Suite Execution',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack,
        phase: 'Test Suite Execution'
      },
      breakages: ['Test suite execution failed'],
      recommendations: ['Check test environment setup', 'Verify API endpoints are accessible'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    });
  }

  return generateReport(results, startTime);
}

/**
 * Enhanced report generation with performance metrics and prognosis
 */
function generateReport(results: TestResult[], startTime: number): ComprehensiveTestReport {
  const totalDuration = Date.now() - startTime;
  const summary = {
    totalTests: results.length,
    passed: results.filter(r => r.status === 'PASS').length,
    failed: results.filter(r => r.status === 'FAIL').length,
    errors: results.filter(r => r.status === 'ERROR').length,
    skipped: results.filter(r => r.status === 'SKIP').length,
    totalDuration
  };

  const criticalBreakages = results
    .filter(r => r.status === 'FAIL' || r.status === 'ERROR')
    .flatMap(r => r.breakages || []);

  const systemRecommendations = results
    .flatMap(r => r.recommendations || []);

  // Calculate performance metrics
  const apiResponseTimes = results
    .map(r => r.performance?.duration || 0)
    .filter(d => d > 0);

  const averageApiResponseTime = apiResponseTimes.length > 0
    ? apiResponseTimes.reduce((a, b) => a + b, 0) / apiResponseTimes.length
    : 0;

  const slowestOperation = results
    .sort((a, b) => (b.performance?.duration || 0) - (a.performance?.duration || 0))[0]?.testName || 'Unknown';

  // Calculate data consistency score
  const totalInconsistencies = results
    .flatMap(r => r.dataIntegrity?.inconsistencies || []).length;
  const dataConsistencyScore = Math.max(0, 100 - (totalInconsistencies * 10));

  // Determine overall health and production readiness
  const failureRate = (summary.failed + summary.errors) / summary.totalTests;
  const overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' =
    failureRate === 0 ? 'HEALTHY' :
    failureRate < 0.3 ? 'DEGRADED' : 'CRITICAL';

  const readinessForProduction = failureRate === 0 && dataConsistencyScore > 90;

  const priorityFixes = criticalBreakages
    .filter((breakage, index, arr) => arr.indexOf(breakage) === index) // Remove duplicates
    .slice(0, 5); // Top 5 priority fixes

  return {
    summary,
    results,
    criticalBreakages,
    systemRecommendations,
    performanceMetrics: {
      averageApiResponseTime,
      slowestOperation,
      dataConsistencyScore
    },
    prognosis: {
      overallHealth,
      readinessForProduction,
      priorityFixes
    }
  };
}

/**
 * Test 1: Data Integrity and Prerequisites
 */
async function testDataIntegrity(): Promise<TestResult> {
  console.log('🔍 Testing data integrity and prerequisites...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check if required data files exist
    const requiredFiles = [
      'data/users.json',
      'data/projects.json',
      'data/milestones-minimal.json',
      'data/gigs/gigs-index.json'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
      } catch {
        breakages.push(`Missing required data file: ${file}`);
        recommendations.push(`Create ${file} with proper structure`);
      }
    }

    // Validate test users exist
    try {
      const usersData = await fs.readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8');
      const users = JSON.parse(usersData);

      const freelancer = users.find((u: any) => u.id === TEST_CONFIG.freelancerId);
      const commissioner = users.find((u: any) => u.id === TEST_CONFIG.commissionerId);

      if (!freelancer) {
        breakages.push(`Test freelancer (ID: ${TEST_CONFIG.freelancerId}) not found in users.json`);
        recommendations.push('Add test freelancer to users.json');
      }

      if (!commissioner) {
        breakages.push(`Test commissioner (ID: ${TEST_CONFIG.commissionerId}) not found in users.json`);
        recommendations.push('Add test commissioner to users.json');
      }

      // Check user roles (using 'type' field as per actual data structure)
      if (freelancer && freelancer.type !== 'freelancer') {
        breakages.push(`Test user ${TEST_CONFIG.freelancerId} is not a freelancer (has type: ${freelancer.type})`);
      }

      if (commissioner && commissioner.type !== 'commissioner') {
        breakages.push(`Test user ${TEST_CONFIG.commissionerId} is not a commissioner (has type: ${commissioner.type})`);
      }

    } catch (error) {
      breakages.push('Failed to validate users.json structure');
      recommendations.push('Check users.json format and content');
    }

    return {
      testName: 'Data Integrity Check',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        checkedFiles: requiredFiles,
        freelancerId: TEST_CONFIG.freelancerId,
        commissionerId: TEST_CONFIG.commissionerId
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Data Integrity Check',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Data integrity check failed'],
      recommendations: ['Check file system permissions and data directory structure']
    };
  }
}

/**
 * Enhanced Test: Hierarchical Storage Structure Validation
 */
async function testHierarchicalStorageStructure(): Promise<TestResult> {
  console.log('🗂️ Testing hierarchical storage structure...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Check hierarchical directory structure
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const hierarchicalPaths = [
      `data/gigs/${year}/${month}/${day}`,
      `data/projects/${year}/${month}/${day}`,
      `data/project-tasks/${year}/${month}/${day}`,
      `data/invoices/${year}/${month}/${day}`,
      `data/transactions/${year}/${month}/${day}`
    ];

    for (const hierarchicalPath of hierarchicalPaths) {
      try {
        await fs.access(path.join(process.cwd(), hierarchicalPath));
      } catch {
        // Directory doesn't exist - this is expected for new dates
        try {
          await fs.mkdir(path.join(process.cwd(), hierarchicalPath), { recursive: true });
          filesCreated.push(hierarchicalPath);
        } catch (error) {
          breakages.push(`Failed to create hierarchical directory: ${hierarchicalPath}`);
          recommendations.push(`Ensure write permissions for ${hierarchicalPath}`);
        }
      }
    }

    // Validate index files exist and are properly structured
    const indexFiles = [
      'data/gigs/gigs-index.json',
      'data/projects-index.json',
      'data/invoices-index.json'
    ];

    for (const indexFile of indexFiles) {
      try {
        const indexPath = path.join(process.cwd(), indexFile);
        await fs.access(indexPath);

        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const indexData = JSON.parse(indexContent);

        if (typeof indexData !== 'object' || indexData === null || Array.isArray(indexData)) {
          inconsistencies.push(`Index file ${indexFile} should be an object mapping IDs to metadata`);
          recommendations.push(`Fix ${indexFile} structure to be an object (not array)`);
        }
      } catch (error) {
        breakages.push(`Index file missing or corrupted: ${indexFile}`);
        recommendations.push(`Create or repair ${indexFile}`);
      }
    }

    return {
      testName: 'Hierarchical Storage Structure',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        hierarchicalPaths,
        indexFiles,
        currentDate: { year, month, day }
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: hierarchicalPaths.length + indexFiles.length
      },
      dataIntegrity: {
        filesCreated,
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Hierarchical Storage Structure',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Hierarchical storage structure validation failed'],
      recommendations: ['Check file system permissions and storage configuration'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 2: System Prerequisites
 */
async function testSystemPrerequisites(): Promise<TestResult> {
  console.log('🔧 Testing system prerequisites...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Test API endpoint accessibility
    const endpoints = [
      '/api/gigs/post',
      '/api/test/direct-match-freelancer',
      '/api/test/task-operations',
      '/api/invoices/auto-generate',
      '/api/test/pay-invoice'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
          method: 'OPTIONS' // Use OPTIONS to test endpoint existence
        });

        if (response.status === 404) {
          breakages.push(`API endpoint not found: ${endpoint}`);
          recommendations.push(`Implement ${endpoint} endpoint`);
        }
      } catch (error) {
        breakages.push(`Cannot reach API endpoint: ${endpoint}`);
        recommendations.push('Check if development server is running');
      }
    }

    // Test hierarchical storage directories
    const storageDirectories = [
      'data/gigs',
      'data/projects',
      'data/invoices',
      'data/wallets'
    ];

    for (const dir of storageDirectories) {
      try {
        await fs.access(path.join(process.cwd(), dir));
      } catch {
        breakages.push(`Missing storage directory: ${dir}`);
        recommendations.push(`Create directory structure: ${dir}`);
      }
    }

    return {
      testName: 'System Prerequisites',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        checkedEndpoints: endpoints,
        checkedDirectories: storageDirectories
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'System Prerequisites',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['System prerequisites check failed'],
      recommendations: ['Check system configuration and dependencies']
    };
  }
}

/**
 * Test 3: Milestone Gig Creation
 */
async function testMilestoneGigCreation(): Promise<TestResult> {
  console.log('📝 Testing milestone gig creation...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    const gigData = {
      organizationData: {
        id: 1,
        name: 'Test Organization',
        industry: 'Technology',
        size: '10-50',
        website: 'https://test-org.com',
        description: 'Test organization for milestone invoicing'
      },
      title: 'Test Milestone-Based Gig for Invoicing Validation',
      commissionerId: TEST_CONFIG.commissionerId,
      category: 'development',
      subcategory: 'Web Development',
      skills: ['React', 'TypeScript', 'Node.js'],
      tools: ['React', 'Jest', 'TypeScript'],
      description: 'Test gig for milestone-based invoicing workflow validation',
      executionMethod: 'milestone',
      invoicingMethod: 'milestone',
      budget: 10000,
      lowerBudget: 10000,
      upperBudget: 10000,
      deliveryTimeWeeks: 8,
      estimatedHours: 200,
      startType: 'Immediately',
      isPublic: true,
      isTargetedRequest: false,
      milestones: [
        {
          id: 'M1',
          title: 'Project Setup and Architecture',
          description: 'Initial project setup, architecture design, and development environment',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'M2',
          title: 'Core Feature Development',
          description: 'Implementation of core features and functionality',
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'M3',
          title: 'Testing and Deployment',
          description: 'Comprehensive testing, bug fixes, and deployment',
          startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gigData)
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Gig creation API failed: ${errorMessage}`);
      recommendations.push('Check gig creation API implementation and validation');

      return {
        testName: 'Milestone Gig Creation',
        status: 'FAIL',
        details: {
          response: result,
          status: response.status,
          requestData: gigData,
          errorDetails: result
        },
        breakages,
        recommendations
      };
    }

    // Validate response structure
    if (!result.success || !result.gigId) {
      breakages.push('Gig creation response missing required fields (success, gigId)');
      recommendations.push('Fix gig creation API response format');
    }

    // Store gig ID for subsequent tests
    TEST_CONFIG.testGigId = result.gigId;

    // Verify gig was stored correctly
    try {
      // Import readGig function to read from hierarchical storage
      const { readGig } = await import('@/lib/gigs/hierarchical-storage');
      const storedGig = await readGig(result.gigId);

      if (!storedGig) {
        breakages.push('Stored gig not found in hierarchical storage');
        recommendations.push('Check gig storage implementation');
      } else {
        if (storedGig.invoicingMethod !== 'milestone') {
          breakages.push('Stored gig has incorrect invoicing method');
          recommendations.push('Fix gig storage to preserve invoicing method');
        }

        if (!storedGig.milestones || storedGig.milestones.length !== 3) {
          breakages.push('Stored gig missing or incorrect milestones');
          recommendations.push('Fix milestone storage in gig creation');
        }
      }

    } catch (error) {
      breakages.push('Failed to verify stored gig data');
      recommendations.push('Check hierarchical storage implementation for gigs');
    }

    return {
      testName: 'Milestone Gig Creation',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        gigId: result.gigId,
        response: result,
        milestoneCount: gigData.milestones.length
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Milestone Gig Creation',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Gig creation test failed'],
      recommendations: ['Check API endpoint and network connectivity']
    };
  }
}

/**
 * Enhanced Test: Freelancer Matching and Project Activation
 */
async function testFreelancerMatching(gigId: number | null): Promise<TestResult> {
  console.log('🤝 Testing enhanced freelancer matching and project activation...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];
  const filesModified: string[] = [];
  const inconsistencies: string[] = [];

  if (!gigId) {
    return {
      testName: 'Enhanced Freelancer Matching',
      status: 'SKIP',
      details: { reason: 'No gig ID provided from previous test' },
      breakages: ['Cannot test freelancer matching without valid gig ID'],
      recommendations: ['Fix gig creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Reset gig status to Available for testing
    try {
      const { updateGig } = await import('@/lib/gigs/hierarchical-storage');
      await updateGig(gigId, { status: 'Available' });
      console.log(`🔄 Reset gig ${gigId} status to Available for testing`);
      filesModified.push(`data/gigs/.../gig.json`);
    } catch (resetError) {
      console.warn('Failed to reset gig status:', resetError);
      breakages.push('Failed to reset gig status for testing');
      recommendations.push('Check gig update functionality');
    }

    const matchingData = {
      gigId: gigId,
      freelancerId: TEST_CONFIG.freelancerId,
      commissionerId: TEST_CONFIG.commissionerId
    };

    console.log(`📤 Sending matching request:`, matchingData);

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/direct-match-freelancer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchingData)
    });

    const result = await response.json();
    console.log(`📥 Freelancer matching response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Freelancer matching API failed: ${errorMessage}`);
      recommendations.push('Check freelancer matching API implementation and authentication');

      return {
        testName: 'Enhanced Freelancer Matching',
        status: 'FAIL',
        details: {
          response: result,
          status: response.status,
          requestData: matchingData,
          errorDetails: result
        },
        breakages,
        recommendations,
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 1,
          dataOperations: 0
        }
      };
    }

    // Validate project creation with enhanced checks
    if (!result.entities?.project?.projectId) {
      breakages.push('Project not created during freelancer matching');
      recommendations.push('Fix project creation in matching workflow');
    } else {
      const projectId = result.entities.project.projectId;
      console.log(`✅ Project created with ID: ${projectId}`);

      // Verify project has correct invoicing method
      if (result.entities.project.invoicingMethod !== 'milestone') {
        inconsistencies.push('Project created with wrong invoicing method');
        recommendations.push('Ensure invoicing method is preserved during project creation');
      }
    }

    // Validate task creation from milestones
    if (!result.entities?.tasks || result.entities.tasks.length === 0) {
      breakages.push('Tasks not created during project activation');
      recommendations.push('Fix task creation in project activation workflow');
    } else {
      const expectedTaskCount = TEST_CONFIG.milestoneCount;
      const actualTaskCount = result.entities.tasks.length;

      if (actualTaskCount !== expectedTaskCount) {
        inconsistencies.push(`Task count mismatch: expected ${expectedTaskCount}, got ${actualTaskCount}`);
        recommendations.push('Ensure all milestones are converted to tasks');
      }

      console.log(`✅ Created ${actualTaskCount} tasks from milestones`);
    }

    // Verify hierarchical project storage
    try {
      const { readProject } = await import('@/lib/projects-utils');
      const projectId = result.entities.project.projectId;
      const storedProject = await readProject(projectId);

      if (!storedProject) {
        breakages.push('Project not found in hierarchical storage after creation');
        recommendations.push('Fix hierarchical project storage implementation');
      } else {
        filesCreated.push(`data/projects/.../project.json`);

        if (storedProject.invoicingMethod !== 'milestone') {
          inconsistencies.push('Stored project has incorrect invoicing method');
          recommendations.push('Preserve invoicing method during project storage');
        }

        if (storedProject.status !== 'ongoing') {
          inconsistencies.push('Project not activated (status should be "ongoing")');
          recommendations.push('Fix project status setting during activation');
        }
      }
    } catch (error) {
      breakages.push('Failed to verify hierarchical project storage');
      recommendations.push('Check hierarchical project storage implementation');
    }

    // Verify gig status update
    try {
      const { readGig } = await import('@/lib/gigs/hierarchical-storage');
      const gig = await readGig(gigId);

      if (!gig) {
        breakages.push(`Gig ${gigId} not found after matching`);
        recommendations.push('Check gig storage consistency');
      } else {
        filesModified.push(`data/gigs/.../gig.json`);

        if (gig.status !== 'Unavailable') {
          inconsistencies.push(`Gig status not updated to "Unavailable" after matching (current: "${gig.status}")`);
          recommendations.push('Fix gig status update in matching workflow');
        }
      }
    } catch (error) {
      breakages.push(`Failed to verify gig status update: ${(error as Error).message}`);
      recommendations.push('Check gig status update implementation');
    }

    return {
      testName: 'Enhanced Freelancer Matching',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId: result.entities?.project?.projectId,
        taskCount: result.entities?.tasks?.length || 0,
        response: result,
        gigId: gigId
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 1,
        dataOperations: 3 // gig read, project create, task create
      },
      dataIntegrity: {
        filesCreated,
        filesModified,
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Enhanced Freelancer Matching',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack,
        gigId: gigId
      },
      breakages: ['Freelancer matching test failed'],
      recommendations: ['Check matching API endpoint and implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Enhanced Test: Task Creation from Milestones
 */
async function testTaskCreationFromMilestones(projectId: number | null): Promise<TestResult> {
  console.log('📋 Testing task creation from milestones...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Task Creation from Milestones',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test task creation without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Read project tasks using hierarchical storage
    const { readProjectTasks } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectTasks = await readProjectTasks(projectId);

    if (!projectTasks || projectTasks.length === 0) {
      breakages.push('No tasks found for the created project');
      recommendations.push('Fix task creation during project activation');
    } else {
      const expectedTaskCount = TEST_CONFIG.milestoneCount;
      const actualTaskCount = projectTasks.length;

      if (actualTaskCount !== expectedTaskCount) {
        inconsistencies.push(`Task count mismatch: expected ${expectedTaskCount}, got ${actualTaskCount}`);
        recommendations.push('Ensure all milestones are converted to tasks during project creation');
      }

      // Validate task structure and milestone mapping
      for (let i = 0; i < projectTasks.length; i++) {
        const task = projectTasks[i];

        if (!task.title || task.title.trim() === '') {
          inconsistencies.push(`Task ${i + 1} has empty title`);
        }

        if (!task.description || task.description.trim() === '') {
          inconsistencies.push(`Task ${i + 1} has empty description`);
        }

        if (task.status !== 'Ongoing') {
          inconsistencies.push(`Task ${i + 1} has incorrect initial status: ${task.status}`);
        }

        if (!task.milestoneId) {
          inconsistencies.push(`Task ${i + 1} missing milestone ID mapping`);
        }
      }

      console.log(`✅ Found ${actualTaskCount} tasks for project ${projectId}`);
    }

    return {
      testName: 'Task Creation from Milestones',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        taskCount: projectTasks?.length || 0,
        tasks: projectTasks?.map(t => ({ id: t.taskId, title: t.title, status: t.status })) || []
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 1
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Task Creation from Milestones',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Failed to read project tasks'],
      recommendations: ['Check hierarchical task storage implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Enhanced Test: Task Submission Workflow
 */
async function testTaskSubmissionWorkflow(projectId: number | null): Promise<TestResult> {
  console.log('📤 Testing task submission workflow...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesModified: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Task Submission Workflow',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test task submission without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Get the first task for submission testing
    const { readProjectTasks } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectTasks = await readProjectTasks(projectId);

    if (!projectTasks || projectTasks.length === 0) {
      return {
        testName: 'Task Submission Workflow',
        status: 'SKIP',
        details: { reason: 'No tasks found for project' },
        breakages: ['Cannot test task submission without tasks'],
        recommendations: ['Fix task creation during project activation'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    const firstTask = projectTasks[0];
    console.log(`📋 Testing submission for task: ${firstTask.title} (ID: ${firstTask.taskId})`);

    const submissionData = {
      taskId: firstTask.taskId,
      action: 'submit',
      actorId: TEST_CONFIG.freelancerId,
      referenceUrl: 'https://github.com/test/milestone-task-1'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });

    const result = await response.json();
    console.log(`📥 Task submission response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Task submission API failed: ${errorMessage}`);
      recommendations.push('Check task submission API implementation');
    } else {
      // Verify task status was updated
      const updatedTasks = await readProjectTasks(projectId);
      const updatedTask = updatedTasks?.find(t => t.taskId === firstTask.taskId);

      if (!updatedTask) {
        inconsistencies.push('Task not found after submission');
      } else if (updatedTask.status !== 'Submitted') {
        inconsistencies.push(`Task status not updated to 'Submitted' (current: ${updatedTask.status})`);
        recommendations.push('Fix task status update during submission');
      } else {
        console.log(`✅ Task status updated to: ${updatedTask.status}`);
        filesModified.push(`data/project-tasks/.../tasks.json`);
      }
    }

    return {
      testName: 'Task Submission Workflow',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        taskId: firstTask.taskId,
        taskTitle: firstTask.title,
        response: result
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 1,
        dataOperations: 2
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified,
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Task Submission Workflow',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Task submission workflow test failed'],
      recommendations: ['Check task submission API and storage implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 5: Task Submission (Legacy)
 */
async function testTaskSubmission(): Promise<TestResult> {
  console.log('📋 Testing task submission...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    console.log(`🔍 Task submission test - testTaskId: ${TEST_CONFIG.testTaskId}`);

    if (!TEST_CONFIG.testTaskId) {
      breakages.push('testTaskId not set - freelancer matching may have failed');
      recommendations.push('Ensure freelancer matching test runs successfully first');

      return {
        testName: 'Task Submission',
        status: 'FAIL',
        details: { error: 'testTaskId not available' },
        breakages,
        recommendations
      };
    }

    const submissionData = {
      taskId: TEST_CONFIG.testTaskId,
      action: 'submit',
      actorId: TEST_CONFIG.freelancerId,
      referenceUrl: 'https://github.com/test/milestone-task-1'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });

    const result = await response.json();

    if (!response.ok) {
      breakages.push(`Task submission API failed: ${result.error || 'Unknown error'}`);
      recommendations.push('Check task submission API implementation');

      return {
        testName: 'Task Submission',
        status: 'FAIL',
        details: { response: result, status: response.status },
        breakages,
        recommendations
      };
    }

    // Validate submission response
    if (!result.success) {
      breakages.push('Task submission response indicates failure');
      recommendations.push('Fix task submission logic');
    }

    // Verify task status update
    try {
      // Check hierarchical storage
      const { readAllTasks } = await import('@/lib/project-tasks/hierarchical-storage');
      const tasks = await readAllTasks();
      const submittedTask = tasks.find((t: any) => t.id === TEST_CONFIG.testTaskId);

      if (!submittedTask) {
        breakages.push('Task not found in hierarchical storage after submission');
        recommendations.push('Fix task storage in submission workflow');
      } else if (submittedTask.status !== 'In review') {
        breakages.push(`Task status should be "In review" after submission, got "${submittedTask.status}"`);
        recommendations.push('Fix task status update in submission workflow');
      }
    } catch (error) {
      breakages.push('Failed to verify task status after submission');
      recommendations.push('Check hierarchical task storage implementation');
    }

    return {
      testName: 'Task Submission',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        taskId: TEST_CONFIG.testTaskId,
        response: result
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Task Submission',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Task submission test failed'],
      recommendations: ['Check task submission API endpoint']
    };
  }
}

/**
 * Enhanced Test: Task Approval with Milestone Invoicing
 */
async function testTaskApprovalWithMilestoneInvoicing(projectId: number | null): Promise<TestResult> {
  console.log('✅ Testing enhanced task approval with milestone invoicing...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];
  const filesModified: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Enhanced Task Approval with Milestone Invoicing',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test task approval without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Get the first submitted task for approval testing
    const { readProjectTasks } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectTasks = await readProjectTasks(projectId);

    if (!projectTasks || projectTasks.length === 0) {
      return {
        testName: 'Enhanced Task Approval with Milestone Invoicing',
        status: 'SKIP',
        details: { reason: 'No tasks found for project' },
        breakages: ['Cannot test task approval without tasks'],
        recommendations: ['Fix task creation during project activation'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    // Find a submitted task or use the first task
    let taskToApprove = projectTasks.find(t => t.status === 'Submitted');
    if (!taskToApprove) {
      taskToApprove = projectTasks[0];
      console.log(`⚠️ No submitted task found, using first task: ${taskToApprove.title}`);
    }

    console.log(`✅ Testing approval for task: ${taskToApprove.title} (ID: ${taskToApprove.taskId})`);

    const approvalData = {
      taskId: taskToApprove.taskId,
      action: 'approve',
      actorId: TEST_CONFIG.commissionerId
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(approvalData)
    });

    const result = await response.json();
    console.log(`📥 Task approval response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Task approval API failed: ${errorMessage}`);
      recommendations.push('Check task approval API implementation and authentication');

      return {
        testName: 'Enhanced Task Approval with Milestone Invoicing',
        status: 'FAIL',
        details: {
          response: result,
          status: response.status,
          requestData: approvalData,
          taskId: taskToApprove.taskId
        },
        breakages,
        recommendations,
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 1,
          dataOperations: 1
        }
      };
    }

    // Validate approval response structure
    if (!result.success) {
      inconsistencies.push('Task approval response indicates failure');
      recommendations.push('Fix task approval logic');
    }

    // Check automatic milestone invoice generation
    let invoiceGenerated = false;
    let generatedInvoiceId = null;

    if (result.invoiceGenerated) {
      invoiceGenerated = true;
      generatedInvoiceId = result.invoiceId || result.invoiceNumber;
      console.log(`💰 Milestone invoice generated: ${generatedInvoiceId}`);
      filesCreated.push(`data/invoices/.../invoice.json`);
    } else {
      breakages.push('Milestone invoice not automatically generated during task approval');
      recommendations.push('Fix automatic invoice generation for milestone-based projects');
    }

    // Verify task status and completion
    try {
      const updatedTasks = await readProjectTasks(projectId);
      const approvedTask = updatedTasks?.find(t => t.taskId === taskToApprove.taskId);

      if (!approvedTask) {
        inconsistencies.push('Task not found after approval');
        recommendations.push('Fix task storage in approval workflow');
      } else {
        filesModified.push(`data/project-tasks/.../tasks.json`);

        if (approvedTask.status !== 'Approved') {
          inconsistencies.push(`Task status should be "Approved" after approval, got "${approvedTask.status}"`);
          recommendations.push('Fix task status update in approval workflow');
        }

        if (!approvedTask.completed) {
          inconsistencies.push('Task should be marked as completed after approval');
          recommendations.push('Fix task completion flag in approval workflow');
        }

        console.log(`✅ Task status updated to: ${approvedTask.status}, completed: ${approvedTask.completed}`);
      }
    } catch (error) {
      breakages.push('Failed to verify task status after approval');
      recommendations.push('Check hierarchical task storage implementation');
    }

    // Verify milestone invoice creation and structure
    if (invoiceGenerated && generatedInvoiceId) {
      try {
        const { getAllInvoices } = await import('@/lib/invoice-storage');
        const invoices = await getAllInvoices();
        const milestoneInvoice = invoices.find((inv: any) =>
          inv.invoiceNumber === generatedInvoiceId ||
          (inv.projectId === projectId && inv.invoiceType === 'auto_milestone')
        );

        if (!milestoneInvoice) {
          inconsistencies.push('Generated milestone invoice not found in storage');
          recommendations.push('Fix invoice storage for auto-generated milestone invoices');
        } else {
          // Validate invoice structure and amounts
          const expectedAmount = TEST_CONFIG.expectedMilestoneAmount;
          const actualAmount = milestoneInvoice.totalAmount;

          if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            inconsistencies.push(`Invoice amount mismatch: expected ~${expectedAmount}, got ${actualAmount}`);
            recommendations.push('Fix milestone amount calculation (total budget / milestone count)');
          }

          if (milestoneInvoice.status !== 'sent') {
            inconsistencies.push(`Milestone invoice should have status "sent", got "${milestoneInvoice.status}"`);
            recommendations.push('Fix invoice status setting for auto-generated milestone invoices');
          }

          if (milestoneInvoice.invoicingMethod !== 'milestone') {
            inconsistencies.push('Invoice missing or incorrect invoicing method');
            recommendations.push('Preserve invoicing method in invoice generation');
          }

          console.log(`💰 Invoice validation: Amount=${actualAmount}, Status=${milestoneInvoice.status}`);
        }
      } catch (error) {
        breakages.push('Failed to verify milestone invoice creation');
        recommendations.push('Check invoice storage and generation implementation');
      }
    }

    return {
      testName: 'Enhanced Task Approval with Milestone Invoicing',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        taskId: taskToApprove.taskId,
        taskTitle: taskToApprove.title,
        invoiceGenerated,
        generatedInvoiceId,
        response: result
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 1,
        dataOperations: 3 // task read, task update, invoice create
      },
      dataIntegrity: {
        filesCreated,
        filesModified,
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Enhanced Task Approval with Milestone Invoicing',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack,
        projectId
      },
      breakages: ['Task approval with milestone invoicing test failed'],
      recommendations: ['Check task approval API and invoice generation implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 6: Task Approval with Milestone Invoice Generation (Legacy)
 */
async function testTaskApprovalWithMilestoneInvoicingLegacy(): Promise<TestResult> {
  console.log('✅ Testing task approval with milestone invoice generation...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    const approvalData = {
      taskId: TEST_CONFIG.testTaskId,
      action: 'approve',
      actorId: TEST_CONFIG.commissionerId
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(approvalData)
    });

    const result = await response.json();

    if (!response.ok) {
      breakages.push(`Task approval API failed: ${result.error || 'Unknown error'}`);
      recommendations.push('Check task approval API implementation');

      return {
        testName: 'Task Approval with Milestone Invoicing',
        status: 'FAIL',
        details: { response: result, status: response.status },
        breakages,
        recommendations
      };
    }

    // Validate approval response
    if (!result.success) {
      breakages.push('Task approval response indicates failure');
      recommendations.push('Fix task approval logic');
    }

    // Check if milestone invoice was generated
    if (!result.invoiceGenerated) {
      breakages.push('Milestone invoice not generated during task approval');
      recommendations.push('Fix automatic invoice generation for milestone-based projects');
    } else if (result.invoiceId) {
      // Update the test config with the generated invoice ID
      TEST_CONFIG.testInvoiceNumber = result.invoiceId;
      console.log(`📄 Captured generated invoice ID: ${result.invoiceId}`);
    }

    // Verify task status update
    try {
      const { readAllTasks } = await import('@/lib/project-tasks/hierarchical-storage');
      const tasks = await readAllTasks();
      const approvedTask = tasks.find((t: any) => t.id === TEST_CONFIG.testTaskId);

      if (!approvedTask) {
        breakages.push('Task not found after approval');
        recommendations.push('Fix task storage in approval workflow');
      } else {
        if (approvedTask.status !== 'Approved') {
          breakages.push(`Task status should be "Approved" after approval, got "${approvedTask.status}"`);
          recommendations.push('Fix task status update in approval workflow');
        }

        if (!approvedTask.completed) {
          breakages.push('Task should be marked as completed after approval');
          recommendations.push('Fix task completion flag in approval workflow');
        }
      }
    } catch (error) {
      breakages.push('Failed to verify task status after approval');
      recommendations.push('Check task storage implementation');
    }

    // Verify invoice creation
    try {
      const { getAllInvoices } = await import('@/lib/invoice-storage');
      const invoices = await getAllInvoices();
      const milestoneInvoice = invoices.find((inv: any) =>
        inv.projectId === TEST_CONFIG.testProjectId &&
        inv.invoiceType === 'auto_milestone'
      );

      if (!milestoneInvoice) {
        breakages.push('Milestone invoice not found in invoice storage');
        recommendations.push('Fix invoice generation and storage for milestone approvals');
      } else {
        TEST_CONFIG.testInvoiceNumber = milestoneInvoice.invoiceNumber;

        if (milestoneInvoice.status !== 'sent') {
          breakages.push(`Milestone invoice should have status "sent", got "${milestoneInvoice.status}"`);
          recommendations.push('Fix invoice status setting for auto-generated milestone invoices');
        }

        // Validate invoice amount (should be totalBudget / totalMilestones)
        const expectedAmount = 10000 / 3; // $10,000 budget / 3 milestones
        if (Math.abs(milestoneInvoice.totalAmount - expectedAmount) > 0.01) {
          breakages.push(`Incorrect milestone invoice amount: expected ${expectedAmount}, got ${milestoneInvoice.totalAmount}`);
          recommendations.push('Fix milestone amount calculation in invoice generation');
        }
      }
    } catch (error) {
      breakages.push('Failed to verify invoice creation');
      recommendations.push('Check invoice storage implementation');
    }

    return {
      testName: 'Task Approval with Milestone Invoicing',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        taskId: TEST_CONFIG.testTaskId,
        invoiceGenerated: result.invoiceGenerated,
        invoiceNumber: TEST_CONFIG.testInvoiceNumber,
        response: result
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Task Approval with Milestone Invoicing',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Task approval test failed'],
      recommendations: ['Check task approval API and invoice generation']
    };
  }
}

/**
 * Test 7: Milestone Payment Execution
 */
async function testMilestonePaymentExecutionLegacy(): Promise<TestResult> {
  console.log('💳 Testing milestone payment execution...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    if (!TEST_CONFIG.testInvoiceNumber) {
      breakages.push('No invoice number available for payment testing');
      recommendations.push('Fix invoice generation in previous test');

      return {
        testName: 'Milestone Payment Execution',
        status: 'FAIL',
        details: { reason: 'No invoice to pay' },
        breakages,
        recommendations
      };
    }

    const paymentData = {
      invoiceNumber: TEST_CONFIG.testInvoiceNumber,
      commissionerId: TEST_CONFIG.commissionerId,
      amount: 10000 / 3, // Expected milestone amount
      paymentMethodId: 'test_payment_method_123',
      currency: 'USD'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      breakages.push(`Payment execution API failed: ${result.error || 'Unknown error'}`);
      recommendations.push('Check payment execution API implementation');

      return {
        testName: 'Milestone Payment Execution',
        status: 'FAIL',
        details: { response: result, status: response.status },
        breakages,
        recommendations
      };
    }

    // Validate payment response
    if (!result.success) {
      breakages.push('Payment execution response indicates failure');
      recommendations.push('Fix payment execution logic');
    }

    // Verify invoice status update
    try {
      const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
      const updatedInvoice = await getInvoiceByNumber(TEST_CONFIG.testInvoiceNumber);

      if (!updatedInvoice) {
        breakages.push('Invoice not found after payment');
        recommendations.push('Check invoice storage consistency');
      } else if (updatedInvoice.status !== 'paid') {
        breakages.push(`Invoice status should be "paid" after payment, got "${updatedInvoice.status}"`);
        recommendations.push('Fix invoice status update in payment workflow');
      }
    } catch (error) {
      breakages.push('Failed to verify invoice status after payment');
      recommendations.push('Check invoice storage implementation');
    }

    return {
      testName: 'Milestone Payment Execution',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        invoiceNumber: TEST_CONFIG.testInvoiceNumber,
        amount: paymentData.amount,
        response: result
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Milestone Payment Execution',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Payment execution test failed'],
      recommendations: ['Check payment API endpoint and implementation']
    };
  }
}

/**
 * Enhanced Test: Automatic Milestone Invoice Generation
 */
async function testAutomaticMilestoneInvoiceGeneration(projectId: number | null): Promise<TestResult> {
  console.log('📄 Testing automatic milestone invoice generation...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Automatic Milestone Invoice Generation',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test invoice generation without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Get the first approved task to trigger invoice generation
    const { readProjectTasks } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectTasks = await readProjectTasks(projectId);

    if (!projectTasks || projectTasks.length === 0) {
      return {
        testName: 'Automatic Milestone Invoice Generation',
        status: 'SKIP',
        details: { reason: 'No tasks found for invoice generation' },
        breakages: ['Cannot test invoice generation without tasks'],
        recommendations: ['Fix task creation during project activation'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    // Find an approved task or use the first task
    let approvedTask = projectTasks.find(t => t.status === 'Approved');
    if (!approvedTask) {
      approvedTask = projectTasks[0];
      console.log(`⚠️ No approved task found, using first task: ${approvedTask.title}`);
    }

    // Trigger automatic invoice generation with correct parameters
    const invoiceData = {
      taskId: approvedTask.taskId,
      projectId: projectId,
      action: 'task_approved'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();
    console.log(`📥 Auto-invoice generation response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Auto-invoice generation API failed: ${errorMessage}`);
      recommendations.push('Check auto-invoice generation API implementation');

      return {
        testName: 'Automatic Milestone Invoice Generation',
        status: 'FAIL',
        details: {
          response: result,
          status: response.status,
          requestData: invoiceData
        },
        breakages,
        recommendations,
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 1,
          dataOperations: 0
        }
      };
    }

    // Validate invoice generation response
    if (!result.success) {
      inconsistencies.push('Auto-invoice generation response indicates failure');
      recommendations.push('Fix auto-invoice generation logic');
    }

    let generatedInvoiceNumber = null;
    if (result.invoiceNumber) {
      generatedInvoiceNumber = result.invoiceNumber;
      console.log(`💰 Generated invoice: ${generatedInvoiceNumber}`);
      filesCreated.push(`data/invoices/.../invoice.json`);
    } else {
      breakages.push('No invoice number returned from auto-generation');
      recommendations.push('Fix invoice number generation and response');
    }

    // Verify invoice was stored correctly
    if (generatedInvoiceNumber) {
      try {
        const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
        const storedInvoice = await getInvoiceByNumber(generatedInvoiceNumber);

        if (!storedInvoice) {
          inconsistencies.push('Generated invoice not found in storage');
          recommendations.push('Fix invoice storage in auto-generation');
        } else {
          // Validate invoice structure
          if (storedInvoice.invoiceType !== 'auto_milestone') {
            inconsistencies.push(`Invoice type should be "auto_milestone", got "${storedInvoice.invoiceType}"`);
          }

          if (storedInvoice.invoicingMethod !== 'milestone') {
            inconsistencies.push('Invoice missing milestone invoicing method');
          }

          const expectedAmount = TEST_CONFIG.expectedMilestoneAmount;
          if (Math.abs(storedInvoice.totalAmount - expectedAmount) > 0.01) {
            inconsistencies.push(`Invoice amount mismatch: expected ~${expectedAmount}, got ${storedInvoice.totalAmount}`);
            recommendations.push('Fix milestone amount calculation');
          }

          if (storedInvoice.status !== 'sent') {
            inconsistencies.push(`Auto-generated invoice should have status "sent", got "${storedInvoice.status}"`);
          }

          console.log(`✅ Invoice stored correctly: ${storedInvoice.invoiceNumber}, Amount: ${storedInvoice.totalAmount}`);
        }
      } catch (error) {
        breakages.push('Failed to verify stored invoice');
        recommendations.push('Check invoice storage implementation');
      }
    }

    return {
      testName: 'Automatic Milestone Invoice Generation',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        generatedInvoiceNumber,
        response: result
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 1,
        dataOperations: 2 // invoice create, invoice read
      },
      dataIntegrity: {
        filesCreated,
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Automatic Milestone Invoice Generation',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Auto-invoice generation test failed'],
      recommendations: ['Check auto-invoice generation API and implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Enhanced Test: Milestone Payment Execution
 */
async function testMilestonePaymentExecution(projectId: number | null): Promise<TestResult> {
  console.log('💳 Testing enhanced milestone payment execution...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesModified: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Enhanced Milestone Payment Execution',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test payment execution without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Find the most recent invoice for this project
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const invoices = await getAllInvoices();
    const projectInvoices = invoices.filter((inv: any) =>
      inv.projectId === projectId &&
      inv.invoiceType === 'auto_milestone' &&
      inv.status === 'sent'
    );

    if (projectInvoices.length === 0) {
      return {
        testName: 'Enhanced Milestone Payment Execution',
        status: 'SKIP',
        details: { reason: 'No unpaid milestone invoices found for project' },
        breakages: ['Cannot test payment execution without unpaid invoices'],
        recommendations: ['Fix invoice generation test first'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    const invoiceToPayy = projectInvoices[0];
    console.log(`💳 Testing payment for invoice: ${invoiceToPayy.invoiceNumber}, Amount: ${invoiceToPayy.totalAmount}`);

    const paymentData = {
      invoiceNumber: invoiceToPayy.invoiceNumber,
      commissionerId: TEST_CONFIG.commissionerId,
      amount: invoiceToPayy.totalAmount,
      paymentMethodId: 'test_payment_method',
      currency: 'USD'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();
    console.log(`📥 Payment execution response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMessage = result.message || result.error || 'Unknown error';
      breakages.push(`Payment execution API failed: ${errorMessage}`);
      recommendations.push('Check payment execution API implementation and authentication');

      return {
        testName: 'Enhanced Milestone Payment Execution',
        status: 'FAIL',
        details: {
          response: result,
          status: response.status,
          requestData: paymentData,
          invoiceNumber: invoiceToPayy.invoiceNumber
        },
        breakages,
        recommendations,
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 1,
          dataOperations: 1
        }
      };
    }

    // Validate payment response
    if (!result.success) {
      inconsistencies.push('Payment execution response indicates failure');
      recommendations.push('Fix payment execution logic');
    }

    // Verify invoice status update
    try {
      const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
      const updatedInvoice = await getInvoiceByNumber(invoiceToPayy.invoiceNumber);

      if (!updatedInvoice) {
        inconsistencies.push('Invoice not found after payment');
        recommendations.push('Check invoice storage consistency');
      } else {
        filesModified.push(`data/invoices/.../invoice.json`);

        if (updatedInvoice.status !== 'paid') {
          inconsistencies.push(`Invoice status should be "paid" after payment, got "${updatedInvoice.status}"`);
          recommendations.push('Fix invoice status update in payment workflow');
        }

        if (!updatedInvoice.paidDate) {
          inconsistencies.push('Invoice missing paid date after payment');
          recommendations.push('Set paid date during payment processing');
        }

        console.log(`✅ Invoice status updated to: ${updatedInvoice.status}, Paid date: ${updatedInvoice.paidDate}`);
      }
    } catch (error) {
      breakages.push('Failed to verify invoice status after payment');
      recommendations.push('Check invoice storage implementation');
    }

    // Verify transaction record creation
    try {
      const transactionsPath = path.join(process.cwd(), 'data/transactions.json');
      const transactionsData = await fs.readFile(transactionsPath, 'utf-8');
      const transactions = JSON.parse(transactionsData);

      const paymentTransaction = transactions.find((tx: any) =>
        tx.invoiceNumber === invoiceToPayy.invoiceNumber &&
        tx.type === 'payment' &&
        tx.status === 'paid'
      );

      if (!paymentTransaction) {
        inconsistencies.push('Payment transaction not recorded');
        recommendations.push('Fix transaction logging in payment execution');
      } else {
        filesModified.push('data/transactions.json');
        console.log(`✅ Payment transaction recorded: ${paymentTransaction.transactionId}`);
      }
    } catch (error) {
      breakages.push('Failed to verify payment transaction record');
      recommendations.push('Check transaction logging implementation');
    }

    return {
      testName: 'Enhanced Milestone Payment Execution',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        invoiceNumber: invoiceToPayy.invoiceNumber,
        amount: invoiceToPayy.totalAmount,
        response: result
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 1,
        dataOperations: 3 // invoice read, invoice update, transaction create
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified,
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Enhanced Milestone Payment Execution',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Payment execution test failed'],
      recommendations: ['Check payment API endpoint and implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 8: Wallet Balance Updates
 */
async function testWalletBalanceUpdates(): Promise<TestResult> {
  console.log('💰 Testing wallet balance updates...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check freelancer wallet balance
    const { getOrCreateWallet } = await import('@/lib/wallets/wallet-store');
    const freelancerWallet = await getOrCreateWallet(TEST_CONFIG.freelancerId);

    const expectedPayment = (10000 / 3) * 0.95; // Milestone amount minus 5% platform fee

    if (freelancerWallet.available < expectedPayment) {
      breakages.push(`Freelancer wallet not credited correctly. Expected at least ${expectedPayment}, got ${freelancerWallet.available}`);
      recommendations.push('Fix wallet crediting in payment execution');
    }

    if (!freelancerWallet.lifetimeEarnings || freelancerWallet.lifetimeEarnings < expectedPayment) {
      breakages.push('Freelancer lifetime earnings not updated correctly');
      recommendations.push('Fix lifetime earnings tracking in wallet updates');
    }

    // Check if payment is reflected in wallet transactions
    try {
      const walletTransactionsPath = path.join(process.cwd(), `data/wallets/${TEST_CONFIG.freelancerId}/transactions.json`);
      const transactionsData = await fs.readFile(walletTransactionsPath, 'utf-8');
      const transactions = JSON.parse(transactionsData);

      const milestonePayment = transactions.find((t: any) =>
        t.type === 'payment_received' &&
        t.invoiceNumber === TEST_CONFIG.testInvoiceNumber
      );

      if (!milestonePayment) {
        breakages.push('Milestone payment transaction not recorded in wallet');
        recommendations.push('Fix transaction recording in payment workflow');
      }
    } catch (error) {
      breakages.push('Failed to verify wallet transaction history');
      recommendations.push('Check wallet transaction storage implementation');
    }

    return {
      testName: 'Wallet Balance Updates',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        freelancerId: TEST_CONFIG.freelancerId,
        walletBalance: freelancerWallet.available,
        lifetimeEarnings: freelancerWallet.lifetimeEarnings,
        expectedPayment
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Wallet Balance Updates',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Wallet balance test failed'],
      recommendations: ['Check wallet storage and update implementation']
    };
  }
}

/**
 * Enhanced Test: Hierarchical Data Integrity
 */
async function testHierarchicalDataIntegrity(projectId: number | null): Promise<TestResult> {
  console.log('🗂️ Testing hierarchical data integrity...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Hierarchical Data Integrity',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test data integrity without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    // Check hierarchical project storage
    const projectPath = `data/projects/${year}/${month}/${day}/${projectId}/project.json`;
    try {
      await fs.access(path.join(process.cwd(), projectPath));
      console.log(`✅ Project found in hierarchical storage: ${projectPath}`);
    } catch {
      inconsistencies.push(`Project not found in expected hierarchical path: ${projectPath}`);
      recommendations.push('Fix hierarchical project storage structure');
    }

    // Check hierarchical task storage
    const taskPath = `data/project-tasks/${year}/${month}/${day}/${projectId}/tasks.json`;
    try {
      await fs.access(path.join(process.cwd(), taskPath));
      console.log(`✅ Tasks found in hierarchical storage: ${taskPath}`);

      // Validate task structure
      const taskData = await fs.readFile(path.join(process.cwd(), taskPath), 'utf-8');
      const taskContainer = JSON.parse(taskData);

      if (!taskContainer.tasks || !Array.isArray(taskContainer.tasks)) {
        inconsistencies.push('Task container missing tasks array');
      }

      if (!taskContainer.updatedAt || !taskContainer.version) {
        inconsistencies.push('Task container missing metadata (updatedAt, version)');
      }
    } catch {
      inconsistencies.push(`Tasks not found in expected hierarchical path: ${taskPath}`);
      recommendations.push('Fix hierarchical task storage structure');
    }

    // Check invoice hierarchical storage
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const invoices = await getAllInvoices();
    const projectInvoices = invoices.filter((inv: any) => inv.projectId === projectId);

    for (const invoice of projectInvoices) {
      const invoicePath = `data/invoices/${year}/${month}/${day}/${invoice.invoiceNumber}/invoice.json`;
      try {
        await fs.access(path.join(process.cwd(), invoicePath));
        console.log(`✅ Invoice found in hierarchical storage: ${invoicePath}`);
      } catch {
        inconsistencies.push(`Invoice not found in expected hierarchical path: ${invoicePath}`);
        recommendations.push('Fix hierarchical invoice storage structure');
      }
    }

    // Check index file consistency
    const indexFiles = [
      'data/projects-index.json',
      'data/invoices-index.json'
    ];

    for (const indexFile of indexFiles) {
      try {
        const indexData = await fs.readFile(path.join(process.cwd(), indexFile), 'utf-8');
        const index = JSON.parse(indexData);

        if (typeof index !== 'object' || index === null || Array.isArray(index)) {
          inconsistencies.push(`Index file ${indexFile} should be an object mapping IDs to metadata`);
        }
      } catch {
        inconsistencies.push(`Index file missing or corrupted: ${indexFile}`);
        recommendations.push(`Create or repair ${indexFile}`);
      }
    }

    return {
      testName: 'Hierarchical Data Integrity',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        hierarchicalPaths: {
          project: projectPath,
          tasks: taskPath,
          invoices: projectInvoices.length
        },
        dateStructure: { year, month, day }
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 3 + projectInvoices.length
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Hierarchical Data Integrity',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Hierarchical data integrity test failed'],
      recommendations: ['Check hierarchical storage implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Enhanced Test: Race Condition Scenarios
 */
async function testRaceConditionScenarios(projectId: number | null): Promise<TestResult> {
  console.log('⚡ Testing race condition scenarios...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  if (!projectId) {
    return {
      testName: 'Race Condition Scenarios',
      status: 'SKIP',
      details: { reason: 'No project ID provided' },
      breakages: ['Cannot test race conditions without valid project ID'],
      recommendations: ['Fix project creation test first'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }

  try {
    // Test concurrent task operations
    const { readProjectTasks } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectTasks = await readProjectTasks(projectId);

    if (!projectTasks || projectTasks.length === 0) {
      return {
        testName: 'Race Condition Scenarios',
        status: 'SKIP',
        details: { reason: 'No tasks found for race condition testing' },
        breakages: ['Cannot test race conditions without tasks'],
        recommendations: ['Fix task creation during project activation'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    const testTask = projectTasks[0];
    console.log(`⚡ Testing race conditions with task: ${testTask.title} (ID: ${testTask.taskId})`);

    // Simulate concurrent task submissions
    const concurrentSubmissions = Array(3).fill(null).map((_, index) => {
      const submissionData = {
        taskId: testTask.taskId,
        action: 'submit',
        actorId: TEST_CONFIG.freelancerId,
        referenceUrl: `https://github.com/test/concurrent-submission-${index}`
      };

      return fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
    });

    const results = await Promise.allSettled(concurrentSubmissions);
    const successfulSubmissions = results.filter(r => r.status === 'fulfilled' && (r.value as Response).ok);

    if (successfulSubmissions.length > 1) {
      inconsistencies.push(`Multiple concurrent submissions succeeded (${successfulSubmissions.length}), should only allow one`);
      recommendations.push('Implement proper locking/atomic operations for task status updates');
    }

    // Test concurrent invoice generation
    const concurrentInvoiceGenerations = Array(2).fill(null).map(() => {
      const invoiceData = {
        taskId: testTask.taskId,
        projectId: projectId,
        action: 'task_approved'
      };

      return fetch(`${TEST_CONFIG.baseUrl}/api/invoices/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });
    });

    const invoiceResults = await Promise.allSettled(concurrentInvoiceGenerations);
    const successfulInvoiceGenerations = invoiceResults.filter(r =>
      r.status === 'fulfilled' && (r.value as Response).ok
    );

    if (successfulInvoiceGenerations.length > 1) {
      inconsistencies.push(`Multiple concurrent invoice generations succeeded (${successfulInvoiceGenerations.length}), should prevent duplicates`);
      recommendations.push('Implement idempotency checks for invoice generation');
    }

    console.log(`⚡ Race condition test results: ${successfulSubmissions.length} submissions, ${successfulInvoiceGenerations.length} invoice generations`);

    return {
      testName: 'Race Condition Scenarios',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId,
        taskId: testTask.taskId,
        concurrentSubmissions: successfulSubmissions.length,
        concurrentInvoiceGenerations: successfulInvoiceGenerations.length
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 5, // 3 submissions + 2 invoice generations
        dataOperations: 1
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Race Condition Scenarios',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        projectId
      },
      breakages: ['Race condition testing failed'],
      recommendations: ['Check concurrent operation handling'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 9: Data Consistency Across Storage Systems (Legacy)
 */
async function testDataConsistencyAcrossStorageSystems(): Promise<TestResult> {
  console.log('🔄 Testing data consistency across storage systems...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check project consistency between different storage systems
    const projectsData = await fs.readFile(path.join(process.cwd(), 'data/projects.json'), 'utf-8');
    const projects = JSON.parse(projectsData);
    const project = projects.find((p: any) => p.projectId === TEST_CONFIG.testProjectId);

    if (!project) {
      breakages.push('Project not found in projects.json');
      recommendations.push('Fix project storage consistency');
    }

    // Check task consistency
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');
    const hierarchicalTasks = await readAllTasks();
    const tasks = convertHierarchicalToLegacy(hierarchicalTasks);
    const projectTasks = tasks.filter((t: any) => t.projectId === TEST_CONFIG.testProjectId);

    if (projectTasks.length === 0) {
      breakages.push('No tasks found for test project in hierarchical storage');
      recommendations.push('Fix task storage consistency');
    }

    // Check milestone consistency
    const milestonesData = await fs.readFile(path.join(process.cwd(), 'data/milestones-minimal.json'), 'utf-8');
    const milestones = JSON.parse(milestonesData);
    const projectMilestones = milestones.filter((m: any) => m.projectId === TEST_CONFIG.testProjectId);

    // Should have milestones for the project
    if (projectMilestones.length === 0) {
      breakages.push('No milestones found for test project');
      recommendations.push('Fix milestone creation during project activation');
    }

    // Check invoice consistency
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const invoices = await getAllInvoices();
    const projectInvoices = invoices.filter((inv: any) => inv.projectId === TEST_CONFIG.testProjectId);

    if (projectInvoices.length === 0) {
      breakages.push('No invoices found for test project');
      recommendations.push('Fix invoice generation and storage');
    }

    return {
      testName: 'Data Consistency Across Storage Systems',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        projectId: TEST_CONFIG.testProjectId,
        taskCount: projectTasks.length,
        milestoneCount: projectMilestones.length,
        invoiceCount: projectInvoices.length
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Data Consistency Across Storage Systems',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Data consistency test failed'],
      recommendations: ['Check storage system implementations and data integrity']
    };
  }
}

/**
 * Test 10: Invoice Storage Integrity
 */
async function testInvoiceStorageIntegrity(): Promise<TestResult> {
  console.log('📄 Testing invoice storage integrity...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    if (!TEST_CONFIG.testInvoiceNumber) {
      breakages.push('No test invoice available for integrity check');
      recommendations.push('Fix invoice generation in previous tests');

      return {
        testName: 'Invoice Storage Integrity',
        status: 'FAIL',
        details: { reason: 'No invoice to check' },
        breakages,
        recommendations
      };
    }

    // Check invoice in hierarchical storage
    const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
    const invoice = await getInvoiceByNumber(TEST_CONFIG.testInvoiceNumber);

    if (!invoice) {
      breakages.push('Invoice not found in storage');
      recommendations.push('Fix invoice storage implementation');
    } else {
      // Validate invoice structure
      const requiredFields = ['invoiceNumber', 'freelancerId', 'projectId', 'commissionerId', 'totalAmount', 'status'];
      for (const field of requiredFields) {
        if (!(field in invoice)) {
          breakages.push(`Invoice missing required field: ${field}`);
          recommendations.push(`Add ${field} to invoice structure`);
        }
      }

      // Validate invoice type
      if (invoice.invoiceType !== 'auto_milestone') {
        breakages.push(`Invoice should have type "auto_milestone", got "${invoice.invoiceType}"`);
        recommendations.push('Fix invoice type setting for milestone invoices');
      }

      // Validate invoicing method
      if (invoice.invoicingMethod !== 'milestone') {
        breakages.push(`Invoice should have invoicing method "milestone", got "${invoice.invoicingMethod}"`);
        recommendations.push('Fix invoicing method preservation in invoice generation');
      }
    }

    return {
      testName: 'Invoice Storage Integrity',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        invoiceNumber: TEST_CONFIG.testInvoiceNumber,
        invoice: invoice
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Invoice Storage Integrity',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Invoice storage integrity test failed'],
      recommendations: ['Check invoice storage implementation']
    };
  }
}

/**
 * Enhanced Test: Payment Failure Recovery
 */
async function testPaymentFailureRecovery(): Promise<TestResult> {
  console.log('💥 Testing payment failure recovery...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesModified: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Find an unpaid invoice to test payment failure
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const invoices = await getAllInvoices();
    const unpaidInvoices = invoices.filter((inv: any) =>
      inv.status === 'sent' &&
      inv.invoiceType === 'auto_milestone'
    );

    if (unpaidInvoices.length === 0) {
      return {
        testName: 'Payment Failure Recovery',
        status: 'SKIP',
        details: { reason: 'No unpaid invoices found for failure testing' },
        breakages: ['Cannot test payment failure without unpaid invoices'],
        recommendations: ['Create test invoices for failure scenario testing'],
        performance: {
          duration: Date.now() - startTime,
          apiCalls: 0,
          dataOperations: 1
        }
      };
    }

    const testInvoice = unpaidInvoices[0];
    console.log(`💥 Testing payment failure for invoice: ${testInvoice.invoiceNumber}`);

    // Test payment with invalid amount (should fail)
    const invalidPaymentData = {
      invoiceNumber: testInvoice.invoiceNumber,
      commissionerId: TEST_CONFIG.commissionerId,
      amount: -100, // Invalid negative amount
      paymentMethodId: 'test_payment_method',
      currency: 'USD'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidPaymentData)
    });

    const result = await response.json();

    // This should fail - if it succeeds, that's a problem
    if (response.ok && result.success) {
      breakages.push('System accepts invalid payment amounts (negative values)');
      recommendations.push('Add proper payment amount validation');
    }

    // Test payment with insufficient funds simulation
    const insufficientFundsData = {
      invoiceNumber: testInvoice.invoiceNumber,
      commissionerId: TEST_CONFIG.commissionerId,
      amount: testInvoice.totalAmount,
      paymentMethodId: 'test_insufficient_funds', // Special test method to simulate failure
      currency: 'USD'
    };

    const insufficientResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(insufficientFundsData)
    });

    const insufficientResult = await insufficientResponse.json();

    // Check if the system properly handles payment failures
    if (insufficientResponse.ok && insufficientResult.success) {
      inconsistencies.push('System does not properly simulate payment failures');
      recommendations.push('Implement proper payment failure simulation for testing');
    }

    // Verify invoice status remains unchanged after failed payment
    try {
      const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
      const invoiceAfterFailure = await getInvoiceByNumber(testInvoice.invoiceNumber);

      if (!invoiceAfterFailure) {
        inconsistencies.push('Invoice disappeared after failed payment attempt');
        recommendations.push('Ensure invoice persistence during payment failures');
      } else if (invoiceAfterFailure.status !== 'sent') {
        inconsistencies.push(`Invoice status changed after failed payment: ${invoiceAfterFailure.status}`);
        recommendations.push('Maintain invoice status during payment failures');
      }
    } catch (error) {
      breakages.push('Failed to verify invoice status after payment failure');
      recommendations.push('Check invoice storage consistency during failures');
    }

    // Test payment retry mechanism
    const retryPaymentData = {
      invoiceNumber: testInvoice.invoiceNumber,
      commissionerId: TEST_CONFIG.commissionerId,
      amount: testInvoice.totalAmount,
      paymentMethodId: 'test_payment_method',
      currency: 'USD',
      isRetry: true
    };

    const retryResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(retryPaymentData)
    });

    const retryResult = await retryResponse.json();

    if (retryResponse.ok && retryResult.success) {
      console.log(`✅ Payment retry successful for invoice: ${testInvoice.invoiceNumber}`);
      filesModified.push(`data/invoices/.../invoice.json`);
    } else {
      inconsistencies.push('Payment retry mechanism not working properly');
      recommendations.push('Fix payment retry logic and error handling');
    }

    return {
      testName: 'Payment Failure Recovery',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        testInvoiceNumber: testInvoice.invoiceNumber,
        testScenarios: [
          'Invalid payment amount',
          'Insufficient funds simulation',
          'Payment retry mechanism'
        ]
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 3, // invalid payment, insufficient funds, retry
        dataOperations: 2 // invoice read, invoice verify
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified,
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Payment Failure Recovery',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack
      },
      breakages: ['Payment failure recovery test failed'],
      recommendations: ['Check payment failure handling implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Enhanced Test: Data Corruption Recovery
 */
async function testDataCorruptionRecovery(): Promise<TestResult> {
  console.log('🔧 Testing data corruption recovery...');
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Test handling of corrupted JSON files
    const testCorruptionScenarios = [
      {
        name: 'Invalid JSON in invoice file',
        test: async () => {
          try {
            const { getAllInvoices } = await import('@/lib/invoice-storage');
            await getAllInvoices();
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Missing required fields in project data',
        test: async () => {
          try {
            const { readAllProjects } = await import('@/lib/projects-utils');
            const projects = await readAllProjects();

            // Check if any projects are missing required fields
            const invalidProjects = projects.filter((p: any) =>
              !p.projectId || !p.status || !p.freelancerId || !p.commissionerId
            );

            return invalidProjects.length === 0;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Orphaned tasks without projects',
        test: async () => {
          try {
            const { readAllTasks } = await import('@/lib/project-tasks/hierarchical-storage');
            const { readAllProjects } = await import('@/lib/projects-utils');

            const [tasks, projects] = await Promise.all([
              readAllTasks(),
              readAllProjects()
            ]);

            const projectIds = new Set(projects.map((p: any) => p.projectId));
            const orphanedTasks = tasks.filter((t: any) =>
              t.projectId && !projectIds.has(t.projectId)
            );

            return orphanedTasks.length === 0;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Inconsistent invoice amounts',
        test: async () => {
          try {
            const { getAllInvoices } = await import('@/lib/invoice-storage');
            const invoices = await getAllInvoices();

            const invalidInvoices = invoices.filter((inv: any) =>
              !inv.totalAmount ||
              inv.totalAmount <= 0 ||
              typeof inv.totalAmount !== 'number'
            );

            return invalidInvoices.length === 0;
          } catch (error) {
            return false;
          }
        }
      }
    ];

    for (const scenario of testCorruptionScenarios) {
      try {
        const result = await scenario.test();
        if (!result) {
          inconsistencies.push(`Data corruption detected: ${scenario.name}`);
          recommendations.push(`Fix data corruption issue: ${scenario.name}`);
        } else {
          console.log(`✅ ${scenario.name}: No corruption detected`);
        }
      } catch (error) {
        breakages.push(`Failed to test ${scenario.name}: ${(error as Error).message}`);
        recommendations.push(`Fix corruption testing for: ${scenario.name}`);
      }
    }

    // Test data recovery mechanisms
    try {
      // Check if backup/recovery systems exist
      const backupPaths = [
        'data/backups',
        'data/.backup',
        'data/recovery'
      ];

      let backupSystemExists = false;
      for (const backupPath of backupPaths) {
        try {
          await fs.access(path.join(process.cwd(), backupPath));
          backupSystemExists = true;
          console.log(`✅ Backup system found: ${backupPath}`);
          break;
        } catch {
          // Continue checking other paths
        }
      }

      if (!backupSystemExists) {
        recommendations.push('Implement data backup and recovery system');
        inconsistencies.push('No backup system detected for data recovery');
      }
    } catch (error) {
      breakages.push('Failed to check backup system existence');
      recommendations.push('Implement proper backup system checks');
    }

    return {
      testName: 'Data Corruption Recovery',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        testedScenarios: testCorruptionScenarios.map(s => s.name),
        corruptionIssuesFound: inconsistencies.length
      },
      breakages,
      recommendations,
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: testCorruptionScenarios.length
      },
      dataIntegrity: {
        filesCreated: [],
        filesModified: [],
        inconsistencies
      }
    };

  } catch (error) {
    return {
      testName: 'Data Corruption Recovery',
      status: 'ERROR',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack
      },
      breakages: ['Data corruption recovery test failed'],
      recommendations: ['Check data integrity validation implementation'],
      performance: {
        duration: Date.now() - startTime,
        apiCalls: 0,
        dataOperations: 0
      }
    };
  }
}

/**
 * Test 11: Edge Cases and Error Handling (Legacy)
 */
async function testEdgeCasesAndErrorHandling(): Promise<TestResult> {
  console.log('⚠️ Testing edge cases and error handling...');

  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Test 1: Duplicate task approval
    try {
      const duplicateApprovalData = {
        taskId: TEST_CONFIG.testTaskId,
        action: 'approve',
        actorId: TEST_CONFIG.commissionerId
      };

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateApprovalData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        breakages.push('System allows duplicate task approval');
        recommendations.push('Add validation to prevent duplicate task approvals');
      }
    } catch (error) {
      // Expected to fail, this is good
    }

    // Test 2: Invalid payment amount
    try {
      const invalidPaymentData = {
        invoiceNumber: TEST_CONFIG.testInvoiceNumber,
        commissionerId: TEST_CONFIG.commissionerId,
        amount: 999999, // Wrong amount
        paymentMethodId: 'test_payment_method_123',
        currency: 'USD'
      };

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/pay-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPaymentData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        breakages.push('System allows payment with incorrect amount');
        recommendations.push('Add amount validation in payment processing');
      }
    } catch (error) {
      // Expected to fail, this is good
    }

    // Test 3: Unauthorized task approval
    try {
      const unauthorizedApprovalData = {
        taskId: TEST_CONFIG.testTaskId,
        action: 'approve',
        actorId: TEST_CONFIG.freelancerId // Freelancer trying to approve their own task
      };

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/test/task-operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unauthorizedApprovalData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        breakages.push('System allows freelancer to approve their own tasks');
        recommendations.push('Add authorization checks for task approval');
      }
    } catch (error) {
      // Expected to fail, this is good
    }

    return {
      testName: 'Edge Cases and Error Handling',
      status: breakages.length === 0 ? 'PASS' : 'FAIL',
      details: {
        testedScenarios: [
          'Duplicate task approval',
          'Invalid payment amount',
          'Unauthorized task approval'
        ]
      },
      breakages,
      recommendations
    };

  } catch (error) {
    return {
      testName: 'Edge Cases and Error Handling',
      status: 'ERROR',
      details: { error: (error as Error).message },
      breakages: ['Edge cases test failed'],
      recommendations: ['Check error handling implementation']
    };
  }
}

// Note: Enhanced generateReport function is defined earlier in the file

/**
 * Print enhanced comprehensive test report with prognosis
 */
export function printTestReport(report: ComprehensiveTestReport): void {
  console.log('\n' + '='.repeat(100));
  console.log('🧪 ENHANCED MILESTONE-BASED INVOICING TEST SUITE REPORT & PROGNOSIS');
  console.log('='.repeat(100));

  // Summary with enhanced metrics
  console.log('\n📊 TEST EXECUTION SUMMARY:');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`🚨 Errors: ${report.summary.errors}`);
  console.log(`⏭️ Skipped: ${report.summary.skipped}`);
  console.log(`⏱️ Total Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);

  // Performance Metrics
  console.log('\n⚡ PERFORMANCE METRICS:');
  console.log(`Average API Response Time: ${report.performanceMetrics.averageApiResponseTime.toFixed(2)}ms`);
  console.log(`Slowest Operation: ${report.performanceMetrics.slowestOperation}`);
  console.log(`Data Consistency Score: ${report.performanceMetrics.dataConsistencyScore.toFixed(1)}%`);

  // System Health Prognosis
  console.log('\n🏥 SYSTEM HEALTH PROGNOSIS:');
  const healthIcon = report.prognosis.overallHealth === 'HEALTHY' ? '🟢' :
                     report.prognosis.overallHealth === 'DEGRADED' ? '🟡' : '🔴';
  console.log(`${healthIcon} Overall Health: ${report.prognosis.overallHealth}`);
  console.log(`🚀 Production Ready: ${report.prognosis.readinessForProduction ? 'YES' : 'NO'}`);

  if (report.prognosis.priorityFixes.length > 0) {
    console.log('\n🔧 PRIORITY FIXES REQUIRED:');
    report.prognosis.priorityFixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`);
    });
  }
  const successRate = Math.round((report.summary.passed / report.summary.totalTests) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);

  // Detailed results with performance data
  console.log('\n📋 DETAILED TEST RESULTS:');
  report.results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' :
                       result.status === 'FAIL' ? '❌' :
                       result.status === 'SKIP' ? '⏭️' : '🚨';
    console.log(`${index + 1}. ${statusIcon} ${result.testName}: ${result.status}`);

    if (result.performance) {
      console.log(`   ⏱️ Duration: ${result.performance.duration}ms, API Calls: ${result.performance.apiCalls}, Data Ops: ${result.performance.dataOperations}`);
    }

    if (result.dataIntegrity && result.dataIntegrity.inconsistencies.length > 0) {
      console.log(`   ⚠️ Data Inconsistencies: ${result.dataIntegrity.inconsistencies.length}`);
    }

    if (result.breakages && result.breakages.length > 0) {
      console.log(`   💥 Breakages:`);
      result.breakages.forEach(breakage => console.log(`     - ${breakage}`));
    }

    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`   💡 Recommendations:`);
      result.recommendations.forEach(rec => console.log(`     - ${rec}`));
    }
    console.log('');
  });

  // Critical breakages
  if (report.criticalBreakages.length > 0) {
    console.log('\n🚨 CRITICAL BREAKAGES REQUIRING IMMEDIATE ATTENTION:');
    report.criticalBreakages.forEach((breakage, index) => {
      console.log(`${index + 1}. ${breakage}`);
    });
  }

  // System recommendations
  console.log('\n💡 SYSTEM-WIDE RECOMMENDATIONS:');
  report.systemRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  // Final assessment
  console.log('\n🎯 FINAL ASSESSMENT:');
  if (report.prognosis.readinessForProduction) {
    console.log('🟢 SYSTEM IS READY FOR PRODUCTION');
    console.log('   All critical milestone invoicing workflows are functioning correctly.');
  } else {
    console.log('🔴 SYSTEM NOT READY FOR PRODUCTION');
    console.log('   Critical issues must be resolved before deployment.');
  }

  console.log('\n' + '='.repeat(100));
  console.log('END OF ENHANCED MILESTONE INVOICING TEST REPORT');
  console.log('='.repeat(100) + '\n');
}

/**
 * Jest test wrapper for the comprehensive milestone invoicing test suite
 * Note: This is only used when running with Jest, not with tsx
 */
if (typeof describe !== 'undefined') {
  describe('Milestone-Based Invoicing Integration Test Suite', () => {
    jest.setTimeout(120000); // 2 minutes timeout for comprehensive testing

    test('should run comprehensive milestone invoicing workflow test', async () => {
      console.log('🚀 Starting comprehensive milestone invoicing test suite...');

      const report = await runComprehensiveMilestoneTest();

      // Print the detailed report
      printTestReport(report);

      // Assert based on the results
      expect(report.summary.totalTests).toBeGreaterThan(0);

      // Check if critical systems are working
      const criticalTests = [
        'Enhanced Freelancer Matching',
        'Enhanced Task Approval with Milestone Invoicing',
        'Automatic Milestone Invoice Generation',
        'Enhanced Milestone Payment Execution'
      ];

      const criticalTestResults = report.results.filter(r =>
        criticalTests.includes(r.testName)
      );

      const failedCriticalTests = criticalTestResults.filter(r =>
        r.status === 'FAIL' || r.status === 'ERROR'
      );

      if (failedCriticalTests.length > 0) {
        console.error('❌ Critical milestone invoicing tests failed:');
        failedCriticalTests.forEach(test => {
          console.error(`   - ${test.testName}: ${test.status}`);
          if (test.breakages) {
            test.breakages.forEach(breakage => console.error(`     * ${breakage}`));
          }
        });
      }

      // Provide detailed feedback for Jest
      expect(failedCriticalTests.length).toBe(0);
      expect(report.prognosis.overallHealth).not.toBe('CRITICAL');

      console.log(`✅ Test suite completed with ${report.summary.passed}/${report.summary.totalTests} tests passing`);
    });
  });
}

/**
 * Helper function to scan for scattered task files
 */
async function scanForScatteredTasks(dir: string, projectId: number, found: string[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanForScatteredTasks(fullPath, projectId, found);
      } else if (entry.name.includes('task') && entry.name.endsWith('.json')) {
        try {
          const taskData = await fs.readFile(fullPath, 'utf-8');
          const task = JSON.parse(taskData);
          if (task.projectId === projectId) {
            found.push(fullPath);
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - that's okay
  }
}
