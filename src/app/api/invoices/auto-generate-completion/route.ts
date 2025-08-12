// src/app/api/invoices/auto-generate-completion/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { writeJsonAtomic, readJson, fileExists } from '../../../../lib/fs-json';
import { readProject as readCanonicalProject } from '@/lib/storage/normalize-project';

/**
 * Auto-Generate Completion Invoice for Completion-Based Projects
 *
 * Generates the final completion invoice (88% of budget) when all tasks are approved
 * and the upfront invoice is paid.
 *
 * Requirements:
 * - Project must use completion invoicing method
 * - All tasks must be completed and approved
 * - Upfront invoice must be paid
 * - No existing completion invoice
 */

// Error response types
type ApiError = {
  success: false;
  code:
    | 'INVALID_INPUT'
    | 'PROJECT_NOT_FOUND'
    | 'TASKS_NOT_FOUND'
    | 'INVOICE_EXISTS'
    | 'TASKS_NOT_APPROVED'
    | 'UPFRONT_NOT_PAID'
    | 'INVALID_EXECUTION_MODE'
    | 'STORAGE_IO_ERROR';
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

// Task structure
interface Task {
  id: number;
  status: string;
  completed?: boolean;
  approved?: boolean;
  projectId?: number;
}

function validateCompletionInput(data: unknown): { isValid: boolean; error?: string; input?: CompletionInvoiceInput } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid input: expected object' };
  }
  const input = data as Partial<CompletionInvoiceInput>;
  if (!input.projectId || typeof input.projectId !== 'number') {
    return { isValid: false, error: 'projectId is required and must be a number' };
  }
  return { isValid: true, input: input as CompletionInvoiceInput };
}

async function findProjectTasks(projectId: number): Promise<Task[]> {
  try {
    // Try hierarchical storage first (kept as-is to preserve behavior)
    const tasksDir = path.join(process.cwd(), 'data', 'project-tasks');

    // Scan through hierarchical structure lists if present
    const years = await readJson<string[]>(path.join(tasksDir, 'years.json'), []).catch(() => []);

    for (const year of years) {
      const yearPath = path.join(tasksDir, year);
      if (!(await fileExists(yearPath))) continue;

      try {
        const months = await readJson<string[]>(path.join(yearPath, 'months.json'), []).catch(() => []);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          if (!(await fileExists(monthPath))) continue;

          try {
            const days = await readJson<string[]>(path.join(monthPath, 'days.json'), []).catch(() => []);

            for (const day of days) {
              const tasksPath = path.join(monthPath, day, String(projectId), 'tasks.json');

              if (await fileExists(tasksPath)) {
                const tasksData = await readJson<{ tasks: Task[] }>(tasksPath, { tasks: [] });
                return tasksData.tasks || [];
              }
            }
          } catch {
            // Continue searching
          }
        }
      } catch {
        // Continue searching
      }
    }

    // Fallback: try legacy flat structure
    const legacyPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    if (await fileExists(legacyPath)) {
      const allTasks = await readJson<Task[]>(legacyPath, []);
      return allTasks.filter((task) => task.projectId === projectId);
    }

    return [];
  } catch (error) {
    console.error('Error finding project tasks:', error);
    return [];
  }
}

async function checkUpfrontInvoicePaid(projectId: number): Promise<boolean> {
  try {
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const invoiceNumber = `CMP${projectId}-UP`;

    // Scan current and previous year day folders for the upfront invoice
    const currentDate = new Date();
    const year = currentDate.getFullYear();

    for (const checkYear of [year, year - 1]) {
      const yearPath = path.join(invoicesDir, String(checkYear));
      if (!(await fileExists(yearPath))) continue;

      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const monthPath = path.join(yearPath, monthStr);
        if (!(await fileExists(monthPath))) continue;

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

    // Check current date directory (kept as-is to preserve behavior)
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

// ✅ Canonical, robust project lookup (replaces brittle list scanning)
async function findProject(projectId: number): Promise<Project | null> {
  try {
    const p = await readCanonicalProject(projectId);
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

export async function POST(req: Request): Promise<NextResponse<ApiSuccess | ApiError>> {
  try {
    const rawData = await req.json();

    // Validate input
    const validation = validateCompletionInput(rawData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_INPUT',
          message: validation.error!,
          details: { received: rawData }
        },
        { status: 400 }
      );
    }

    const { projectId } = validation.input!;

    // Find project
    const project = await findProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          code: 'PROJECT_NOT_FOUND',
          message: `Project ${projectId} not found`,
          details: { projectId }
        },
        { status: 404 }
      );
    }

    // Validate execution mode
    const executionMethod = project.invoicingMethod || project.executionMethod;
    if (executionMethod !== 'completion') {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_EXECUTION_MODE',
          message: `Project must use completion invoicing method, found: ${executionMethod}`,
          details: { projectId, executionMethod }
        },
        { status: 422 }
      );
    }

    // Check if completion invoice already exists
    const existingInvoice = await checkExistingCompletionInvoice(projectId);
    if (existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVOICE_EXISTS',
          message: `Completion invoice already exists for project ${projectId}`,
          details: { projectId }
        },
        { status: 409 }
      );
    }

    // Check if upfront invoice is paid
    const upfrontPaid = await checkUpfrontInvoicePaid(projectId);
    if (!upfrontPaid) {
      return NextResponse.json(
        {
          success: false,
          code: 'UPFRONT_NOT_PAID',
          message: `Upfront invoice must be paid before generating completion invoice for project ${projectId}`,
          details: { projectId }
        },
        { status: 422 }
      );
    }

    // Find and validate tasks
    const tasks = await findProjectTasks(projectId);
    if (tasks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'TASKS_NOT_FOUND',
          message: `No tasks found for project ${projectId}`,
          details: { projectId }
        },
        { status: 404 }
      );
    }

    // Check if all tasks are completed and approved
    const incompleteTasks = tasks.filter((task) => {
      const isCompleted = task.status === 'done' || task.status === 'Approved' || task.completed === true;
      const isApproved = task.approved === true || task.status === 'Approved';
      return !isCompleted || !isApproved;
    });

    if (incompleteTasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'TASKS_NOT_APPROVED',
          message: `All tasks must be completed and approved. ${incompleteTasks.length} tasks are not ready.`,
          details: {
            projectId,
            totalTasks: tasks.length,
            incompleteTasks: incompleteTasks.length,
            incompleteTaskIds: incompleteTasks.map((t) => t.id)
          }
        },
        { status: 422 }
      );
    }

    // Calculate completion amount (88% of total budget)
    const totalBudget = project.totalBudget || project.budget?.upper || project.budget?.lower || 0;
    if (totalBudget <= 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_INPUT',
          message: 'Project must have a valid budget for invoice generation',
          details: { projectId, totalBudget }
        },
        { status: 400 }
      );
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
      issuedAt: currentDate.toISOString()
    };

    // Save invoice to hierarchical storage (same day-based layout you use elsewhere)
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const invoicePath = path.join(process.cwd(), 'data', 'invoices', String(year), month, day, `${invoiceNumber}.json`);
    await writeJsonAtomic(invoicePath, invoice);

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: completionAmount,
      message: 'Completion invoice generated'
    });
  } catch (error) {
    console.error('Error generating completion invoice:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'STORAGE_IO_ERROR',
        message: 'Failed to generate completion invoice. Please try again.',
        details: { error: error instanceof Error ? error.message : String(error) }
      },
      { status: 500 }
    );
  }
}