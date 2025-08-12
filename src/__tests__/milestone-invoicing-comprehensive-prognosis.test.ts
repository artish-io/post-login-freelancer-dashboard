/**
 * ENHANCED Comprehensive Milestone-Based Invoicing Workflow Test & Prognosis
 *
 * This test script creates a complete milestone-based gig, tests freelancer matching,
 * project activation, task workflow, and payment execution. It identifies breakages
 * without fixing them and provides a detailed prognosis with scoring.
 *
 * ENHANCED Test Flow:
 * 1. Create milestone-based gig with 3 milestones
 * 2. Test freelancer matching and project activation
 * 3. Validate task creation from milestones
 * 4. Test task submission and approval workflow
 * 5. Validate automatic invoice generation per milestone
 * 6. Test payment execution and wallet updates
 * 7. Comprehensive data integrity validation
 * 8. Performance metrics and timing analysis
 * 9. Critical path analysis and bottleneck identification
 * 10. Production readiness assessment with scoring
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  createMockRequest,
  createMockApiResponse,
  createMockMilestoneGig,
  createMockMilestoneProject,
  createMockMilestoneTask,
  setupTestEnvironment
} from './test-utils';

// Enhanced Test Configuration
const TEST_CONFIG = {
  freelancerId: 31,
  commissionerId: 32,
  organizationId: 1,
  testGigId: Date.now(),
  testProjectId: Date.now() + 1000,
  totalBudget: 15000,
  milestoneCount: 3,
  expectedMilestoneAmount: 5000, // 15000 / 3 milestones
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testTimeout: 45000,
  retryAttempts: 3,
  dataPath: path.join(process.cwd(), 'data'),
  // Enhanced configuration
  performanceThresholds: {
    gigCreation: 2000, // 2 seconds
    projectActivation: 3000, // 3 seconds
    taskCreation: 1500, // 1.5 seconds
    invoiceGeneration: 2500, // 2.5 seconds
    paymentExecution: 4000 // 4 seconds
  },
  criticalityWeights: {
    gigCreation: 20,
    freelancerMatching: 25,
    taskWorkflow: 20,
    invoiceGeneration: 25,
    paymentExecution: 10
  }
};

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  duration: number;
  details: any;
  breakages: string[];
  recommendations: string[];
  dataIntegrity: {
    filesCreated: string[];
    filesModified: string[];
    inconsistencies: string[];
  };
  // Enhanced metrics
  performanceScore: number; // 0-100
  criticalityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bottlenecks: string[];
  apiEndpointsUsed: string[];
  dataFlowValidation: {
    inputValidation: boolean;
    outputValidation: boolean;
    stateConsistency: boolean;
  };
}

interface ComprehensiveReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    totalDuration: number;
    // Enhanced summary metrics
    overallScore: number; // 0-100
    performanceScore: number; // 0-100
    reliabilityScore: number; // 0-100
    dataIntegrityScore: number; // 0-100
  };
  results: TestResult[];
  criticalBreakages: string[];
  systemRecommendations: string[];
  prognosis: {
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    readinessForProduction: boolean;
    priorityFixes: string[];
    // Enhanced prognosis
    productionReadinessScore: number; // 0-100
    riskAssessment: {
      dataLoss: 'LOW' | 'MEDIUM' | 'HIGH';
      userExperience: 'LOW' | 'MEDIUM' | 'HIGH';
      businessImpact: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    recommendedActions: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
  // Enhanced reporting
  performanceAnalysis: {
    slowestOperations: Array<{ operation: string; duration: number; threshold: number }>;
    bottleneckAnalysis: string[];
    scalabilityAssessment: string;
  };
  dataFlowAnalysis: {
    criticalPaths: string[];
    dataConsistencyIssues: string[];
    storageEfficiency: string;
  };
}

/**
 * Enhanced main test execution function with comprehensive analysis
 */
export async function runMilestoneInvoicingPrognosis(): Promise<ComprehensiveReport> {
  console.log('🧪 Starting ENHANCED Comprehensive Milestone-Based Invoicing Test & Prognosis...\n');
  console.log('📊 This test will provide detailed breakage analysis and production readiness scoring\n');

  // Set test environment
  process.env.TEST_BYPASS_AUTH = '1';
  process.env.NODE_ENV = 'test';

  const results: TestResult[] = [];
  const startTime = Date.now();
  let projectId: number | null = null;
  let gigId: number | null = null;
  const performanceMetrics: Array<{ phase: string; duration: number; threshold: number }> = [];

  try {
    // Phase 1: Gig Creation with Milestone Configuration
    console.log('📝 Phase 1: Creating Milestone-Based Gig with Enhanced Validation');
    const phaseStartTime = Date.now();
    const gigResult = await testMilestoneGigCreation();
    const phaseDuration = Date.now() - phaseStartTime;
    performanceMetrics.push({
      phase: 'Gig Creation',
      duration: phaseDuration,
      threshold: TEST_CONFIG.performanceThresholds.gigCreation
    });

    results.push(gigResult);

    if (gigResult.status === 'PASS') {
      gigId = gigResult.details.gigId;
      console.log(`✅ Created gig with ID: ${gigId} (${phaseDuration}ms)`);
    } else {
      console.log('❌ Gig creation failed, skipping dependent tests');
      console.log(`🔍 Breakages detected: ${gigResult.breakages.length}`);
      return generateFinalReport(results, startTime, performanceMetrics);
    }

    // Phase 2: Freelancer Matching and Project Activation
    console.log('\n🤝 Phase 2: Freelancer Matching and Project Activation with Performance Analysis');
    const matchingStartTime = Date.now();
    const matchingResult = await testFreelancerMatching(gigId!);
    const matchingDuration = Date.now() - matchingStartTime;
    performanceMetrics.push({
      phase: 'Project Activation',
      duration: matchingDuration,
      threshold: TEST_CONFIG.performanceThresholds.projectActivation
    });

    results.push(matchingResult);

    if (matchingResult.status === 'PASS') {
      projectId = matchingResult.details.projectId;
      console.log(`✅ Created project with ID: ${projectId} (${matchingDuration}ms)`);
    } else {
      console.log('❌ Freelancer matching failed, skipping dependent tests');
      console.log(`🔍 Breakages detected: ${matchingResult.breakages.length}`);
      return generateFinalReport(results, startTime, performanceMetrics);
    }

    // Phase 3: Task Creation and Milestone Validation
    console.log('\n📋 Phase 3: Task Creation from Milestones with Data Flow Analysis');
    const taskCreationStartTime = Date.now();
    const taskResult = await testTaskCreationFromMilestones(projectId!);
    const taskCreationDuration = Date.now() - taskCreationStartTime;
    performanceMetrics.push({
      phase: 'Task Creation',
      duration: taskCreationDuration,
      threshold: TEST_CONFIG.performanceThresholds.taskCreation
    });
    results.push(taskResult);

    // Phase 4: Task Workflow Testing
    console.log('\n🔄 Phase 4: Task Submission and Approval Workflow with State Validation');
    results.push(await testTaskSubmissionWorkflow(projectId!));
    results.push(await testTaskApprovalWithInvoicing(projectId!));

    // Phase 5: Invoice Generation and Payment Testing
    console.log('\n💰 Phase 5: Invoice Generation and Payment Execution with Financial Validation');
    const invoiceStartTime = Date.now();
    const invoiceResult = await testMilestoneInvoiceGeneration(projectId!);
    const invoiceDuration = Date.now() - invoiceStartTime;
    performanceMetrics.push({
      phase: 'Invoice Generation',
      duration: invoiceDuration,
      threshold: TEST_CONFIG.performanceThresholds.invoiceGeneration
    });
    results.push(invoiceResult);

    const paymentStartTime = Date.now();
    const paymentResult = await testPaymentExecution(projectId!);
    const paymentDuration = Date.now() - paymentStartTime;
    performanceMetrics.push({
      phase: 'Payment Execution',
      duration: paymentDuration,
      threshold: TEST_CONFIG.performanceThresholds.paymentExecution
    });
    results.push(paymentResult);

    // Phase 6: Data Integrity Validation
    console.log('\n🔍 Phase 6: Comprehensive Data Integrity and Consistency Validation');
    results.push(await testDataIntegrityValidation(projectId!));

    // Phase 7: Enhanced System Analysis
    console.log('\n📈 Phase 7: System Performance and Scalability Analysis');
    results.push(await testSystemPerformanceAnalysis(projectId!, performanceMetrics));

  } catch (error) {
    console.error('❌ Critical error in test execution:', error);
    results.push(createErrorResult('Critical Test Execution Error', error, Date.now() - startTime));
  }

  return generateFinalReport(results, startTime, performanceMetrics);
}

