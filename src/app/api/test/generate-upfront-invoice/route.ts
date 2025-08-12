import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeJsonAtomic, readJson, fileExists } from '../../../../lib/fs-json';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

/**
 * TEST ENDPOINT: Generate upfront invoice (bypasses authentication for testing)
 * This endpoint is identical to /api/invoices/generate-upfront but without authentication
 * and uses UnifiedStorageService for project lookup
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing and should be removed in production
 */

// Error response types
type ApiError = {
  success: false;
  code: 'INVALID_INPUT' | 'PROJECT_NOT_FOUND' | 'INVOICE_EXISTS' | 'INVALID_EXECUTION_MODE' | 'STORAGE_IO_ERROR';
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
interface UpfrontInvoiceInput {
  projectId: number;
  upfrontPercent?: number; // default 12, clamp 0–100
}

// Invoice structure
interface Invoice {
  invoiceNumber: string;
  projectId: number;
  method: 'completion';
  type: 'upfront';
  amount: number;
  status: 'unpaid' | 'paid';
  issuedAt: string;
}

function validateUpfrontInput(data: any): { isValid: false; error: string } | { isValid: true; input: UpfrontInvoiceInput } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object' };
  }

  const { projectId, upfrontPercent } = data;

  if (!projectId || typeof projectId !== 'number' || projectId <= 0) {
    return { isValid: false, error: 'projectId must be a positive number' };
  }

  if (upfrontPercent !== undefined) {
    if (typeof upfrontPercent !== 'number' || upfrontPercent < 0 || upfrontPercent > 100) {
      return { isValid: false, error: 'upfrontPercent must be a number between 0 and 100' };
    }
  }

  return { isValid: true, input: data as UpfrontInvoiceInput };
}

async function checkExistingUpfrontInvoice(projectId: number): Promise<boolean> {
  try {
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    // Check current date directory
    const dayPath = path.join(invoicesDir, String(year), month, day);
    
    if (await fileExists(dayPath)) {
      const invoiceNumber = `CMP${projectId}-UP`;
      const invoicePath = path.join(dayPath, `${invoiceNumber}.json`);
      
      if (await fileExists(invoicePath)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking existing upfront invoice:', error);
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse<ApiSuccess | ApiError>> {
  try {
    const rawData = await req.json();
    
    console.log('🧪 TEST: Generating upfront invoice for project:', rawData.projectId);
    
    // Validate input
    const validation = validateUpfrontInput(rawData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: validation.error!,
        details: { received: rawData }
      }, { status: 400 });
    }

    const { projectId, upfrontPercent = 12 } = validation.input!;

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

    // Validate project status
    if (project.status === 'completed') {
      return NextResponse.json({
        success: false,
        code: 'INVALID_EXECUTION_MODE',
        message: 'Cannot generate upfront invoice for completed project',
        details: { projectId, status: project.status }
      }, { status: 422 });
    }

    // Check if upfront invoice already exists
    const existingInvoice = await checkExistingUpfrontInvoice(projectId);
    if (existingInvoice) {
      return NextResponse.json({
        success: false,
        code: 'INVOICE_EXISTS',
        message: `Upfront invoice already exists for project ${projectId}`,
        details: { projectId }
      }, { status: 409 });
    }

    // Calculate amounts (12% upfront, 88% completion)
    const totalBudget = project.budget?.upper || project.budget?.lower || 0;
    if (totalBudget <= 0) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Project must have a valid budget for invoice generation',
        details: { projectId, totalBudget }
      }, { status: 400 });
    }

    const upfrontAmount = Math.round(totalBudget * (upfrontPercent / 100));

    // Create invoice
    const invoiceNumber = `CMP${projectId}-UP`;
    const currentDate = new Date();
    const invoice: Invoice = {
      invoiceNumber,
      projectId,
      method: 'completion',
      type: 'upfront',
      amount: upfrontAmount,
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

    console.log('✅ TEST: Upfront invoice generated:', { invoiceNumber, amount: upfrontAmount });

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: upfrontAmount,
      message: 'Upfront invoice generated'
    });

  } catch (error) {
    console.error('❌ TEST: Error generating upfront invoice:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_IO_ERROR',
      message: 'Failed to generate upfront invoice. Please try again.',
      details: { error: error instanceof Error ? error.message : String(error) }
    }, { status: 500 });
  }
}
