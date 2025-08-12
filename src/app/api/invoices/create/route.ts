// src/app/api/dashboard/invoices/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';
import { readProject, ProjectStorageError } from '@/lib/storage/normalize-project';
import { getTasks } from '@/lib/tasks/task-store';
import { validateProjectTaskConsistency } from '@/lib/validators/project-task-consistency';
import { getOrCreateWallet } from '@/lib/wallets/wallet-store';

const ALLOWED_STATUSES = ['draft', 'sent', 'paid'];
const ALLOWED_EXECUTION_MODES = ['milestone', 'completion'];

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
      executionMode,
    } = body;

    const sessionUserId = parseInt(session.user.id);

    if (
      !freelancerId ||
      !projectId ||
      !client ||
      !projectTitle ||
      !issueDate ||
      !executionMode ||
      !ALLOWED_EXECUTION_MODES.includes(executionMode) ||
      !Array.isArray(milestones) ||
      milestones.length === 0 ||
      typeof totalAmount !== 'number' ||
      (status && !ALLOWED_STATUSES.includes(status))
    ) {
      return NextResponse.json({
        error: 'Missing or invalid fields',
        code: 'MISSING_REQUIRED_FIELD'
      }, { status: 400 });
    }

    // 🔒 SECURITY: Verify freelancer can only create invoices for their own projects
    if (freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only create invoices for your own projects',
        code: 'UNAUTHORIZED'
      }, { status: 403 });
    }

    // 🔒 SECURITY: Verify project exists and freelancer is assigned to it
    let project;
    try {
      project = await readProject(projectId);
    } catch (error) {
      if (error instanceof ProjectStorageError) {
        if (error.code === 'PROJECT_NOT_FOUND') {
          return NextResponse.json({
            error: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          }, { status: 404 });
        }
        if (error.code === 'MIGRATION_REQUIRED') {
          return NextResponse.json({
            error: 'Project requires migration to hierarchical storage',
            code: 'MIGRATION_REQUIRED',
            details: 'Please run the storage normalization migration'
          }, { status: 409 });
        }
        if (error.code === 'INVALID_DATE_RESOLUTION') {
          return NextResponse.json({
            error: 'Project lookup must use creation date, not today',
            code: 'INVALID_DATE_RESOLUTION'
          }, { status: 422 });
        }
      }

      return NextResponse.json({
        error: 'Failed to read project',
        code: 'STORAGE_IO_ERROR',
        retryable: true
      }, { status: 500 });
    }

    if (project.freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You are not assigned to this project',
        code: 'UNAUTHORIZED'
      }, { status: 403 });
    }

    // 📋 Validate project-task consistency and use canonical tasks
    const validation = await validateProjectTaskConsistency(projectId, { logWarnings: true });
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Project ${projectId} has consistency issues:`, validation.warnings);
    }

    // 📋 Read canonical tasks for milestone eligibility validation
    let projectTasks;
    try {
      projectTasks = await getTasks(projectId);
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to read project tasks',
        code: 'TASK_READ_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 422 });
    }

    // 💰 Validate milestone eligibility for milestone invoicing
    if (executionMode === 'milestone') {
      const eligibleTasks = projectTasks.filter(task =>
        task.status === 'done' && task.milestoneId !== null
      );

      if (eligibleTasks.length === 0) {
        return NextResponse.json({
          error: 'No completed tasks eligible for milestone invoicing',
          code: 'NO_ELIGIBLE_MILESTONES',
          details: 'Tasks must be completed and assigned to milestones'
        }, { status: 422 });
      }
    }

    // 💰 Auto-initialize wallets for both parties
    try {
      await Promise.all([
        getOrCreateWallet(freelancerId, 'USD'),
        getOrCreateWallet(client, 'USD')
      ]);
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to initialize wallets',
        code: 'WALLET_INIT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    for (const milestone of milestones) {
      if (!milestone.title || typeof milestone.amount !== 'number') {
        return NextResponse.json({
          error: 'Invalid milestone data',
          code: 'INVALID_MILESTONE_DATA'
        }, { status: 400 });
      }
    }

    const allInvoices = await getAllInvoices();
    const newInvoiceId = Math.floor(100000 + Math.random() * 900000);

    const newInvoice = {
      id: newInvoiceId,
      invoiceNumber: `INV-${newInvoiceId}`,
      freelancerId,
      projectId,
      commissionerId: client,
      projectTitle,
      issueDate,
      dueDate,
      executionMode, // immutable after creation
      milestones,
      totalAmount,
      status: status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveInvoice(newInvoice);

    return NextResponse.json(
      { message: 'Invoice created successfully', invoiceId: newInvoiceId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      retryable: true
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
      executionMode, // should not be editable
    } = body;

    if (!id || (status && !ALLOWED_STATUSES.includes(status))) {
      return NextResponse.json({ error: 'Missing invoice ID or invalid status' }, { status: 400 });
    }

    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (!milestone.title || typeof milestone.amount !== 'number') {
          return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
        }
      }
    }

    const file = await readFile(invoicesFilePath, 'utf-8');
    const invoices = JSON.parse(file);

    const index = invoices.findIndex((inv: any) => inv.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Prevent executionMode from being modified
    if (
      executionMode &&
      executionMode !== invoices[index].executionMode
    ) {
      return NextResponse.json({ error: 'executionMode cannot be modified after creation' }, { status: 400 });
    }

    invoices[index] = {
      ...invoices[index],
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate, // OK to update
      milestones,
      totalAmount,
      status,
    };

    await writeFile(invoicesFilePath, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ message: 'Invoice updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}