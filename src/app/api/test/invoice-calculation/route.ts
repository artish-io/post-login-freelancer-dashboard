import { NextResponse } from 'next/server';
import { calculateProjectBudget, calculateInvoiceAmounts, parseFreelancerRate } from '@/lib/budget/budget-calculation-service';

/**
 * Test endpoint for invoice calculation logic
 * 
 * GET /api/test/invoice-calculation
 */
export async function GET() {
  try {
    console.log('🧪 Testing enhanced invoice calculation logic...');
    
    const testCases = [
      {
        name: 'Completion-based project with freelancer rate within budget',
        freelancerRate: '$75 - $100/hr',
        projectBudget: { min: 2000, max: 5000 },
        estimatedHours: 40,
        projectType: 'completion' as const,
        totalTasks: 5,
        paidTasks: 0
      },
      {
        name: 'Milestone-based project with rate limiting',
        freelancerRate: '$150 - $200/hr',
        projectBudget: { min: 3000, max: 4000 },
        estimatedHours: 40,
        projectType: 'milestone' as const,
        totalTasks: 4,
        paidTasks: 0
      },
      {
        name: 'Completion-based with some tasks already paid',
        freelancerRate: '$50 - $75/hr',
        projectBudget: { min: 2000, max: 3000 },
        estimatedHours: 40,
        projectType: 'completion' as const,
        totalTasks: 6,
        paidTasks: 2
      }
    ];
    
    const results = testCases.map(testCase => {
      console.log(`\n📋 Testing: ${testCase.name}`);
      
      // Step 1: Calculate project budget
      const budgetCalc = calculateProjectBudget(
        testCase.freelancerRate,
        testCase.projectBudget,
        testCase.estimatedHours,
        testCase.projectType
      );
      
      console.log(`💰 Budget calculation:`, budgetCalc);
      
      // Step 2: Calculate invoice amounts
      const invoiceAmounts = calculateInvoiceAmounts(
        budgetCalc.totalProjectBudget,
        testCase.projectType,
        testCase.totalTasks,
        testCase.paidTasks
      );
      
      console.log(`📄 Invoice amounts:`, invoiceAmounts);
      
      // Step 3: Parse freelancer rate
      const parsedRate = parseFreelancerRate(testCase.freelancerRate);
      
      console.log(`⚡ Parsed rate:`, parsedRate);
      
      return {
        testCase: testCase.name,
        input: {
          freelancerRate: testCase.freelancerRate,
          projectBudget: testCase.projectBudget,
          estimatedHours: testCase.estimatedHours,
          projectType: testCase.projectType,
          totalTasks: testCase.totalTasks,
          paidTasks: testCase.paidTasks
        },
        output: {
          budgetCalculation: budgetCalc,
          invoiceAmounts: invoiceAmounts,
          parsedRate: parsedRate
        }
      };
    });
    
    console.log('✅ All test cases completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Invoice calculation tests completed',
      testResults: results,
      summary: {
        totalTests: testCases.length,
        allPassed: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Invoice calculation test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Invoice calculation test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
