import { NextResponse } from 'next/server';
import { 
  executeTaskApprovalTransaction,
  executeProjectCompletionTransaction,
  executeCustomTransaction 
} from '@/lib/transactions/transaction-service';

/**
 * Transaction Service Test API
 * 
 * POST: Test task approval transaction
 * PUT: Test project completion transaction
 * PATCH: Test custom transaction
 */

export async function POST(request: Request) {
  try {
    const { 
      taskId,
      projectId,
      freelancerId,
      commissionerId,
      taskTitle = 'Test Task',
      projectTitle = 'Test Project',
      generateInvoice = true,
      invoiceType = 'completion'
    } = await request.json();

    if (!taskId || !projectId || !freelancerId || !commissionerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: taskId, projectId, freelancerId, commissionerId'
      }, { status: 400 });
    }

    console.log(`🧪 Testing task approval transaction for task ${taskId}...`);

    const transactionParams = {
      taskId: Number(taskId),
      projectId: Number(projectId),
      freelancerId: Number(freelancerId),
      commissionerId: Number(commissionerId),
      taskTitle,
      projectTitle,
      generateInvoice,
      invoiceType: invoiceType as 'completion' | 'milestone'
    };

    const result = await executeTaskApprovalTransaction(transactionParams);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Task approval transaction test completed successfully'
        : 'Task approval transaction test failed',
      test: {
        type: 'task_approval',
        params: transactionParams
      },
      transaction: result
    });

  } catch (error) {
    console.error('❌ Error testing task approval transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test task approval transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { 
      projectId,
      completedBy
    } = await request.json();

    if (!projectId || !completedBy) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: projectId, completedBy'
      }, { status: 400 });
    }

    console.log(`🧪 Testing project completion transaction for project ${projectId}...`);

    const result = await executeProjectCompletionTransaction(
      Number(projectId),
      Number(completedBy)
    );

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Project completion transaction test completed successfully'
        : 'Project completion transaction test failed',
      test: {
        type: 'project_completion',
        params: { projectId, completedBy }
      },
      transaction: result
    });

  } catch (error) {
    console.error('❌ Error testing project completion transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test project completion transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { 
      transactionId = `custom_test_${Date.now()}`,
      steps = []
    } = await request.json();

    if (steps.length === 0) {
      // Create a sample custom transaction for testing
      const sampleSteps = [
        {
          id: 'step1',
          type: 'custom',
          operation: async () => {
            console.log('Executing test step 1...');
            return { message: 'Step 1 completed' };
          },
          rollback: async () => {
            console.log('Rolling back test step 1...');
          },
          description: 'Test step 1'
        },
        {
          id: 'step2',
          type: 'custom',
          operation: async () => {
            console.log('Executing test step 2...');
            return { message: 'Step 2 completed' };
          },
          rollback: async () => {
            console.log('Rolling back test step 2...');
          },
          description: 'Test step 2'
        }
      ];

      console.log(`🧪 Testing custom transaction with sample steps...`);

      const result = await executeCustomTransaction(transactionId, sampleSteps);

      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? 'Custom transaction test completed successfully'
          : 'Custom transaction test failed',
        test: {
          type: 'custom_transaction',
          params: { transactionId, stepsCount: sampleSteps.length }
        },
        transaction: result
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Custom transaction steps not implemented in test endpoint',
      message: 'Use the sample transaction by not providing steps parameter'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error testing custom transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test custom transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Transaction Service Test Endpoint',
    endpoints: {
      'POST /api/admin/test-transactions': {
        description: 'Test task approval transaction',
        requiredFields: ['taskId', 'projectId', 'freelancerId', 'commissionerId'],
        optionalFields: ['taskTitle', 'projectTitle', 'generateInvoice', 'invoiceType']
      },
      'PUT /api/admin/test-transactions': {
        description: 'Test project completion transaction',
        requiredFields: ['projectId', 'completedBy']
      },
      'PATCH /api/admin/test-transactions': {
        description: 'Test custom transaction with sample steps',
        optionalFields: ['transactionId', 'steps']
      }
    },
    examples: {
      taskApproval: {
        taskId: 123,
        projectId: 456,
        freelancerId: 1,
        commissionerId: 2,
        taskTitle: 'Test Task',
        projectTitle: 'Test Project',
        generateInvoice: true,
        invoiceType: 'completion'
      },
      projectCompletion: {
        projectId: 456,
        completedBy: 2
      },
      customTransaction: {
        transactionId: 'custom_test_123'
      }
    }
  });
}
