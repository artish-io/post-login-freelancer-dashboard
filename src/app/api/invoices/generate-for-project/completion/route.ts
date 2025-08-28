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

    let availableTasks = approvedTasks.filter((task: any) => {
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

    // Additional check: Ensure no task already has ANY invoice (including sent/paid)
    // This prevents duplicate invoices for the same task across different statuses
    const allProjectInvoices = await getAllInvoices({ projectId });
    const tasksWithExistingInvoices = new Set();

    allProjectInvoices.forEach((invoice: any) => {
      if (invoice.milestones) {
        invoice.milestones.forEach((milestone: any) => {
          if (milestone.taskId) {
            tasksWithExistingInvoices.add(milestone.taskId);
          }
        });
      }
    });

    // Filter out tasks that already have ANY invoice (regardless of status)
    const finalAvailableTasks = availableTasks.filter((task: any) => {
      const taskId = task.taskId || task.id;
      return !tasksWithExistingInvoices.has(taskId);
    });

    await log('FINAL_TASK_FILTER', {
      projectId,
      initialAvailable: availableTasks.length,
      finalAvailable: finalAvailableTasks.length,
      tasksWithExistingInvoices: Array.from(tasksWithExistingInvoices),
      filteredOutTasks: availableTasks.filter((task: any) =>
        tasksWithExistingInvoices.has(task.taskId || task.id)
      ).map((task: any) => task.taskId || task.id)
    });

    // If none available → return 400 with detailed error
    if (finalAvailableTasks.length === 0) {
      await log('NO_AVAILABLE_TASKS', {
        projectId,
        total: tasks.length,
        approved: approvedTasks.length,
        alreadyInvoicedById: invoicedTaskIds.size,
        alreadyInvoicedByTitle: invoicedTitles.size,
        tasksWithAnyInvoice: tasksWithExistingInvoices.size
      });

      return NextResponse.json({
        error: 'No available tasks to invoice',
        detail: {
          total: tasks.length,
          approved: approvedTasks.length,
          alreadyInvoicedById: invoicedTaskIds.size,
          alreadyInvoicedByTitle: invoicedTitles.size,
          tasksWithAnyInvoice: tasksWithExistingInvoices.size
        }
      }, { status: 400 });
    }

    // Update availableTasks to use the final filtered list
    availableTasks = finalAvailableTasks;

    // Rate calculation for completion
    const totalBudget = project.totalBudget || 0;
    // Calculate 88% pool (12% upfront already paid)
    const upfront = project.upfrontCommitment || (totalBudget * 0.12);
    const pool = Math.max(totalBudget - upfront, 0);     // 88% lives here
    const base = project.totalTasks || approvedTasks.length || 1;
    const ratePerTask = pool / base;

    await log('RATE_OK', { projectId, ratePerTask, upfront, pool, totalBudget, base, calculation: `${pool} ÷ ${base} = ${ratePerTask}` });

    // Since we've already filtered out all tasks that have existing invoices,
    // we can proceed directly to creating a new invoice without checking for drafts
    await log('PROCEEDING_TO_CREATE_NEW_INVOICE', {
      projectId,
      availableTaskIds: availableTasks.map((t: any) => t.taskId || t.id),
      taskCount: availableTasks.length
    });

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

          // Get highest existing COMPLETION invoice number for this commissioner to generate sequence
          const commissionerInvoices = await getAllInvoices({ commissionerId: project.commissionerId });
          const completionInvoices = commissionerInvoices.filter(inv =>
            inv.invoiceType && (
              inv.invoiceType.includes('completion') ||
              inv.invoiceNumber?.includes('-C')
            )
          );

          // Find the highest existing number to avoid duplicates
          let highestNumber = 0;
          for (const invoice of completionInvoices) {
            const parts = invoice.invoiceNumber.split('-');
            const numberPart = parts[parts.length - 1]; // Get last part after final dash
            if (numberPart && /^C?\d+$/.test(numberPart)) {
              const num = parseInt(numberPart.replace('C', ''), 10);
              if (num > highestNumber) {
                highestNumber = num;
              }
            }
          }

          const sequence = String(highestNumber + 1).padStart(3, '0');
          invoiceNumber = `${initials}-C${sequence}`;

          await log('INVOICE_NUMBER_GENERATED', {
            projectId,
            commissionerId: project.commissionerId,
            initials,
            existingCompletionInvoices: completionInvoices.length,
            highestNumber,
            newSequence: sequence,
            generatedInvoiceNumber: invoiceNumber
          });
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

    // Final check: Ensure invoice number is truly unique
    const existingInvoiceWithSameNumber = await getAllInvoices();
    const duplicateInvoice = existingInvoiceWithSameNumber.find(inv => inv.invoiceNumber === invoiceNumber);
    if (duplicateInvoice) {
      await log('DUPLICATE_INVOICE_NUMBER_DETECTED', {
        projectId,
        invoiceNumber,
        existingInvoice: {
          number: duplicateInvoice.invoiceNumber,
          status: duplicateInvoice.status,
          projectId: duplicateInvoice.projectId,
          createdAt: duplicateInvoice.createdAt
        }
      });
      // Add timestamp to make it unique
      invoiceNumber = `${invoiceNumber}-${Date.now()}`;
      await log('INVOICE_NUMBER_MADE_UNIQUE', { projectId, newInvoiceNumber: invoiceNumber });
    }

    const totalAmount = milestones.reduce((sum: number, m: any) => sum + m.rate, 0);

    const newInvoice = {
      invoiceNumber,
      freelancerId: freelancerIdNum,
      commissionerId: project.commissionerId || 0,
      projectId: projectId,
      projectTitle: project.title,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount: totalAmount,
      status: 'draft' as const,
      milestones: milestones,
      isCustomProject: false,
      invoiceType: 'auto_completion', // Ensure proper categorization
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoGenerated: true
    };

    // Atomic write via saveInvoice
    try {
      await saveInvoice(newInvoice as any);
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
