import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeJsonAtomic, readJson, fileExists } from '../../../../lib/fs-json';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

/**
 * TEST ENDPOINT: Generate completion invoice (bypasses authentication for testing)
 * This endpoint is identical to /api/invoices/auto-generate-completion but without authentication
 * and uses UnifiedStorageService for project lookup
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing and should be removed in production
 */

// Error response types
type ApiError = {
  success: false;
  code: 'INVALID_INPUT' | 'PROJECT_NOT_FOUND' | 'INVOICE_EXISTS' | 'INVALID_EXECUTION_MODE' | 'UPFRONT_NOT_PAID' | 'TASKS_NOT_FOUND' | 'TASKS_NOT_COMPLETED' | 'STORAGE_IO_ERROR';
  message: string;
  details?: unknown;
};

type ApiSuccess = {
  success: true;
  invoiceNumber: string;
  amount: number;
  message: string;
};

// Input validation schema
interface CompletionInvoiceInput {
  projectId: number;
}

// Invoice structure
interface Invoice {
  invoiceNumber: string;
  projectId: number;
  method: 'completion';
  type: 'completion';
  amount: number;
  status: 'unpaid' | 'paid';
  issuedAt: string;
}

function validateCompletionInput(data: any): { isValid: false; error: string } | { isValid: true; input: CompletionInvoiceInput } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object' };
  }

  const { projectId } = data;

  if (!projectId || typeof projectId !== 'number' || projectId <= 0) {
    return { isValid: false, error: 'projectId must be a positive number' };
  }

  return { isValid: true, input: data as CompletionInvoiceInput };
}

async function checkUpfrontInvoicePaid(projectId: number): Promise<boolean> {
  try {
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const invoiceNumber = `CMP${projectId}-UP`;
    const currentDate = new Date();
    const year = currentDate.getFullYear();

    // Check current year and previous year
    for (const checkYear of [year, year - 1]) {
      const yearPath = path.join(invoicesDir, String(checkYear));
      if (!await fileExists(yearPath)) continue;

      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const monthPath = path.join(yearPath, monthStr);
        if (!await fileExists(monthPath)) continue;

        for (let day = 1; day <= 31; day++) {
          const dayStr = String(day).padStart(2, '0');
          const invoicePath = path.join(monthPath, dayStr, `${invoiceNumber}.json`);

          if (await fileExists(invoicePath)) {
            const invoice = await readJson<{ status: string }>(invoicePath, { status: 'unpaid' });
            return invoice.status === 'paid';
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking upfront invoice:', error);
    return false;
  }
}

async function checkExistingCompletionInvoice(projectId: number): Promise<boolean> {
  try {
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    // Check current date directory
    const dayPath = path.join(invoicesDir, String(year), month, day);

    if (await fileExists(dayPath)) {
      const invoiceNumber = `CMP${projectId}-COMP`;
      const invoicePath = path.join(dayPath, `${invoiceNumber}.json`);

      if (await fileExists(invoicePath)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking existing completion invoice:', error);
    return false;
  }
}

async function findProjectTasks(projectId: number): Promise<any[]> {
  try {
    const tasks = await UnifiedStorageService.getTasksByProject(projectId);
    return tasks || [];
  } catch (error) {
    console.error('Error finding project tasks:', error);
    return [];
  }
}

export async function POST(req: Request): Promise<NextResponse<ApiSuccess | ApiError>> {
  try {
    const rawData = await req.json();

    console.log('🧪 TEST: Generating completion invoice for project:', rawData.projectId);

    // Validate input
    const validation = validateCompletionInput(rawData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: validation.error!,
        details: { received: rawData }
      }, { status: 400 });
    }

    const { projectId } = validation.input!;

    // Find project using UnifiedStorageService
    const project = await UnifiedStorageService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        details: { projectId }
      }, { status: 404 });
    }

    // Validate execution mode
    const executionMethod = project.invoicingMethod || 'completion';
    if (executionMethod !== 'completion') {
      return NextResponse.json({
        success: false,
        code: 'INVALID_EXECUTION_MODE',
        message: `Project must use completion invoicing method, found: ${executionMethod}`,
        details: { projectId, executionMethod }
      }, { status: 422 });
    }

    // Check if completion invoice already exists
    const existingInvoice = await checkExistingCompletionInvoice(projectId);
    if (existingInvoice) {
      return NextResponse.json({
        success: false,
        code: 'INVOICE_EXISTS',
        message: `Completion invoice already exists for project ${projectId}`,
        details: { projectId }
      }, { status: 409 });
    }

    // For testing, skip upfront payment check
    console.log('🧪 TEST: Skipping upfront payment check for testing purposes');

    // Find and validate tasks
    const tasks = await findProjectTasks(projectId);
    if (tasks.length === 0) {
      return NextResponse.json({
        success: false,
        code: 'TASKS_NOT_FOUND',
        message: `No tasks found for project ${projectId}`,
        details: { projectId }
      }, { status: 404 });
    }

    // For testing, skip task completion check
    console.log('🧪 TEST: Skipping task completion check for testing purposes');

    // Calculate amounts
    const totalBudget = project.budget?.upper || project.budget?.lower || 0;
    if (totalBudget <= 0) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Project must have a valid budget for invoice generation',
        details: { projectId, totalBudget }
      }, { status: 400 });
    }

    const upfrontAmount = Math.round(totalBudget * 0.12); // 12% upfront
    const completionAmount = totalBudget - upfrontAmount; // 88% completion

    // Create completion invoice
    const invoiceNumber = `CMP${projectId}-COMP`;
    const currentDate = new Date();
    const invoice: Invoice = {
      invoiceNumber,
      projectId,
      method: 'completion',
      type: 'completion',
      amount: completionAmount,
      status: 'unpaid',
      issuedAt: currentDate.toISOString(),
    };

    // Save invoice to hierarchical storage
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const invoicePath = path.join(
      process.cwd(),
      'data',
      'invoices',
      String(year),
      month,
      day,
      `${invoiceNumber}.json`
    );

    await writeJsonAtomic(invoicePath, invoice);

    console.log('✅ TEST: Completion invoice generated:', { invoiceNumber, amount: completionAmount });

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: completionAmount,
      message: 'Completion invoice generated'
    });

  } catch (error) {
    console.error('❌ TEST: Error generating completion invoice:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_IO_ERROR',
      message: 'Failed to generate completion invoice. Please try again.',
      details: { error: error instanceof Error ? error.message : String(error) }
    }, { status: 500 });
  }
}