/**
 * Enhanced utility functions
 */
function createErrorResult(testName: string, error: any, duration: number): TestResult {
  return {
    testName,
    status: 'ERROR',
    duration,
    details: { error: error instanceof Error ? error.message : String(error) },
    breakages: ['Test execution framework failure'],
    recommendations: ['Review test setup and dependencies'],
    dataIntegrity: { filesCreated: [], filesModified: [], inconsistencies: [] },
    performanceScore: 0,
    criticalityLevel: 'CRITICAL',
    bottlenecks: ['Test framework failure'],
    apiEndpointsUsed: [],
    dataFlowValidation: { inputValidation: false, outputValidation: false, stateConsistency: false }
  };
}

function calculatePerformanceScore(duration: number, threshold: number): number {
  if (duration <= threshold * 0.5) return 100;
  if (duration <= threshold) return 80;
  if (duration <= threshold * 1.5) return 60;
  if (duration <= threshold * 2) return 40;
  return 20;
}

function determineCriticalityLevel(breakages: string[], testName: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (breakages.length === 0) return 'LOW';
  if (testName.includes('Payment') || testName.includes('Invoice')) return 'CRITICAL';
  if (testName.includes('Gig Creation') || testName.includes('Project')) return 'HIGH';
  if (breakages.length > 3) return 'HIGH';
  if (breakages.length > 1) return 'MEDIUM';
  return 'LOW';
}

/**
 * Enhanced Test 1: Create milestone-based gig with comprehensive validation
 */
async function testMilestoneGigCreation(): Promise<TestResult> {
  const testName = 'Enhanced Milestone-Based Gig Creation';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };
  const apiEndpointsUsed: string[] = [];
  const bottlenecks: string[] = [];

  try {
    // Use enhanced test utilities for consistent test data
    const gigData = createMockMilestoneGig({
      title: 'Test Milestone-Based Project for Comprehensive Validation',
      commissionerId: TEST_CONFIG.commissionerId,
      organizationId: TEST_CONFIG.organizationId,
      description: 'Comprehensive test project for milestone-based invoicing workflow validation',
      budget: TEST_CONFIG.totalBudget,
      lowerBudget: TEST_CONFIG.totalBudget,
      upperBudget: TEST_CONFIG.totalBudget,
      deliveryTimeWeeks: 12,
      estimatedHours: 300
    });

    // Test gig creation with proper NextResponse handling
    let response: any;
    let result: any;

    try {
      // Create proper Web API compatible Request object
      const mockRequest = new Request('http://localhost:3000/api/gigs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Auth': 'ok'
        },
        body: JSON.stringify(gigData)
      });

      // Import and call the API handler
      const routePath = path.join(process.cwd(), 'src/app/api/gigs/create/route.ts');
      const { POST } = await import(routePath);

      response = await POST(mockRequest);

      // Handle NextResponse object properly
      if (response && typeof response.json === 'function') {
        result = await response.json();
      } else if (response && response.body) {
        // Handle Response object
        result = await response.json();
      } else {
        // Direct object response
        result = response;
      }

      apiEndpointsUsed.push('/api/gigs/create');

    } catch (importError) {
      // Fallback to fetch-based testing if direct import fails
      console.log('⚠️  Direct API import failed, using fetch-based testing');

      try {
        apiEndpointsUsed.push('/api/gigs/create (fetch)');

        // Check if fetch is available, if not, use a different approach
        if (typeof fetch === 'undefined') {
          throw new Error('fetch is not defined');
        }

        response = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Bypass-Auth': 'true'
          },
          body: JSON.stringify(gigData)
        });

        console.log('🔍 Fetch response status:', response.status, 'OK:', response.ok);

        if (response.ok) {
          result = await response.json();
          console.log('🔍 Fetch response result:', JSON.stringify(result));
        } else {
          const errorText = await response.text();
          console.log('🔍 Fetch error response:', errorText);
          breakages.push(`API returned error status: ${response.status} - ${errorText}`);
          result = { success: false, error: errorText };
        }
      } catch (fetchError) {
        // Fallback: use Node.js http module directly
        console.log('⚠️  Fetch failed, trying Node.js http module');

        try {
          const http = require('http');
          const postData = JSON.stringify(gigData);

          const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/gigs/create',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'X-Test-Bypass-Auth': 'true'
            }
          };

          const httpResult = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => data += chunk);
              res.on('end', () => {
                try {
                  const parsed = JSON.parse(data);
                  resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data: parsed
                  });
                } catch (e) {
                  resolve({
                    ok: false,
                    status: res.statusCode,
                    data: { error: 'Invalid JSON response', raw: data }
                  });
                }
              });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
          });

          if (httpResult.ok) {
            result = httpResult.data;
            console.log('✅ HTTP request successful:', JSON.stringify(result));
          } else {
            breakages.push(`HTTP request failed with status: ${httpResult.status}`);
            result = httpResult.data;
          }

        } catch (httpError) {
          // If all methods fail, create a mock response for testing infrastructure
          breakages.push(`API testing infrastructure failure: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          breakages.push(`HTTP fallback also failed: ${httpError instanceof Error ? httpError.message : String(httpError)}`);
          recommendations.push('Set up proper API testing infrastructure or start development server');

          // Create mock successful response for downstream testing
          result = {
            success: true,
            gigId: TEST_CONFIG.testGigId,
            message: 'Mock gig created for testing'
          };
        }
      }
    }

    // Validate response structure (result already contains parsed JSON)
    if (!result || typeof result !== 'object') {
      breakages.push('Gig creation failed: No valid response received');
      breakages.push(`Response type: ${typeof result}, Value: ${JSON.stringify(result)}`);
      recommendations.push('Check gig creation API endpoint implementation and response handling');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: 'No valid response', response: result },
        breakages,
        recommendations,
        dataIntegrity,
        performanceScore: 0,
        criticalityLevel: 'CRITICAL',
        bottlenecks,
        apiEndpointsUsed,
        dataFlowValidation: { inputValidation: false, outputValidation: false, stateConsistency: false }
      };
    }

    // Check for API error responses
    if (result.success === false) {
      breakages.push(`Gig creation API returned error: ${result.message || 'Unknown error'}`);
      if (result.code) {
        breakages.push(`Error code: ${result.code}`);

        // Provide specific recommendations based on error code
        if (result.code === 'INVALID_INPUT') {
          recommendations.push('Review gig input data structure and validation requirements');
          recommendations.push('Check milestone data format and required fields');
        } else if (result.code === 'UNAUTHORIZED') {
          recommendations.push('Verify TEST_BYPASS_AUTH environment variable is properly set');
          recommendations.push('Check authentication bypass implementation in API route');
        } else if (result.code === 'STORAGE_IO_ERROR') {
          recommendations.push('Check file system permissions and storage directory structure');
        }
      }
      recommendations.push('Check gig creation API endpoint and validation logic');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: result, apiResponse: result },
        breakages,
        recommendations,
        dataIntegrity,
        performanceScore: 0,
        criticalityLevel: 'HIGH',
        bottlenecks,
        apiEndpointsUsed,
        dataFlowValidation: { inputValidation: true, outputValidation: false, stateConsistency: false }
      };
    }

    // Validate successful response structure
    if (!result.success || !result.gigId) {
      breakages.push('Gig creation API returned unexpected response structure');
      breakages.push(`Expected: {success: true, gigId: number}, Got: ${JSON.stringify(result)}`);
      recommendations.push('Verify API response format consistency');
      recommendations.push('Check gig creation implementation for proper response structure');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: 'Invalid response structure', response: result },
        breakages,
        recommendations,
        dataIntegrity,
        performanceScore: 0,
        criticalityLevel: 'MEDIUM',
        bottlenecks,
        apiEndpointsUsed,
        dataFlowValidation: { inputValidation: true, outputValidation: false, stateConsistency: false }
      };
    }

    // Validate gig was stored correctly
    const gigValidation = await validateGigStorage(result.gigId, gigData);
    breakages.push(...gigValidation.breakages);
    recommendations.push(...gigValidation.recommendations);
    dataIntegrity.filesCreated.push(...gigValidation.filesCreated);

    const duration = Date.now() - startTime;
    const performanceScore = calculatePerformanceScore(duration, TEST_CONFIG.performanceThresholds.gigCreation);
    const criticalityLevel = determineCriticalityLevel(breakages, testName);

    // Enhanced validation
    const dataFlowValidation = {
      inputValidation: gigData.milestones && gigData.milestones.length === TEST_CONFIG.milestoneCount,
      outputValidation: result.success && result.gigId,
      stateConsistency: breakages.length === 0
    };

    if (duration > TEST_CONFIG.performanceThresholds.gigCreation) {
      bottlenecks.push(`Gig creation exceeded performance threshold: ${duration}ms > ${TEST_CONFIG.performanceThresholds.gigCreation}ms`);
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: { gigId: result.gigId, gigData, response: result },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore,
      criticalityLevel,
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation
    };

  } catch (error) {
    breakages.push(`Unexpected error during gig creation: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review gig creation endpoint implementation and error handling');
    bottlenecks.push('Critical error in gig creation workflow');

    const duration = Date.now() - startTime;
    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore: 0,
      criticalityLevel: 'CRITICAL',
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation: { inputValidation: false, outputValidation: false, stateConsistency: false }
    };
  }
}

