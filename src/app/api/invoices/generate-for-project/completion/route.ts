import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { promises as fs } from 'fs';
import path from 'path';

// Hierarchical invoice helpers
import { getAllInvoices, saveInvoice } from '@/lib/invoice-storage';

const LOG = path.join(process.cwd(), 'data', 'logs', 'invoice-gen-completion.log');

async function log(stage: string, payload: Record<string, any>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), stage, ...payload }) + '\n';
  await fs.mkdir(path.dirname(LOG), { recursive: true });
  await fs.appendFile(LOG, line);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, freelancerId } = body;

    // Validate input (projectId: string, freelancerId to number)
    if (typeof projectId !== 'string' || !projectId.trim()) {
      await log('INVALID_PROJECT_ID', { projectId, type: typeof projectId });
      return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
    }

    const freelancerIdNum = typeof freelancerId === 'string' ? parseInt(freelancerId, 10) : freelancerId;
    if (!freelancerIdNum || isNaN(freelancerIdNum)) {
      await log('INVALID_FREELANCER_ID', { freelancerId, type: typeof freelancerId });
      return NextResponse.json({ error: 'Invalid freelancerId' }, { status: 400 });
    }

    await log('START', { projectId, freelancerId: freelancerIdNum });

    // Read project via UnifiedStorageService.readProject(projectId)
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      await log('READ_PROJECT_MISS', { projectId });
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await log('READ_PROJECT_OK', { projectId, invoicingMethod: project.invoicingMethod });

    // If project.invoicingMethod !== "completion" → 400 + log and return
    if (project.invoicingMethod !== 'completion') {
      await log('WRONG_INVOICING_METHOD', { projectId, method: project.invoicingMethod });
      return NextResponse.json({ 
        error: 'This endpoint is only for completion-based projects',
        invoicingMethod: project.invoicingMethod 
      }, { status: 400 });
    }

    // Read tasks via UnifiedStorageService.listTasks(projectId)
    const tasks = await UnifiedStorageService.listTasks(projectId);
    await log('READ_TASKS_OK', { projectId, count: tasks.length });

    // Normalize and approve filter
    const approvedTasks = tasks.filter((task: any) => {
      const status = (task.status || '').toLowerCase();
      const isApproved = status === 'approved' || 
                        status === 'completed' || 
                        status === 'done' || 
                        status === 'approved_by_commissioner' ||
                        task.approvedAt;
      return isApproved;
    });

    await log('FILTER_APPROVED', { 
      projectId, 
      total: tasks.length, 
      approved: approvedTasks.length 
    });

    // Get existing invoices for the project
    const invoices = await getAllInvoices({ projectId });
    await log('LIST_INVOICES_OK', { projectId, count: invoices.length });

    // Only check for duplicates against non-draft invoices (sent/paid)
    const paidInvoices = invoices.filter((invoice: any) => invoice.status !== 'draft');
    const invoicedTaskIds = new Set();
    const invoicedTitles = new Set();

    paidInvoices.forEach((invoice: any) => {
      if (invoice.milestones) {
        invoice.milestones.forEach((milestone: any) => {
          if (milestone.taskId) invoicedTaskIds.add(milestone.taskId);
          if (milestone.title) invoicedTitles.add(milestone.title);
          if (milestone.description) invoicedTitles.add(milestone.description);
        });
      }
    });

    const availableTasks = approvedTasks.filter((task: any) => {
      const taskId = task.taskId || task.id;
      const title = task.title;
      return !invoicedTaskIds.has(taskId) && !invoicedTitles.has(title);
    });

    await log('FILTER_DEDUP', {
      projectId,
      available: availableTasks.length,
      alreadyInvoicedById: invoicedTaskIds.size,
      alreadyInvoicedByTitle: invoicedTitles.size,
      excludedDrafts: true
    });

    // If none available → return 400 with detailed error
    if (availableTasks.length === 0) {
      await log('NO_AVAILABLE_TASKS', {
        projectId,
        total: tasks.length,
        approved: approvedTasks.length,
        alreadyInvoicedById: invoicedTaskIds.size,
        alreadyInvoicedByTitle: invoicedTitles.size
      });

      return NextResponse.json({
        error: 'No available tasks to invoice',
        detail: {
          total: tasks.length,
          approved: approvedTasks.length,
          alreadyInvoicedById: invoicedTaskIds.size,
          alreadyInvoicedByTitle: invoicedTitles.size
        }
      }, { status: 400 });
    }

    // Rate calculation for completion
    const totalBudget = project.totalBudget || 0;
    // Calculate 88% pool (12% upfront already paid)
    const upfront = project.upfrontCommitment || (totalBudget * 0.12);
    const pool = Math.max(totalBudget - upfront, 0);     // 88% lives here
    const base = project.totalTasks || approvedTasks.length || 1;
    const ratePerTask = pool / base;

    await log('RATE_OK', { projectId, ratePerTask, upfront, pool, totalBudget, base, calculation: `${pool} ÷ ${base} = ${ratePerTask}` });

    // Check for existing draft with same milestone set
    const existingInvoices = await getAllInvoices({ projectId: projectId, freelancerId: freelancerIdNum });
    const existingDraft = existingInvoices.find(inv =>
      inv.status === 'draft' &&
      inv.milestones?.length === availableTasks.length &&
      inv.milestones?.every((m: any) => availableTasks.some((t: any) => (t.taskId || t.id) === m.taskId))
    );

    if (existingDraft) {
      await log('EXISTING_DRAFT_FOUND', { projectId, existingInvoiceNumber: existingDraft.invoiceNumber });

      // Check if existing draft has zero values - if so, fix it
      const hasZeroValues = !existingDraft.totalAmount || existingDraft.totalAmount === 0 ||
                           existingDraft.milestones?.some((m: any) => !m.rate || m.rate === 0);

      if (hasZeroValues) {
        await log('FIXING_ZERO_VALUES', { projectId, existingInvoiceNumber: existingDraft.invoiceNumber });

        // Fix the milestones with correct rates
        const fixedMilestones = availableTasks.map((task: any) => ({
          title: task.title || `Task ${task.taskId || task.id}`,
          description: task.description || task.title || `Task ${task.taskId || task.id}`,
          rate: ratePerTask,
          taskId: task.taskId || task.id
        }));

        const fixedTotalAmount = fixedMilestones.reduce((sum: number, m: any) => sum + m.rate, 0);

        const fixedInvoice = {
          ...existingDraft,
          milestones: fixedMilestones,
          totalAmount: fixedTotalAmount,
          updatedAt: new Date().toISOString()
        };

        // Save the fixed invoice
        await saveInvoice(fixedInvoice);
        await log('FIXED_EXISTING_DRAFT', { projectId, invoiceNumber: existingDraft.invoiceNumber, totalAmount: fixedTotalAmount });

        return NextResponse.json({
          success: true,
          invoiceNumber: existingDraft.invoiceNumber,
          invoiceData: fixedInvoice,
          wasExisting: true,
          wasFixed: true
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        invoiceNumber: existingDraft.invoiceNumber,
        invoiceData: existingDraft,
        wasExisting: true
      }, { status: 200 });
    }

    // Generate human-friendly invoice number with completion prefix
    let invoiceNumber = `INV-C-${projectId}-${Date.now()}`;
    try {
      // Get commissioner profile for initials
      const usersRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users`);
      if (usersRes.ok) {
        const users = await usersRes.json();
        const commissioner = users.find((user: any) => user.id === project.commissionerId);
        if (commissioner?.name) {
          const initials = commissioner.name
            .split(' ')
            .map((word: string) => word[0]?.toUpperCase())
            .join('')
            .slice(0, 2);

          // Get count of existing COMPLETION invoices for this commissioner to generate sequence
          const commissionerInvoices = await getAllInvoices({ commissionerId: project.commissionerId });
          const completionInvoices = commissionerInvoices.filter(inv =>
            inv.invoiceType && (
              inv.invoiceType.includes('completion') ||
              inv.invoiceNumber?.includes('-C')
            )
          );
          const sequence = String(completionInvoices.length + 1).padStart(3, '0');
          invoiceNumber = `${initials}-C${sequence}`;
        }
      }
    } catch (error) {
      console.warn('Failed to generate human-friendly invoice number, using fallback:', error);
    }

    // Build milestones
    const milestones = availableTasks.map((task: any) => ({
      title: task.title || `Task ${task.taskId || task.id}`,
      description: task.description || task.title || `Task ${task.taskId || task.id}`,
      rate: ratePerTask,
      taskId: task.taskId || task.id
    }));

    await log('BUILD_OK', { projectId, invoiceNumber, milestones: milestones.length });

    const totalAmount = milestones.reduce((sum: number, m: any) => sum + m.rate, 0);

    const newInvoice = {
      invoiceNumber,
      freelancerId: freelancerIdNum,
      commissionerId: project.commissionerId,
      projectId: projectId,
      projectTitle: project.title,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount: totalAmount,
      status: 'draft' as const,
      milestones: milestones,
      isCustomProject: false,
      createdAt: new Date().toISOString(),
      autoGenerated: true
    };

    // Atomic write via saveInvoice
    try {
      await saveInvoice(newInvoice);
      await log('WRITE_OK', { projectId, invoiceNumber });
    } catch (error) {
      await log('WRITE_FAIL', { projectId, invoiceNumber, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }

    await log('DONE', { projectId, invoiceNumber, success: true });

    // Return 201 { success: true, invoiceNumber, invoiceData }
    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceData: newInvoice,
      wasExisting: false
    }, { status: 201 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await log('ERROR', { error: msg }).catch(() => {});
    console.error('Error generating completion invoice:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
