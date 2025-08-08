import { NextResponse } from 'next/server';
import { 
  runProjectActivationTestSuite,
  generateTestReportSummary 
} from '@/lib/testing/project-activation-test-suite';

/**
 * Project Activation Test Suite API
 * 
 * GET: Run the complete test suite and return results
 * POST: Run specific test categories
 */

export async function GET() {
  try {
    console.log('🧪 Starting Project Activation Test Suite via API...');
    
    const testResult = await runProjectActivationTestSuite();
    const reportSummary = generateTestReportSummary(testResult);
    
    return NextResponse.json({
      success: testResult.passedTests === testResult.totalTests,
      message: `Test suite completed: ${testResult.passedTests}/${testResult.totalTests} tests passed`,
      testSuite: testResult,
      summary: reportSummary,
      recommendations: generateRecommendations(testResult)
    });

  } catch (error) {
    console.error('❌ Error running project activation test suite:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run project activation test suite',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      categories = ['all'],
      includeDetails = true,
      timeout = 30000
    } = await request.json();

    console.log(`🧪 Running filtered test suite for categories: ${categories.join(', ')}`);
    
    // For now, run the full suite (filtering would be implemented later)
    const testResult = await runProjectActivationTestSuite();
    
    // Filter results based on categories if not 'all'
    let filteredResults = testResult.results;
    if (!categories.includes('all')) {
      filteredResults = testResult.results.filter(result => {
        const testCategory = getTestCategory(result.testName);
        return categories.includes(testCategory);
      });
    }

    // Remove details if not requested
    if (!includeDetails) {
      filteredResults = filteredResults.map(result => ({
        ...result,
        details: undefined
      }));
    }

    const filteredTestResult = {
      ...testResult,
      results: filteredResults,
      totalTests: filteredResults.length,
      passedTests: filteredResults.filter(r => r.success).length,
      failedTests: filteredResults.filter(r => !r.success).length
    };

    const reportSummary = generateTestReportSummary(filteredTestResult);
    
    return NextResponse.json({
      success: filteredTestResult.passedTests === filteredTestResult.totalTests,
      message: `Filtered test suite completed: ${filteredTestResult.passedTests}/${filteredTestResult.totalTests} tests passed`,
      filters: { categories, includeDetails, timeout },
      testSuite: filteredTestResult,
      summary: reportSummary,
      recommendations: generateRecommendations(filteredTestResult)
    });

  } catch (error) {
    console.error('❌ Error running filtered test suite:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run filtered test suite',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get test category from test name
 */
function getTestCategory(testName: string): string {
  if (testName.toLowerCase().includes('project')) return 'project';
  if (testName.toLowerCase().includes('task')) return 'task';
  if (testName.toLowerCase().includes('invoice')) return 'invoice';
  if (testName.toLowerCase().includes('transaction')) return 'transaction';
  if (testName.toLowerCase().includes('validation')) return 'validation';
  return 'other';
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResult: any): string[] {
  const recommendations: string[] = [];
  
  if (testResult.passedTests === testResult.totalTests) {
    recommendations.push('🎉 All tests passed! Your project activation system is working correctly.');
    recommendations.push('✅ System is ready for production use.');
    recommendations.push('📊 Consider setting up automated testing in CI/CD pipeline.');
  } else {
    recommendations.push(`⚠️ ${testResult.failedTests} out of ${testResult.totalTests} tests failed.`);
    recommendations.push('🔧 Review and fix failing tests before deploying to production.');
  }
  
  // Analyze specific test failures
  const failedTests = testResult.results.filter((r: any) => !r.success);
  
  const projectFailures = failedTests.filter((t: any) => getTestCategory(t.testName) === 'project');
  if (projectFailures.length > 0) {
    recommendations.push(`📋 ${projectFailures.length} project-related tests failed - check project creation and storage.`);
  }
  
  const taskFailures = failedTests.filter((t: any) => getTestCategory(t.testName) === 'task');
  if (taskFailures.length > 0) {
    recommendations.push(`📝 ${taskFailures.length} task-related tests failed - check task management workflows.`);
  }
  
  const invoiceFailures = failedTests.filter((t: any) => getTestCategory(t.testName) === 'invoice');
  if (invoiceFailures.length > 0) {
    recommendations.push(`💰 ${invoiceFailures.length} invoice-related tests failed - check invoice generation system.`);
  }
  
  const transactionFailures = failedTests.filter((t: any) => getTestCategory(t.testName) === 'transaction');
  if (transactionFailures.length > 0) {
    recommendations.push(`🔄 ${transactionFailures.length} transaction-related tests failed - check transaction integrity.`);
  }
  
  const validationFailures = failedTests.filter((t: any) => getTestCategory(t.testName) === 'validation');
  if (validationFailures.length > 0) {
    recommendations.push(`🔍 ${validationFailures.length} validation-related tests failed - check data validation system.`);
  }
  
  // General recommendations
  if (testResult.failedTests > 0) {
    recommendations.push('🔄 Run the data validation endpoint to identify specific issues.');
    recommendations.push('🗄️ Consider running the migration tools to fix data inconsistencies.');
    recommendations.push('📋 Check the logs for detailed error information.');
    recommendations.push('🧪 Re-run tests after fixing issues to verify fixes.');
  }
  
  // Performance recommendations
  if (testResult.duration > 10000) {
    recommendations.push('⚡ Test suite took longer than expected - consider optimizing data access patterns.');
  }
  
  return recommendations;
}

export async function OPTIONS() {
  return NextResponse.json({
    message: 'Project Activation Test Suite API',
    endpoints: {
      'GET /api/admin/test-project-activation': {
        description: 'Run the complete project activation test suite',
        response: 'Full test results with recommendations'
      },
      'POST /api/admin/test-project-activation': {
        description: 'Run filtered test suite',
        body: {
          categories: ['all', 'project', 'task', 'invoice', 'transaction', 'validation'],
          includeDetails: 'boolean',
          timeout: 'number (milliseconds)'
        }
      }
    },
    testCategories: {
      project: 'Project creation and storage tests',
      task: 'Task management and workflow tests',
      invoice: 'Invoice generation and integrity tests',
      transaction: 'Transaction integrity and rollback tests',
      validation: 'Data validation and migration tests'
    },
    usage: {
      runAllTests: 'GET /api/admin/test-project-activation',
      runSpecificTests: 'POST /api/admin/test-project-activation with categories filter',
      example: {
        categories: ['project', 'task'],
        includeDetails: true,
        timeout: 30000
      }
    }
  });
}