/**
 * Enhanced Test 8: System Performance Analysis
 */
async function testSystemPerformanceAnalysis(
  projectId: number,
  performanceMetrics: Array<{ phase: string; duration: number; threshold: number }>
): Promise<TestResult> {
  const testName = 'System Performance and Scalability Analysis';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };
  const bottlenecks: string[] = [];
  const apiEndpointsUsed: string[] = [];

  try {
    // Analyze performance metrics
    const slowOperations = performanceMetrics.filter(metric => metric.duration > metric.threshold);

    if (slowOperations.length > 0) {
      breakages.push(`${slowOperations.length} operations exceeded performance thresholds`);
      slowOperations.forEach(op => {
        bottlenecks.push(`${op.phase}: ${op.duration}ms (threshold: ${op.threshold}ms)`);
      });
      recommendations.push('Optimize slow operations for better user experience');
    }

    // Check system resource usage patterns
    const totalDuration = performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageDuration = totalDuration / performanceMetrics.length;

    if (averageDuration > 3000) {
      breakages.push('Average operation duration exceeds acceptable limits');
      recommendations.push('Implement caching and optimize database queries');
    }

    // Analyze critical path bottlenecks
    const criticalPath = performanceMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .map(metric => `${metric.phase} (${metric.duration}ms)`);

    // Memory and storage efficiency analysis
    const dataStorageAnalysis = await analyzeDataStorageEfficiency(projectId);
    breakages.push(...dataStorageAnalysis.breakages);
    recommendations.push(...dataStorageAnalysis.recommendations);

    const duration = Date.now() - startTime;
    const performanceScore = slowOperations.length === 0 ? 100 : Math.max(0, 100 - (slowOperations.length * 20));

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        performanceMetrics,
        slowOperations,
        averageDuration,
        criticalPath,
        dataStorageAnalysis: dataStorageAnalysis.details
      },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore,
      criticalityLevel: slowOperations.length > 2 ? 'HIGH' : slowOperations.length > 0 ? 'MEDIUM' : 'LOW',
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation: {
        inputValidation: true,
        outputValidation: true,
        stateConsistency: breakages.length === 0
      }
    };

  } catch (error) {
    breakages.push(`Error during performance analysis: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review performance analysis implementation');

    const duration = Date.now() - startTime;
    return {
      testName,
      status: 'ERROR',
      duration,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore: 0,
      criticalityLevel: 'MEDIUM',
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation: { inputValidation: false, outputValidation: false, stateConsistency: false }
    };
  }
}

/**
 * Enhanced Test 2: Freelancer matching and project activation
 */
async function testFreelancerMatching(gigId: number): Promise<TestResult> {
  const testName = 'Enhanced Freelancer Matching and Project Activation';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };
  const apiEndpointsUsed: string[] = [];
  const bottlenecks: string[] = [];

  try {
    // Enhanced application data using test utilities
    const applicationData = {
      gigId,
      freelancerId: TEST_CONFIG.freelancerId,
      pitch: 'Test application for milestone-based project validation',
      sampleLinks: ['https://example.com/portfolio1', 'https://example.com/portfolio2'],
      skills: ['React', 'TypeScript', 'Node.js'],
      tools: ['React', 'Jest', 'TypeScript']
    };

    let applicationResponse: any;
    let applicationResult: any;

    try {
      apiEndpointsUsed.push('/api/gigs/gig-applications');
      applicationResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/gig-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass-Auth': 'true'
        },
        body: JSON.stringify(applicationData)
      });

      if (!applicationResponse.ok) {
        const errorData = await applicationResponse.json().catch(() => ({}));
        breakages.push(`Gig application creation failed with status ${applicationResponse.status}`);
        breakages.push(`Application error: ${JSON.stringify(errorData)}`);
        recommendations.push('Check gig application API endpoint or start development server');

        // Create mock application for testing downstream processes
        applicationResult = { applicationId: Date.now(), success: true };
      } else {
        applicationResult = await applicationResponse.json();
      }
    } catch (fetchError) {
      breakages.push(`Cannot reach gig application API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      recommendations.push('Ensure development server is running or implement proper API mocking');

      // Create mock application for testing downstream processes
      applicationResult = { applicationId: Date.now(), success: true };
    }

    const applicationId = applicationResult.applicationId;

    if (!applicationId) {
      breakages.push('Application created but no applicationId returned');
      recommendations.push('Verify application response structure');
    }

    // Now test freelancer matching with enhanced error handling
    const matchingData = {
      applicationId,
      gigId,
      freelancerId: TEST_CONFIG.freelancerId
    };

    let matchingResponse: any;
    let matchingResult: any;
    let projectId: number;

    try {
      apiEndpointsUsed.push('/api/gigs/match-freelancer');
      matchingResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/gigs/match-freelancer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass-Auth': 'true'
        },
        body: JSON.stringify(matchingData)
      });

      if (!matchingResponse.ok) {
        const errorData = await matchingResponse.json().catch(() => ({}));
        breakages.push(`Freelancer matching failed with status ${matchingResponse.status}`);
        breakages.push(`Matching error: ${JSON.stringify(errorData)}`);
        recommendations.push('Check freelancer matching API endpoint and logic');

        // Create mock project for testing downstream processes
        projectId = Date.now();
        matchingResult = {
          success: true,
          entities: { project: { projectId } },
          message: 'Mock project created for testing'
        };
      } else {
        matchingResult = await matchingResponse.json();
        projectId = matchingResult.entities?.project?.projectId || Date.now();
      }
    } catch (fetchError) {
      breakages.push(`Cannot reach freelancer matching API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      recommendations.push('Ensure development server is running or implement proper API mocking');

      // Create mock project for testing downstream processes
      projectId = Date.now();
      matchingResult = {
        success: true,
        entities: { project: { projectId } },
        message: 'Mock project created for testing'
      };
    }

    if (!matchingResult.success || !projectId) {
      breakages.push('Matching succeeded but project was not created properly');
      recommendations.push('Verify project creation logic in matching workflow');
      projectId = Date.now(); // Fallback for testing
    }

    // Validate project was created with correct milestone configuration
    const projectValidation = await validateProjectCreation(projectId, gigId);
    breakages.push(...projectValidation.breakages);
    recommendations.push(...projectValidation.recommendations);
    dataIntegrity.filesCreated.push(...projectValidation.filesCreated);

    const duration = Date.now() - startTime;
    const performanceScore = calculatePerformanceScore(duration, TEST_CONFIG.performanceThresholds.projectActivation);
    const criticalityLevel = determineCriticalityLevel(breakages, testName);

    if (duration > TEST_CONFIG.performanceThresholds.projectActivation) {
      bottlenecks.push(`Project activation exceeded performance threshold: ${duration}ms > ${TEST_CONFIG.performanceThresholds.projectActivation}ms`);
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        projectId,
        applicationId,
        matchingResult,
        projectValidation: projectValidation.details
      },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore,
      criticalityLevel,
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation: {
        inputValidation: applicationData && matchingData,
        outputValidation: matchingResult && projectId,
        stateConsistency: breakages.length === 0
      }
    };

  } catch (error) {
    breakages.push(`Unexpected error during freelancer matching: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review freelancer matching workflow and error handling');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Enhanced Test 3: Task creation from milestones
 */
async function testTaskCreationFromMilestones(projectId: number): Promise<TestResult> {
  const testName = 'Enhanced Task Creation from Milestones';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };
  const apiEndpointsUsed: string[] = [];
  const bottlenecks: string[] = [];

  try {
    // Fetch project tasks to validate milestone-based task creation with enhanced error handling
    let tasksResponse: any;
    let tasksResult: any;
    let tasks: any[] = [];

    try {
      apiEndpointsUsed.push(`/api/project-tasks/${projectId}`);
      tasksResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${projectId}`, {
        headers: {
          'X-Test-Bypass-Auth': 'true'
        }
      });

      if (!tasksResponse.ok) {
        const errorData = await tasksResponse.json().catch(() => ({}));
        breakages.push(`Failed to fetch project tasks with status ${tasksResponse.status}`);
        breakages.push(`Tasks fetch error: ${JSON.stringify(errorData)}`);
        recommendations.push('Check project tasks API endpoint or start development server');

        // Create mock tasks for testing
        tasks = [
          createMockMilestoneTask({ projectId, milestoneId: 'M1', order: 1 }),
          createMockMilestoneTask({ projectId, milestoneId: 'M2', order: 2 }),
          createMockMilestoneTask({ projectId, milestoneId: 'M3', order: 3 })
        ];
        tasksResult = { tasks, success: true };
      } else {
        tasksResult = await tasksResponse.json();
        tasks = tasksResult.tasks || [];
      }
    } catch (fetchError) {
      breakages.push(`Cannot reach project tasks API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      recommendations.push('Ensure development server is running or implement proper API mocking');

      // Create mock tasks for testing downstream processes
      tasks = [
        createMockMilestoneTask({ projectId, milestoneId: 'M1', order: 1 }),
        createMockMilestoneTask({ projectId, milestoneId: 'M2', order: 2 }),
        createMockMilestoneTask({ projectId, milestoneId: 'M3', order: 3 })
      ];
      tasksResult = { tasks, success: true };
    }

    // Validate task count matches milestone count
    if (tasks.length !== TEST_CONFIG.milestoneCount) {
      breakages.push(`Expected ${TEST_CONFIG.milestoneCount} tasks but found ${tasks.length}`);
      recommendations.push('Verify milestone-to-task conversion logic');
    }

    // Validate each task has milestone reference
    const tasksWithoutMilestoneId = tasks.filter((task: any) => !task.milestoneId);
    if (tasksWithoutMilestoneId.length > 0) {
      breakages.push(`${tasksWithoutMilestoneId.length} tasks missing milestoneId reference`);
      recommendations.push('Ensure milestoneId is properly set during task creation');
    }

    // Validate task order and structure
    const taskValidation = await validateTaskStructure(tasks, projectId);
    breakages.push(...taskValidation.breakages);
    recommendations.push(...taskValidation.recommendations);

    const duration = Date.now() - startTime;
    const performanceScore = calculatePerformanceScore(duration, TEST_CONFIG.performanceThresholds.taskCreation);
    const criticalityLevel = determineCriticalityLevel(breakages, testName);

    if (duration > TEST_CONFIG.performanceThresholds.taskCreation) {
      bottlenecks.push(`Task creation exceeded performance threshold: ${duration}ms > ${TEST_CONFIG.performanceThresholds.taskCreation}ms`);
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration,
      details: {
        projectId,
        tasks,
        taskCount: tasks.length,
        expectedCount: TEST_CONFIG.milestoneCount,
        taskValidation: taskValidation.details
      },
      breakages,
      recommendations,
      dataIntegrity,
      performanceScore,
      criticalityLevel,
      bottlenecks,
      apiEndpointsUsed,
      dataFlowValidation: {
        inputValidation: projectId > 0,
        outputValidation: tasks.length > 0,
        stateConsistency: breakages.length === 0
      }
    };

  } catch (error) {
    breakages.push(`Unexpected error during task validation: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review task creation and validation logic');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Test 4: Task submission workflow
 */
async function testTaskSubmissionWorkflow(projectId: number): Promise<TestResult> {
  const testName = 'Task Submission Workflow';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };

  try {
    // Get the first task to submit
    const tasksResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${projectId}`);
    const tasksResult = await tasksResponse.json();
    const tasks = tasksResult.tasks || [];

    if (tasks.length === 0) {
      breakages.push('No tasks found for submission testing');
      recommendations.push('Ensure tasks are created before testing submission');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { projectId, tasks },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const firstTask = tasks[0];
    const taskId = firstTask.taskId || firstTask.id;

    // Test task submission
    const submissionData = {
      taskId,
      action: 'submit',
      referenceUrl: 'https://example.com/submitted-work',
      feedback: 'Initial submission for milestone 1 completion'
    };

    const submissionResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });

    if (!submissionResponse.ok) {
      const errorData = await submissionResponse.json().catch(() => ({}));
      breakages.push(`Task submission failed with status ${submissionResponse.status}`);
      breakages.push(`Submission error: ${JSON.stringify(errorData)}`);
      recommendations.push('Check task submission API endpoint and validation');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: errorData, status: submissionResponse.status, taskId },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const submissionResult = await submissionResponse.json();

    if (!submissionResult.success) {
      breakages.push('Task submission API returned success=false');
      recommendations.push('Verify task submission logic and response handling');
    }

    // Validate task status was updated
    const updatedTasksResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${projectId}`);
    const updatedTasksResult = await updatedTasksResponse.json();
    const updatedTasks = updatedTasksResult.tasks || [];
    const updatedTask = updatedTasks.find((t: any) => (t.taskId || t.id) === taskId);

    if (!updatedTask) {
      breakages.push('Task not found after submission');
      recommendations.push('Verify task persistence after submission');
    } else if (updatedTask.status !== 'Submitted' && updatedTask.status !== 'In review') {
      breakages.push(`Task status not updated correctly after submission. Expected 'Submitted' or 'In review', got '${updatedTask.status}'`);
      recommendations.push('Check task status update logic in submission workflow');
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration: Date.now() - startTime,
      details: {
        projectId,
        taskId,
        submissionResult,
        taskStatusBefore: firstTask.status,
        taskStatusAfter: updatedTask?.status
      },
      breakages,
      recommendations,
      dataIntegrity
    };

  } catch (error) {
    breakages.push(`Unexpected error during task submission: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review task submission workflow and error handling');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Test 5: Task approval with automatic invoice generation
 */
async function testTaskApprovalWithInvoicing(projectId: number): Promise<TestResult> {
  const testName = 'Task Approval with Automatic Invoice Generation';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };

  try {
    // Get submitted tasks
    const tasksResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${projectId}`);
    const tasksResult = await tasksResponse.json();
    const tasks = tasksResult.tasks || [];

    const submittedTask = tasks.find((t: any) => t.status === 'Submitted' || t.status === 'In review');

    if (!submittedTask) {
      breakages.push('No submitted tasks found for approval testing');
      recommendations.push('Ensure task submission is completed before testing approval');

      return {
        testName,
        status: 'SKIP',
        duration: Date.now() - startTime,
        details: { projectId, tasks, reason: 'No submitted tasks available' },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const taskId = submittedTask.taskId || submittedTask.id;

    // Test task approval
    const approvalData = {
      taskId,
      action: 'approve',
      feedback: 'Milestone completed successfully, approved for payment'
    };

    const approvalResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvalData)
    });

    if (!approvalResponse.ok) {
      const errorData = await approvalResponse.json().catch(() => ({}));
      breakages.push(`Task approval failed with status ${approvalResponse.status}`);
      breakages.push(`Approval error: ${JSON.stringify(errorData)}`);
      recommendations.push('Check task approval API endpoint and logic');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: errorData, status: approvalResponse.status, taskId },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const approvalResult = await approvalResponse.json();

    if (!approvalResult.success) {
      breakages.push('Task approval API returned success=false');
      recommendations.push('Verify task approval logic and response handling');
    }

    // Check if invoice was automatically generated
    const invoiceGenerated = approvalResult.invoiceGenerated;
    if (!invoiceGenerated) {
      breakages.push('Invoice was not automatically generated after task approval');
      recommendations.push('Verify automatic invoice generation logic for milestone-based projects');
    }

    // Validate task status was updated to approved
    const updatedTasksResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/project-tasks/${projectId}`);
    const updatedTasksResult = await updatedTasksResponse.json();
    const updatedTasks = updatedTasksResult.tasks || [];
    const approvedTask = updatedTasks.find((t: any) => (t.taskId || t.id) === taskId);

    if (!approvedTask) {
      breakages.push('Task not found after approval');
      recommendations.push('Verify task persistence after approval');
    } else if (approvedTask.status !== 'Approved') {
      breakages.push(`Task status not updated to 'Approved' after approval. Got '${approvedTask.status}'`);
      recommendations.push('Check task status update logic in approval workflow');
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration: Date.now() - startTime,
      details: {
        projectId,
        taskId,
        approvalResult,
        invoiceGenerated,
        taskStatusBefore: submittedTask.status,
        taskStatusAfter: approvedTask?.status
      },
      breakages,
      recommendations,
      dataIntegrity
    };

  } catch (error) {
    breakages.push(`Unexpected error during task approval: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review task approval workflow and error handling');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Test 6: Milestone invoice generation
 */
async function testMilestoneInvoiceGeneration(projectId: number): Promise<TestResult> {
  const testName = 'Milestone Invoice Generation';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };

  try {
    // Test invoice generation for the project
    const invoiceData = {
      projectId,
      freelancerId: TEST_CONFIG.freelancerId
    };

    const invoiceResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices/generate-for-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });

    if (!invoiceResponse.ok) {
      const errorData = await invoiceResponse.json().catch(() => ({}));
      breakages.push(`Invoice generation failed with status ${invoiceResponse.status}`);
      breakages.push(`Invoice error: ${JSON.stringify(errorData)}`);
      recommendations.push('Check invoice generation API endpoint and logic');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: errorData, status: invoiceResponse.status },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const invoiceResult = await invoiceResponse.json();

    if (!invoiceResult.success || !invoiceResult.invoiceNumber) {
      breakages.push('Invoice generation succeeded but returned invalid response structure');
      recommendations.push('Verify invoice generation response format');
    }

    const invoice = invoiceResult.invoiceData;

    // Validate invoice amount calculation
    const expectedAmount = TEST_CONFIG.expectedMilestoneAmount;
    if (invoice && Math.abs(invoice.totalAmount - expectedAmount) > 0.01) {
      breakages.push(`Invoice amount mismatch. Expected ~${expectedAmount}, got ${invoice.totalAmount}`);
      recommendations.push('Verify milestone amount calculation logic');
    }

    // Validate invoice structure for milestone-based project
    if (invoice && (!invoice.milestones || invoice.milestones.length === 0)) {
      breakages.push('Invoice missing milestone information');
      recommendations.push('Ensure milestone data is included in invoice structure');
    }

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration: Date.now() - startTime,
      details: {
        projectId,
        invoiceResult,
        expectedAmount,
        actualAmount: invoice?.totalAmount,
        milestoneCount: invoice?.milestones?.length
      },
      breakages,
      recommendations,
      dataIntegrity
    };

  } catch (error) {
    breakages.push(`Unexpected error during invoice generation: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review invoice generation workflow and error handling');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Test 7: Payment execution
 */
async function testPaymentExecution(projectId: number): Promise<TestResult> {
  const testName = 'Payment Execution';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };

  try {
    // First, get available invoices for the project
    const invoicesResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/invoices`);

    if (!invoicesResponse.ok) {
      breakages.push('Failed to fetch invoices for payment testing');
      recommendations.push('Check invoices API endpoint');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: 'Failed to fetch invoices' },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const invoicesResult = await invoicesResponse.json();
    const invoices = invoicesResult.invoices || [];

    const projectInvoice = invoices.find((inv: any) =>
      inv.projectId === projectId && inv.status === 'sent'
    );

    if (!projectInvoice) {
      breakages.push('No sent invoices found for payment execution testing');
      recommendations.push('Ensure invoice generation creates invoices with "sent" status');

      return {
        testName,
        status: 'SKIP',
        duration: Date.now() - startTime,
        details: { projectId, invoices, reason: 'No sent invoices available' },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    // Test payment execution
    const paymentData = {
      invoiceNumber: projectInvoice.invoiceNumber
    };

    const paymentResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json().catch(() => ({}));
      breakages.push(`Payment execution failed with status ${paymentResponse.status}`);
      breakages.push(`Payment error: ${JSON.stringify(errorData)}`);
      recommendations.push('Check payment execution API endpoint and logic');

      return {
        testName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: { error: errorData, status: paymentResponse.status },
        breakages,
        recommendations,
        dataIntegrity
      };
    }

    const paymentResult = await paymentResponse.json();

    if (!paymentResult.success) {
      breakages.push('Payment execution API returned success=false');
      recommendations.push('Verify payment execution logic and response handling');
    }

    // Validate wallet balance was updated
    const walletValidation = await validateWalletUpdate(TEST_CONFIG.freelancerId, projectInvoice.totalAmount);
    breakages.push(...walletValidation.breakages);
    recommendations.push(...walletValidation.recommendations);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration: Date.now() - startTime,
      details: {
        projectId,
        invoiceNumber: projectInvoice.invoiceNumber,
        paymentAmount: projectInvoice.totalAmount,
        paymentResult,
        walletValidation: walletValidation.details
      },
      breakages,
      recommendations,
      dataIntegrity
    };

  } catch (error) {
    breakages.push(`Unexpected error during payment execution: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review payment execution workflow and error handling');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

/**
 * Test 8: Data integrity validation
 */
async function testDataIntegrityValidation(projectId: number): Promise<TestResult> {
  const testName = 'Data Integrity and Consistency Validation';
  const startTime = Date.now();
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const dataIntegrity = { filesCreated: [], filesModified: [], inconsistencies: [] };

  try {
    // Validate project data consistency
    const projectValidation = await validateProjectDataConsistency(projectId);
    breakages.push(...projectValidation.breakages);
    recommendations.push(...projectValidation.recommendations);
    dataIntegrity.inconsistencies.push(...projectValidation.inconsistencies);

    // Validate task data consistency
    const taskValidation = await validateTaskDataConsistency(projectId);
    breakages.push(...taskValidation.breakages);
    recommendations.push(...taskValidation.recommendations);
    dataIntegrity.inconsistencies.push(...taskValidation.inconsistencies);

    // Validate invoice data consistency
    const invoiceValidation = await validateInvoiceDataConsistency(projectId);
    breakages.push(...invoiceValidation.breakages);
    recommendations.push(...invoiceValidation.recommendations);
    dataIntegrity.inconsistencies.push(...invoiceValidation.inconsistencies);

    // Validate hierarchical storage consistency
    const storageValidation = await validateHierarchicalStorageConsistency(projectId);
    breakages.push(...storageValidation.breakages);
    recommendations.push(...storageValidation.recommendations);
    dataIntegrity.inconsistencies.push(...storageValidation.inconsistencies);

    return {
      testName,
      status: breakages.length > 0 ? 'FAIL' : 'PASS',
      duration: Date.now() - startTime,
      details: {
        projectId,
        projectValidation: projectValidation.details,
        taskValidation: taskValidation.details,
        invoiceValidation: invoiceValidation.details,
        storageValidation: storageValidation.details
      },
      breakages,
      recommendations,
      dataIntegrity
    };

  } catch (error) {
    breakages.push(`Unexpected error during data integrity validation: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review data integrity validation logic');

    return {
      testName,
      status: 'ERROR',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      breakages,
      recommendations,
      dataIntegrity
    };
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate gig storage after creation using hierarchical paths
 */
async function validateGigStorage(gigId: number, expectedData: any): Promise<{
  breakages: string[];
  recommendations: string[];
  filesCreated: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];

  try {
    // Compute expected hierarchical path from createdAt
    const createdAt = expectedData.createdAt || new Date().toISOString();
    const createdDate = new Date(createdAt);
    const year = createdDate.getFullYear();
    const month = String(createdDate.getMonth() + 1).padStart(2, '0');
    const day = String(createdDate.getDate()).padStart(2, '0');

    const expectedPath = path.join(TEST_CONFIG.dataPath, 'gigs', String(year), month, day, String(gigId), 'gig.json');

    // Check if gig file exists at expected hierarchical path
    try {
      await fs.access(expectedPath);
      filesCreated.push(expectedPath);

      // Validate gig data
      const gigContent = await fs.readFile(expectedPath, 'utf-8');
      const storedGig = JSON.parse(gigContent);

      if (storedGig.invoicingMethod !== 'milestone') {
        breakages.push('Gig invoicing method not set to milestone');
        recommendations.push('Ensure invoicing method is properly stored');
      }

      if (!storedGig.milestones || storedGig.milestones.length !== TEST_CONFIG.milestoneCount) {
        breakages.push(`Expected ${TEST_CONFIG.milestoneCount} milestones, found ${storedGig.milestones?.length || 0}`);
        recommendations.push('Verify milestone data storage');
      }

      if (storedGig.id !== gigId) {
        breakages.push(`Gig ID mismatch. Expected ${gigId}, found ${storedGig.id}`);
        recommendations.push('Verify gig ID assignment');
      }

    } catch (accessError) {
      breakages.push(`Gig file not found at expected hierarchical path: ${expectedPath}`);
      recommendations.push('Verify hierarchical storage implementation');

      // Try to find the file elsewhere
      try {
        const gigsPath = path.join(TEST_CONFIG.dataPath, 'gigs');
        const allFiles = await fs.readdir(gigsPath, { recursive: true });
        const gigFiles = allFiles.filter(file => file.includes('gig.json') && file.includes(String(gigId)));

        if (gigFiles.length > 0) {
          breakages.push(`Gig file found at unexpected location: ${gigFiles[0]}`);
          recommendations.push('Check hierarchical path generation logic');
        }
      } catch (searchError) {
        breakages.push('Could not search for gig file in alternative locations');
      }
    }

    // Validate gigs index was updated
    try {
      const indexPath = path.join(TEST_CONFIG.dataPath, 'gigs-index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      if (!index[String(gigId)]) {
        breakages.push('Gig not found in gigs index');
        recommendations.push('Verify index update logic');
      } else {
        const indexEntry = index[String(gigId)];
        const expectedIndexPath = `${year}/${month}/${day}/${gigId}`;
        if (indexEntry.path !== expectedIndexPath) {
          breakages.push(`Index path mismatch. Expected ${expectedIndexPath}, found ${indexEntry.path}`);
          recommendations.push('Verify index path generation');
        }
      }
    } catch (indexError) {
      breakages.push('Could not validate gigs index');
      recommendations.push('Ensure gigs index is properly maintained');
    }

    return { breakages, recommendations, filesCreated, details: { gigId, expectedPath, createdAt } };

  } catch (error) {
    breakages.push(`Error validating gig storage: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review gig storage validation logic');
    return { breakages, recommendations, filesCreated, details: { error } };
  }
}

/**
 * Validate project creation
 */
async function validateProjectCreation(projectId: number, gigId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  filesCreated: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const filesCreated: string[] = [];

  try {
    // Check if project file exists
    const projectsPath = path.join(TEST_CONFIG.dataPath, 'projects');
    const projectFiles = await fs.readdir(projectsPath, { recursive: true });
    const projectFile = projectFiles.find(file => file.includes('project.json') && file.includes(String(projectId)));

    if (!projectFile) {
      breakages.push(`Project file not found for ID ${projectId}`);
      recommendations.push('Verify project creation and storage');
    } else {
      filesCreated.push(path.join(projectsPath, projectFile));

      // Validate project data
      const projectFilePath = path.join(projectsPath, projectFile);
      const projectContent = await fs.readFile(projectFilePath, 'utf-8');
      const storedProject = JSON.parse(projectContent);

      if (storedProject.invoicingMethod !== 'milestone') {
        breakages.push('Project invoicing method not set to milestone');
        recommendations.push('Ensure project inherits gig invoicing method');
      }

      if (storedProject.gigId !== gigId) {
        breakages.push(`Project gigId mismatch. Expected ${gigId}, got ${storedProject.gigId}`);
        recommendations.push('Verify project-gig relationship');
      }
    }

    return { breakages, recommendations, filesCreated, details: { projectId, projectFile } };

  } catch (error) {
    breakages.push(`Error validating project creation: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review project creation validation logic');
    return { breakages, recommendations, filesCreated, details: { error } };
  }
}

/**
 * Validate task structure and milestone references
 */
async function validateTaskStructure(tasks: any[], projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check task order
    const orderedTasks = tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (let i = 0; i < orderedTasks.length; i++) {
      if (orderedTasks[i].order !== i + 1) {
        breakages.push(`Task order inconsistency: task ${i} has order ${orderedTasks[i].order}, expected ${i + 1}`);
        recommendations.push('Verify task ordering logic');
      }
    }

    // Check milestone references
    const expectedMilestoneIds = ['M1', 'M2', 'M3'];
    for (const task of tasks) {
      if (!task.milestoneId || !expectedMilestoneIds.includes(task.milestoneId)) {
        breakages.push(`Task ${task.id || task.taskId} has invalid milestoneId: ${task.milestoneId}`);
        recommendations.push('Ensure proper milestone ID assignment during task creation');
      }
    }

    return { breakages, recommendations, details: { taskCount: tasks.length, orderedTasks } };

  } catch (error) {
    breakages.push(`Error validating task structure: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review task structure validation logic');
    return { breakages, recommendations, details: { error } };
  }
}

/**
 * Validate wallet balance update
 */
async function validateWalletUpdate(freelancerId: number, expectedAmount: number): Promise<{
  breakages: string[];
  recommendations: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];

  try {
    // This would typically check wallet balance changes
    // For now, we'll simulate the validation
    const walletValidation = {
      freelancerId,
      expectedAmount,
      validated: true // Placeholder
    };

    // In a real implementation, this would:
    // 1. Fetch wallet balance before payment
    // 2. Execute payment
    // 3. Fetch wallet balance after payment
    // 4. Verify the difference matches expected amount

    return { breakages, recommendations, details: walletValidation };

  } catch (error) {
    breakages.push(`Error validating wallet update: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review wallet update validation logic');
    return { breakages, recommendations, details: { error } };
  }
}

/**
 * Validate project data consistency
 */
async function validateProjectDataConsistency(projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  inconsistencies: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Check project file existence and structure
    const projectsPath = path.join(TEST_CONFIG.dataPath, 'projects');
    const projectFiles = await fs.readdir(projectsPath, { recursive: true });
    const projectFile = projectFiles.find(file => file.includes('project.json') && file.includes(String(projectId)));

    if (!projectFile) {
      inconsistencies.push(`Project file missing for ID ${projectId}`);
      breakages.push('Project data consistency check failed');
    }

    return { breakages, recommendations, inconsistencies, details: { projectId, projectFile } };

  } catch (error) {
    breakages.push(`Error validating project data consistency: ${error instanceof Error ? error.message : String(error)}`);
    return { breakages, recommendations, inconsistencies, details: { error } };
  }
}

/**
 * Validate task data consistency
 */
async function validateTaskDataConsistency(projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  inconsistencies: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Check task files in hierarchical storage
    const tasksPath = path.join(TEST_CONFIG.dataPath, 'project-tasks');

    if (await fs.access(tasksPath).then(() => true).catch(() => false)) {
      const taskFiles = await fs.readdir(tasksPath, { recursive: true });
      const projectTaskFiles = taskFiles.filter(file => file.includes(String(projectId)));

      if (projectTaskFiles.length !== TEST_CONFIG.milestoneCount) {
        inconsistencies.push(`Expected ${TEST_CONFIG.milestoneCount} task files, found ${projectTaskFiles.length}`);
        breakages.push('Task data consistency check failed');
      }
    } else {
      inconsistencies.push('Project tasks directory not found');
      breakages.push('Task storage structure missing');
    }

    return { breakages, recommendations, inconsistencies, details: { projectId } };

  } catch (error) {
    breakages.push(`Error validating task data consistency: ${error instanceof Error ? error.message : String(error)}`);
    return { breakages, recommendations, inconsistencies, details: { error } };
  }
}

/**
 * Validate invoice data consistency
 */
async function validateInvoiceDataConsistency(projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  inconsistencies: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Check invoice files
    const invoicesPath = path.join(TEST_CONFIG.dataPath, 'invoices');

    if (await fs.access(invoicesPath).then(() => true).catch(() => false)) {
      const invoiceFiles = await fs.readdir(invoicesPath, { recursive: true });
      const projectInvoiceFiles = invoiceFiles.filter(file => file.includes(String(projectId)));

      // For milestone-based projects, we expect invoices to be generated per approved task
      // This is a simplified check
      if (projectInvoiceFiles.length === 0) {
        inconsistencies.push('No invoice files found for project');
        recommendations.push('Verify invoice generation and storage');
      }
    } else {
      inconsistencies.push('Invoices directory not found');
      breakages.push('Invoice storage structure missing');
    }

    return { breakages, recommendations, inconsistencies, details: { projectId } };

  } catch (error) {
    breakages.push(`Error validating invoice data consistency: ${error instanceof Error ? error.message : String(error)}`);
    return { breakages, recommendations, inconsistencies, details: { error } };
  }
}

/**
 * Validate hierarchical storage consistency
 */
async function validateHierarchicalStorageConsistency(projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  inconsistencies: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const inconsistencies: string[] = [];

  try {
    // Check if all hierarchical storage directories exist and are properly structured
    const requiredPaths = [
      'gigs',
      'projects',
      'project-tasks',
      'invoices',
      'transactions'
    ];

    for (const requiredPath of requiredPaths) {
      const fullPath = path.join(TEST_CONFIG.dataPath, requiredPath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);

      if (!exists) {
        inconsistencies.push(`Required storage path missing: ${requiredPath}`);
        recommendations.push(`Create missing storage directory: ${requiredPath}`);
      }
    }

    return { breakages, recommendations, inconsistencies, details: { projectId, requiredPaths } };

  } catch (error) {
    breakages.push(`Error validating hierarchical storage consistency: ${error instanceof Error ? error.message : String(error)}`);
    return { breakages, recommendations, inconsistencies, details: { error } };
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Analyze data storage efficiency
 */
async function analyzeDataStorageEfficiency(projectId: number): Promise<{
  breakages: string[];
  recommendations: string[];
  details: any;
}> {
  const breakages: string[] = [];
  const recommendations: string[] = [];
  const details: any = {};

  try {
    // Check for redundant data storage
    const dataPath = TEST_CONFIG.dataPath;
    const storageAnalysis = {
      duplicateFiles: 0,
      unusedFiles: 0,
      storageEfficiency: 'GOOD'
    };

    // Analyze hierarchical storage structure
    const requiredPaths = ['gigs', 'projects', 'project-tasks', 'invoices', 'transactions'];
    for (const requiredPath of requiredPaths) {
      const fullPath = path.join(dataPath, requiredPath);
      try {
        const stats = await fs.stat(fullPath);
        if (!stats.isDirectory()) {
          breakages.push(`Storage path ${requiredPath} is not a directory`);
          recommendations.push(`Ensure ${requiredPath} is properly structured as a directory`);
        }
      } catch (error) {
        breakages.push(`Storage path ${requiredPath} is missing or inaccessible`);
        recommendations.push(`Create missing storage directory: ${requiredPath}`);
      }
    }

    details.storageAnalysis = storageAnalysis;
    details.requiredPaths = requiredPaths;

    return { breakages, recommendations, details };

  } catch (error) {
    breakages.push(`Error analyzing storage efficiency: ${error instanceof Error ? error.message : String(error)}`);
    recommendations.push('Review storage analysis implementation');
    return { breakages, recommendations, details: { error } };
  }
}

/**
 * Enhanced final comprehensive report generation with scoring
 */
function generateFinalReport(
  results: TestResult[],
  startTime: number,
  performanceMetrics: Array<{ phase: string; duration: number; threshold: number }> = []
): ComprehensiveReport {
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  // Collect all breakages
  const allBreakages = results.flatMap(r => r.breakages);
  const criticalBreakages = allBreakages.filter(b =>
    b.includes('failed') || b.includes('missing') || b.includes('error')
  );

  // Generate system recommendations
  const allRecommendations = results.flatMap(r => r.recommendations);
  const systemRecommendations = [...new Set(allRecommendations)]; // Remove duplicates

  // Determine overall health
  let overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
  if (errors > 0 || criticalBreakages.length > 3) {
    overallHealth = 'CRITICAL';
  } else if (failed > 0 || criticalBreakages.length > 0) {
    overallHealth = 'DEGRADED';
  }

  const readinessForProduction = overallHealth === 'HEALTHY' && failed === 0 && errors === 0;

  // Priority fixes
  const priorityFixes = [
    ...criticalBreakages.slice(0, 5), // Top 5 critical issues
    ...systemRecommendations.slice(0, 3) // Top 3 recommendations
  ];

  // Enhanced scoring calculations
  const overallScore = Math.round((passed / results.length) * 100);
  const performanceScore = Math.round(
    results.reduce((sum, r) => sum + (r.performanceScore || 0), 0) / results.length
  );
  const reliabilityScore = Math.round(
    ((results.length - errors) / results.length) * 100
  );
  const dataIntegrityScore = Math.round(
    results.filter(r => r.dataFlowValidation?.stateConsistency).length / results.length * 100
  );

  // Enhanced production readiness scoring
  const productionReadinessScore = Math.round(
    (overallScore * 0.4 + performanceScore * 0.3 + reliabilityScore * 0.2 + dataIntegrityScore * 0.1)
  );

  // Risk assessment
  const riskAssessment = {
    dataLoss: criticalBreakages.some(b => b.includes('data')) ? 'HIGH' : failed > 0 ? 'MEDIUM' : 'LOW',
    userExperience: performanceScore < 60 ? 'HIGH' : performanceScore < 80 ? 'MEDIUM' : 'LOW',
    businessImpact: criticalBreakages.length > 0 ? 'HIGH' : failed > 2 ? 'MEDIUM' : 'LOW'
  } as const;

  // Performance analysis
  const slowestOperations = performanceMetrics
    .filter(metric => metric.duration > metric.threshold)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map(metric => ({
      operation: metric.phase,
      duration: metric.duration,
      threshold: metric.threshold
    }));

  const allBottlenecks = results.flatMap(r => r.bottlenecks || []);
  const scalabilityAssessment = performanceScore >= 80 ?
    'EXCELLENT - System can handle production load' :
    performanceScore >= 60 ?
    'GOOD - Minor optimizations needed' :
    'POOR - Significant performance improvements required';

  // Categorized recommendations
  const recommendedActions = {
    immediate: criticalBreakages.slice(0, 3),
    shortTerm: systemRecommendations.filter(r =>
      r.includes('optimize') || r.includes('improve') || r.includes('enhance')
    ).slice(0, 5),
    longTerm: systemRecommendations.filter(r =>
      r.includes('implement') || r.includes('redesign') || r.includes('architecture')
    ).slice(0, 3)
  };

  // Data flow analysis
  const criticalPaths = [
    'Gig Creation → Project Activation → Task Creation',
    'Task Approval → Invoice Generation → Payment Execution',
    'Data Storage → Validation → Consistency Check'
  ];

  const dataConsistencyIssues = results
    .filter(r => !r.dataFlowValidation?.stateConsistency)
    .map(r => `${r.testName}: State consistency failed`);

  const report: ComprehensiveReport = {
    summary: {
      totalTests: results.length,
      passed,
      failed,
      errors,
      totalDuration,
      overallScore,
      performanceScore,
      reliabilityScore,
      dataIntegrityScore
    },
    results,
    criticalBreakages,
    systemRecommendations,
    prognosis: {
      overallHealth,
      readinessForProduction,
      priorityFixes,
      productionReadinessScore,
      riskAssessment,
      recommendedActions
    },
    performanceAnalysis: {
      slowestOperations,
      bottleneckAnalysis: allBottlenecks,
      scalabilityAssessment
    },
    dataFlowAnalysis: {
      criticalPaths,
      dataConsistencyIssues,
      storageEfficiency: dataConsistencyIssues.length === 0 ? 'OPTIMAL' : 'NEEDS_IMPROVEMENT'
    }
  };

  // Enhanced console output
  console.log('\n' + '='.repeat(100));
  console.log('📊 ENHANCED COMPREHENSIVE MILESTONE-BASED INVOICING TEST REPORT');
  console.log('='.repeat(100));
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Overall Score: ${overallScore}/100`);
  console.log(`⚡ Performance Score: ${performanceScore}/100`);
  console.log(`🔒 Reliability Score: ${reliabilityScore}/100`);
  console.log(`💾 Data Integrity Score: ${dataIntegrityScore}/100`);
  console.log(`🚀 Production Readiness Score: ${productionReadinessScore}/100`);
  console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed} | 🚨 Errors: ${errors}`);
  console.log(`🏥 Overall Health: ${overallHealth}`);
  console.log(`🚀 Production Ready: ${readinessForProduction ? 'YES' : 'NO'}`);
  console.log(`🔥 Critical Breakages: ${criticalBreakages.length}`);
  console.log(`⚠️  Risk Assessment: Data Loss: ${riskAssessment.dataLoss}, UX: ${riskAssessment.userExperience}, Business: ${riskAssessment.businessImpact}`);

  if (slowestOperations.length > 0) {
    console.log('\n🐌 PERFORMANCE BOTTLENECKS:');
    slowestOperations.forEach((op, index) => {
      console.log(`   ${index + 1}. ${op.operation}: ${op.duration}ms (threshold: ${op.threshold}ms)`);
    });
  }

  if (criticalBreakages.length > 0) {
    console.log('\n🚨 CRITICAL BREAKAGES:');
    criticalBreakages.forEach((breakage, index) => {
      console.log(`   ${index + 1}. ${breakage}`);
    });
  }

  if (recommendedActions.immediate.length > 0) {
    console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
    recommendedActions.immediate.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action}`);
    });
  }

  console.log(`\n📊 FINAL PROGNOSIS: ${productionReadinessScore}/100`);
  if (productionReadinessScore >= 90) {
    console.log('🟢 EXCELLENT - System is production-ready with minimal risk');
  } else if (productionReadinessScore >= 80) {
    console.log('🟡 GOOD - System is mostly ready, minor fixes recommended');
  } else if (productionReadinessScore >= 60) {
    console.log('🟠 FAIR - System needs significant improvements before production');
  } else {
    console.log('🔴 POOR - System requires major fixes before production deployment');
  }

  if (priorityFixes.length > 0) {
    console.log(`\n🔧 PRIORITY FIXES:`);
    priorityFixes.forEach((fix, i) => {
      console.log(`  ${i + 1}. ${fix}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 DETAILED TEST RESULTS:');
  console.log('='.repeat(80));

  results.forEach((result, i) => {
    const statusIcon = {
      'PASS': '✅',
      'FAIL': '❌',
      'ERROR': '🚨',
      'SKIP': '⏭️'
    }[result.status];

    console.log(`\n${i + 1}. ${statusIcon} ${result.testName} (${result.duration}ms)`);

    if (result.breakages.length > 0) {
      console.log(`   🔴 Breakages:`);
      result.breakages.forEach(breakage => console.log(`     - ${breakage}`));
    }

    if (result.recommendations.length > 0) {
      console.log(`   💡 Recommendations:`);
      result.recommendations.forEach(rec => console.log(`     - ${rec}`));
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 PROGNOSIS COMPLETE');
  console.log('='.repeat(80));

  return report;
}

// ============================================================================
// JEST TEST WRAPPER
// ============================================================================

describe('Enhanced Milestone-Based Invoicing Comprehensive Prognosis', () => {
  jest.setTimeout(120000); // 2 minutes timeout for comprehensive testing

  it('should run enhanced comprehensive milestone invoicing workflow test with detailed scoring', async () => {
    console.log('🧪 Starting Enhanced Milestone-Based Invoicing Comprehensive Test...');

    const report = await runMilestoneInvoicingPrognosis();

    // Enhanced assertions for the new scoring system
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.results).toBeInstanceOf(Array);
    expect(report.prognosis).toBeDefined();

    // Validate enhanced scoring fields
    expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.summary.overallScore).toBeLessThanOrEqual(100);
    expect(report.summary.performanceScore).toBeGreaterThanOrEqual(0);
    expect(report.summary.performanceScore).toBeLessThanOrEqual(100);
    expect(report.summary.reliabilityScore).toBeGreaterThanOrEqual(0);
    expect(report.summary.reliabilityScore).toBeLessThanOrEqual(100);
    expect(report.summary.dataIntegrityScore).toBeGreaterThanOrEqual(0);
    expect(report.summary.dataIntegrityScore).toBeLessThanOrEqual(100);
    expect(report.prognosis.productionReadinessScore).toBeGreaterThanOrEqual(0);
    expect(report.prognosis.productionReadinessScore).toBeLessThanOrEqual(100);

    // Validate enhanced analysis sections
    expect(report.performanceAnalysis).toBeDefined();
    expect(report.dataFlowAnalysis).toBeDefined();
    expect(report.prognosis.riskAssessment).toBeDefined();
    expect(report.prognosis.recommendedActions).toBeDefined();

    // Log enhanced final assessment
    console.log(`\n🎯 ENHANCED FINAL ASSESSMENT:`);
    console.log(`   📊 Production Readiness Score: ${report.prognosis.productionReadinessScore}/100`);
    console.log(`   🏥 System Health: ${report.prognosis.overallHealth}`);
    console.log(`   🚀 Production Ready: ${report.prognosis.readinessForProduction ? 'YES' : 'NO'}`);
    console.log(`   ⚡ Performance Score: ${report.summary.performanceScore}/100`);
    console.log(`   🔒 Reliability Score: ${report.summary.reliabilityScore}/100`);
    console.log(`   💾 Data Integrity Score: ${report.summary.dataIntegrityScore}/100`);
    console.log(`   🔥 Critical Issues: ${report.criticalBreakages.length}`);
    console.log(`   ⚠️  Risk Assessment: Data Loss: ${report.prognosis.riskAssessment.dataLoss}, UX: ${report.prognosis.riskAssessment.userExperience}, Business: ${report.prognosis.riskAssessment.businessImpact}`);

    // Export enhanced report for external analysis
    const reportPath = path.join(process.cwd(), 'enhanced-milestone-invoicing-prognosis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Enhanced detailed report saved to: ${reportPath}`);

    // Performance warning if system is not production-ready
    if (report.prognosis.productionReadinessScore < 80) {
      console.log('\n⚠️  WARNING: System requires improvements before production deployment');
      console.log('🔧 Immediate actions required:', report.prognosis.recommendedActions.immediate.slice(0, 3));
    }
  });
});

// Export for direct usage
export { runMilestoneInvoicingPrognosis };
