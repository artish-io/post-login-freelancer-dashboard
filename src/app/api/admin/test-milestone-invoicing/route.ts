import { NextResponse } from 'next/server';
import { runComprehensiveMilestoneTest } from '@/__tests__/milestone-invoicing-integration.test';

/**
 * Admin API endpoint to run comprehensive milestone-based invoicing tests
 * 
 * GET: Run the full test suite and return results
 * POST: Run specific test categories (future enhancement)
 */

export async function GET() {
  try {
    console.log('🧪 Starting Comprehensive Milestone-Based Invoicing Test Suite via API...');
    
    const report = await runComprehensiveMilestoneTest();
    
    const hasFailures = report.summary.failed > 0 || report.summary.errors > 0;
    
    return NextResponse.json({
      success: !hasFailures,
      message: hasFailures 
        ? `Test suite completed with ${report.summary.failed} failures and ${report.summary.errors} errors`
        : 'All tests passed successfully',
      report,
      timestamp: new Date().toISOString(),
      testSuite: 'milestone-invoicing-comprehensive'
    });
    
  } catch (error) {
    console.error('❌ Error running milestone invoicing test suite:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run test suite',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      categories = ['all'],
      includeDetails = true,
      generateReport = true
    } = await request.json();

    console.log(`🧪 Running filtered milestone invoicing tests for categories: ${categories.join(', ')}`);
    
    // For now, run the full suite (filtering would be implemented later)
    const report = await runComprehensiveMilestoneTest();
    
    // Filter results based on categories if not 'all'
    let filteredResults = report.results;
    if (!categories.includes('all')) {
      filteredResults = report.results.filter(result => {
        // Simple category mapping - could be enhanced
        const testCategory = getTestCategory(result.testName);
        return categories.includes(testCategory);
      });
    }
    
    const filteredReport = {
      ...report,
      results: filteredResults,
      summary: {
        totalTests: filteredResults.length,
        passed: filteredResults.filter(r => r.status === 'PASS').length,
        failed: filteredResults.filter(r => r.status === 'FAIL').length,
        errors: filteredResults.filter(r => r.status === 'ERROR').length
      }
    };
    
    const hasFailures = filteredReport.summary.failed > 0 || filteredReport.summary.errors > 0;
    
    return NextResponse.json({
      success: !hasFailures,
      message: `Filtered test suite completed: ${filteredReport.summary.passed}/${filteredReport.summary.totalTests} tests passed`,
      report: includeDetails ? filteredReport : { summary: filteredReport.summary },
      categories,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error running filtered milestone invoicing tests:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run filtered test suite',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Map test names to categories for filtering
 */
function getTestCategory(testName: string): string {
  if (testName.includes('Data Integrity') || testName.includes('Prerequisites')) {
    return 'setup';
  }
  if (testName.includes('Gig Creation')) {
    return 'gig-creation';
  }
  if (testName.includes('Freelancer Matching')) {
    return 'matching';
  }
  if (testName.includes('Task')) {
    return 'task-workflow';
  }
  if (testName.includes('Payment') || testName.includes('Wallet')) {
    return 'payment';
  }
  if (testName.includes('Invoice')) {
    return 'invoicing';
  }
  if (testName.includes('Consistency') || testName.includes('Storage')) {
    return 'data-integrity';
  }
  if (testName.includes('Edge Cases') || testName.includes('Error')) {
    return 'error-handling';
  }
  return 'general';
}
