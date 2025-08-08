import { NextResponse } from 'next/server';
import { generateInvoiceWithRetry } from '@/lib/invoices/robust-invoice-service';

/**
 * Test endpoint for robust invoice generation
 * 
 * POST: Test invoice generation with retry logic
 */

export async function POST(request: Request) {
  try {
    const { 
      taskId, 
      projectId, 
      freelancerId, 
      commissionerId, 
      taskTitle, 
      projectTitle,
      invoiceType = 'completion',
      amount,
      testFailure = false,
      maxAttempts = 3
    } = await request.json();

    if (!taskId || !projectId || !freelancerId || !commissionerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: taskId, projectId, freelancerId, commissionerId'
      }, { status: 400 });
    }

    console.log(`🧪 Testing robust invoice generation for task ${taskId}...`);

    const invoiceRequest = {
      taskId: Number(taskId),
      projectId: Number(projectId),
      freelancerId: Number(freelancerId),
      commissionerId: Number(commissionerId),
      taskTitle: taskTitle || `Test Task ${taskId}`,
      projectTitle: projectTitle || `Test Project ${projectId}`,
      invoiceType: invoiceType as 'completion' | 'milestone',
      amount: amount ? Number(amount) : undefined
    };

    const retryConfig = {
      maxAttempts: Number(maxAttempts),
      baseDelayMs: 500, // Shorter delay for testing
      maxDelayMs: 2000,
      backoffMultiplier: 2
    };

    // Simulate failure for testing if requested
    if (testFailure) {
      console.log('🔥 Simulating failure for testing...');
      // This would normally be handled by the service, but we can test error scenarios
    }

    const result = await generateInvoiceWithRetry(invoiceRequest, retryConfig);

    return NextResponse.json({
      success: result.success,
      test: {
        taskId: invoiceRequest.taskId,
        projectId: invoiceRequest.projectId,
        invoiceType: invoiceRequest.invoiceType,
        testFailure,
        retryConfig
      },
      result: {
        invoiceNumber: result.invoiceNumber,
        amount: result.amount,
        error: result.error,
        retryAttempt: result.retryAttempt,
        generatedAt: result.generatedAt
      },
      message: result.success 
        ? `Test successful: Invoice ${result.invoiceNumber} generated`
        : `Test failed: ${result.error}`
    });

  } catch (error) {
    console.error('❌ Error in robust invoice generation test:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed with exception',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Robust Invoice Generation Test Endpoint',
    usage: {
      method: 'POST',
      requiredFields: ['taskId', 'projectId', 'freelancerId', 'commissionerId'],
      optionalFields: ['taskTitle', 'projectTitle', 'invoiceType', 'amount', 'testFailure', 'maxAttempts'],
      example: {
        taskId: 123,
        projectId: 456,
        freelancerId: 1,
        commissionerId: 2,
        taskTitle: 'Test Task',
        projectTitle: 'Test Project',
        invoiceType: 'completion',
        amount: 1000,
        testFailure: false,
        maxAttempts: 3
      }
    }
  });
}
