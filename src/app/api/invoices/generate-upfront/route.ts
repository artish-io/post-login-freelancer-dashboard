// src/app/api/invoices/generate-upfront/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { writeJsonAtomic, readJson, fileExists } from '../../../../lib/fs-json';
import { readProject as readCanonicalProject } from '@/lib/storage/normalize-project'; // ✅ use canonical resolver

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

// Project structure (minimal needed fields)
interface Project {
  projectId: number;
  title: string;
  status: string;
  invoicingMethod?: string;
  executionMethod?: string;
  totalBudget?: number;
  budget?: {
    upper?: number;
    lower?: number;
  };
}

function validateUpfrontInput(data: unknown): { isValid: boolean; error?: string; input?: UpfrontInvoiceInput } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid input: expected object' };
  }

  const input = data as Partial<UpfrontInvoiceInput>;

  if (!input.projectId || typeof input.projectId !== 'number') {
    return { isValid: false, error: 'projectId is required and must be a number' };
  }

  if (input.upfrontPercent !== undefined) {
    if (typeof input.upfrontPercent !== 'number' || input.upfrontPercent < 0 || input.upfrontPercent > 100) {
      return { isValid: false, error: 'upfrontPercent must be a number between 0 and 100' };
    }
  }

  return { isValid: true, input: input as UpfrontInvoiceInput };
}

// ✅ Minimal, safe change: use canonical project reader instead of scanning custom JSON lists
async function findProject(projectId: number): Promise<Project | null> {
  try {
    const p = await readCanonicalProject(projectId);
    // Narrow to the minimal Project shape we need; keep original fields untouched
    return {
      projectId: p.projectId,
      title: (p as any).title,
      status: (p as any).status,
      invoicingMethod: (p as any).invoicingMethod,
      executionMethod: (p as any).executionMethod,
      totalBudget: (p as any).totalBudget,
      budget: (p as any).budget
    } as Project;
  } catch {
    return null;
  }
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

    // NOTE: Keeping behavior identical — we don't scan other dates to avoid changing existing flows.
    return false;
  } catch (error) {
    console.error('Error checking existing invoice:', error);
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse<ApiSuccess | ApiError>> {
  try {
    const rawData = await req.json();

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

    // Find project
    const project = await findProject(projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        details: { projectId }
      }, { status: 404 });
    }

    // Validate execution mode
    const executionMethod = project.invoicingMethod || project.executionMethod;
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

    // Check if upfront invoice already exists (kept same-day behavior)
    const existingInvoice = await checkExistingUpfrontInvoice(projectId);
    if (existingInvoice) {
      return NextResponse.json({
        success: false,
        code: 'INVOICE_EXISTS',
        message: `Upfront invoice already exists for project ${projectId}`,
        details: { projectId }
      }, { status: 409 });
    }

    // Calculate amounts (12% upfront, 88% completion) — preserving your previous logic
    const totalBudget = project.totalBudget || project.budget?.upper || project.budget?.lower || 0;
    if (totalBudget <= 0) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Project must have a valid budget for invoice generation',
        details: { projectId, totalBudget }
      }, { status: 400 });
    }

    const upfrontAmount = Math.round(totalBudget * (upfrontPercent / 100));
    // const completionAmount = totalBudget - upfrontAmount; // calculated previously but unused here

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
    }

    // Save invoice to hierarchical storage (same day-based layout you were using)
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

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: upfrontAmount,
      message: 'Upfront invoice generated'
    });

  } catch (error) {
    console.error('Error generating upfront invoice:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_IO_ERROR',
      message: 'Failed to generate upfront invoice. Please try again.',
      details: { error: error instanceof Error ? error.message : String(error) }
    }, { status: 500 });
  }
}