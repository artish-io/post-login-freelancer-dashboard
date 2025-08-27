import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { logInvoiceTransition, Subsystems } from '@/lib/log/transitions';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { getAllInvoices } from '@/lib/invoice-storage';

// Invariant helper to narrow types after validation
function invariant<T>(value: T | null | undefined, message: string): asserts value is T {
  if (!value) {
    throw new Error(message);
  }
}

/**
 * Calculate actual remaining budget by checking all existing paid invoices for the project
 * This ensures accurate budget tracking even if paidToDate is not properly updated
 */
async function calculateActualRemainingBudget(projectId: string, totalBudget: number): Promise<number> {
  try {
    // Get all invoices for this project
    const allInvoices = await getAllInvoices({ projectId });

    // Calculate total paid amount from all paid invoices
    const totalPaidAmount = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    const remainingBudget = totalBudget - totalPaidAmount;

    console.log(`[BUDGET_TRACKING] Project ${projectId}: Total budget: $${totalBudget}, Total paid: $${totalPaidAmount}, Remaining: $${remainingBudget}`);

    return Math.max(0, remainingBudget); // Ensure non-negative
  } catch (error) {
    console.error(`[BUDGET_TRACKING] Error calculating remaining budget for project ${projectId}:`, error);
    // Fallback to original calculation if there's an error
    return totalBudget * 0.88; // Assume only upfront was paid
  }
}

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing invoice routes

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId: freelancerId } = await requireSession(req);
    const body = await req.json();
    const { projectId, taskId } = sanitizeApiInput(body);

    // Normalize IDs: projectId as string, taskId as number
    const normalizedProjectId = String(projectId);
    const normalizedTaskId = Number(taskId);

    if (!normalizedProjectId || isNaN(normalizedTaskId)) {
      return NextResponse.json(err('INVALID_INPUT', 'Invalid projectId or taskId', 400), { status: 400 });
    }

    console.log(`[MANUAL_INV][ELIGIBILITY] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, eligible: "checking", reason: "starting validation" }`);

    // 🔒 COMPLETION-SPECIFIC: Get project and validate using hierarchical storage
    const project = await UnifiedStorageService.readProject(normalizedProjectId);
    if (!project) {
      return NextResponse.json(err('PROJECT_NOT_FOUND', 'Project not found'), { status: 404 });
    }
    if (project.invoicingMethod !== 'completion') {
      return NextResponse.json(err('INVALID_INPUT', 'Project must be completion-based'), { status: 400 });
    }
    if (project.freelancerId !== freelancerId) {
      return NextResponse.json(err('UNAUTHORIZED', 'Unauthorized'), { status: 403 });
    }

    // 🔒 COMPLETION-SPECIFIC: Validate task is approved and unpaid using hierarchical storage
    const task = await UnifiedStorageService.readTask(normalizedProjectId, normalizedTaskId);
    if (!task) {
      return NextResponse.json(err('TASK_NOT_FOUND', 'Task not found'), { status: 404 });
    }
    if (task.status !== 'Approved') {
      return NextResponse.json(err('INVALID_STATUS', 'Task must be approved'), { status: 400 });
    }
    if (task.projectId !== normalizedProjectId) {
      return NextResponse.json(err('INVALID_INPUT', 'Task does not belong to project'), { status: 400 });
    }
    if (task.invoicePaid) {
      return NextResponse.json(err('DUPLICATE_OPERATION', 'Task already has paid invoice'), { status: 409 });
    }
    
    // Check if task already has an invoice using hierarchical storage
    const allInvoices = await getAllInvoices({ projectId: normalizedProjectId });
    const existingInvoices = allInvoices.filter(inv =>
      (inv as any).taskId === normalizedTaskId &&
      (inv.status === 'paid' || inv.status === 'sent')
    );

    if (existingInvoices.length > 0) {
      console.log(`[MANUAL_INV][ELIGIBILITY] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, eligible: false, reason: "task already has invoice" }`);
      return NextResponse.json(err('DUPLICATE_OPERATION', 'Task already has an invoice'), { status: 409 });
    }

    console.log(`[MANUAL_INV][ELIGIBILITY] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, eligible: true, reason: "task approved and no existing invoice" }`);

    // 🧮 COMPLETION-SPECIFIC: Calculate manual invoice amount - 88% budget divided equally among ALL tasks
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');

    // Get all tasks for this project using hierarchical storage
    const allTasks = await UnifiedStorageService.listTasks(normalizedProjectId);
    const totalTasks = allTasks.length;

    if (totalTasks === 0) {
      return NextResponse.json(err('INVALID_INPUT', 'No tasks found for project'), { status: 400 });
    }

    // CORRECT LOGIC: 88% of budget divided equally among ALL tasks (upfront is NOT payment for a task)
    const taskPortionBudget = (project?.totalBudget || 0) * 0.88; // 88% for all tasks
    const amountPerTask = Math.round((taskPortionBudget / totalTasks) * 100) / 100;
    const manualInvoiceAmount = amountPerTask;

    console.log(`[COMPLETION_PAY] Manual invoice calculation for project ${normalizedProjectId}: Total budget: $${project?.totalBudget}, Task portion (88%): $${taskPortionBudget}, Total tasks: ${totalTasks}, Amount per task: $${manualInvoiceAmount}`);

    // ✅ ENHANCED: Calculate actual remaining budget by checking existing invoices
    const actualRemainingBudget = await calculateActualRemainingBudget(normalizedProjectId, project.totalBudget || 0);

    // Validate the calculated amount doesn't exceed actual remaining budget
    if (manualInvoiceAmount > actualRemainingBudget) {
      console.error(`[REMAINDER_BUDGET] Manual invoice amount ($${manualInvoiceAmount}) exceeds actual remaining budget ($${actualRemainingBudget})`);
      return NextResponse.json(err('INSUFFICIENT_FUNDS', `Cannot create invoice: Amount $${manualInvoiceAmount} exceeds remaining budget $${actualRemainingBudget}`), { status: 400 });
    }

    // Also run the existing validation for additional checks
    const budgetValidation = await CompletionCalculationService.validateRemainingBudgetIntegrity(normalizedProjectId, manualInvoiceAmount);
    if (!budgetValidation.isValid) {
      console.error(`[REMAINDER_BUDGET] Manual invoice amount validation failed:`, budgetValidation.errors);
      return NextResponse.json(err('INSUFFICIENT_FUNDS', `Cannot create invoice: ${budgetValidation.errors.join(', ')}`), { status: 400 });
    }
    
    // ✅ SAFE: Create invoice using existing infrastructure
    // Generate invoice number using commissioner initials with completion prefix
    let invoiceNumber = `COMP-MAN-C-${normalizedProjectId}-${normalizedTaskId}-${Date.now()}`; // Fallback

    try {
      // Get commissioner data using hierarchical storage
      const commissioner = await UnifiedStorageService.getUserById(project?.commissionerId || 0);

      if (commissioner?.name) {
        // Extract initials from commissioner name
        const initials = commissioner.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('');

        // Get existing invoices to determine next number
        const existingInvoices = await getAllInvoices({ commissionerId: project?.commissionerId });
        const commissionerInvoices = existingInvoices.filter(inv =>
          inv.invoiceNumber.startsWith(initials)
        );

        // Find the highest existing number for this commissioner's initials
        let highestNumber = 0;
        for (const invoice of commissionerInvoices) {
          const numberPart = invoice.invoiceNumber.split('-')[1];
          if (numberPart && /^\d+$/.test(numberPart)) {
            const num = parseInt(numberPart, 10);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }

        const nextNumber = String(highestNumber + 1).padStart(3, '0');
        const baseInvoiceNumber = `${initials}-${nextNumber}`;

        // 🔒 COMPLETION-SPECIFIC: For manual invoices, check if base number already exists for this project
        // If so, add letter suffix (A, B, C, etc.) to make it unique
        const projectInvoices = await getAllInvoices({ projectId: normalizedProjectId });
        const projectManualInvoices = projectInvoices.filter(inv =>
          inv.invoiceType === 'completion_manual' &&
          inv.invoiceNumber.startsWith(baseInvoiceNumber)
        );

        if (projectManualInvoices.length > 0) {
          // Find the highest letter suffix used for this base number in this project
          let highestSuffix = '';
          for (const invoice of projectManualInvoices) {
            const suffixMatch = invoice.invoiceNumber.match(new RegExp(`^${baseInvoiceNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Z]?)$`));
            if (suffixMatch) {
              const suffix = suffixMatch[1] || '';
              if (suffix > highestSuffix) {
                highestSuffix = suffix;
              }
            }
          }

          // Generate next letter suffix
          let nextSuffix = 'A';
          if (highestSuffix) {
            const nextCharCode = highestSuffix.charCodeAt(0) + 1;
            nextSuffix = String.fromCharCode(nextCharCode);
          }

          invoiceNumber = `${baseInvoiceNumber}${nextSuffix}`;
          console.log(`📋 MANUAL INVOICE: Generated invoice number with suffix: ${invoiceNumber} (base: ${baseInvoiceNumber}, suffix: ${nextSuffix})`);
        } else {
          invoiceNumber = baseInvoiceNumber;
        }
        console.log(`📋 MANUAL INVOICE: Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️ MANUAL INVOICE: Could not generate custom invoice number, using fallback:', error);
    }

    const invoice = {
      invoiceNumber,
      projectId: Number(normalizedProjectId), // Convert to number for Invoice type compatibility
      taskId: normalizedTaskId,
      freelancerId,
      commissionerId: project.commissionerId || 0,
      projectTitle: project.title || 'Completion-Based Project',
      totalAmount: manualInvoiceAmount,
      invoiceType: 'completion_manual', // 🔒 COMPLETION-SPECIFIC type
      status: 'sent',
      currency: 'USD',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      createdAt: new Date().toISOString(),
      description: `Manual invoice for task: ${task.title}`,
      taskTitle: task.title,
      milestones: [{
        description: task.title,
        rate: manualInvoiceAmount,
        title: task.title,
        taskId: normalizedTaskId
      }],
      paymentDetails: {
        freelancerAmount: Math.round((manualInvoiceAmount * (1 - 0.052666)) * 100) / 100, // 5.2666% platform fee
        platformFee: Math.round((manualInvoiceAmount * 0.052666) * 100) / 100
      }
    } as any; // Type assertion to handle interface mismatch

    console.log(`[ATOMIC_WRITE][INVOICE] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, invoiceNumber: ${invoiceNumber}, amount: ${manualInvoiceAmount}, path: "hierarchical", ok: "starting" }`);

    // Use hierarchical invoice storage
    const { saveInvoice: saveInvoiceHierarchical } = await import('@/lib/invoice-storage');
    await saveInvoiceHierarchical(invoice);

    console.log(`[ATOMIC_WRITE][INVOICE] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, invoiceNumber: ${invoiceNumber}, amount: ${manualInvoiceAmount}, path: "hierarchical", ok: true }`);

    // Verify the invoice was saved
    const { getInvoiceByNumber } = await import('@/lib/invoice-storage');
    const savedInvoice = await getInvoiceByNumber(invoiceNumber);
    console.log(`[ATOMIC_READBACK][INVOICE] { projectId: ${normalizedProjectId}, taskId: ${normalizedTaskId}, exists: ${!!savedInvoice} }`);
    
    // ✅ SAFE: Log transition using existing infrastructure
    await logInvoiceTransition(invoiceNumber, 'draft', 'sent', freelancerId, Subsystems.INVOICES_CREATE);

    // 🔔 COMPLETION-SPECIFIC: Emit invoice received notification
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');
      await handleCompletionNotification({
        type: 'completion.invoice_received',
        actorId: freelancerId,
        targetId: project.commissionerId || 0,
        projectId: normalizedProjectId,
        context: {
          invoiceNumber: invoice.invoiceNumber,
          amount: manualInvoiceAmount,
          taskId: String(normalizedTaskId),
          taskTitle: task.title
          // freelancerName will be enriched automatically
        }
      });
    } catch (e) {
      console.warn('Completion event emission failed:', e);
    }

    return NextResponse.json(ok({
      entities: {
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          amount: manualInvoiceAmount,
          taskId: normalizedTaskId,
          taskTitle: task.title,
          status: 'sent',
          dueDate: invoice.dueDate
        }
      },
      message: 'Manual invoice created successfully'
    }));
  });
}

// All helper functions removed - now using hierarchical storage services
