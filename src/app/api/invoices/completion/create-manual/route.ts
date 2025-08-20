import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { logInvoiceTransition, Subsystems } from '@/lib/log/transitions';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing invoice routes

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId: freelancerId } = await requireSession(req);
    const body = await req.json();
    const { projectId, taskId } = sanitizeApiInput(body);
    
    // 🔒 COMPLETION-SPECIFIC: Validate task is approved and unpaid
    const task = await getTaskById(taskId);
    assert(task, 'Task not found', 404);
    assert(task.status === 'Approved', 'Task must be approved', 400);
    assert(task.projectId === projectId, 'Task does not belong to project', 400);
    assert(!task.invoicePaid, 'Task already has paid invoice', 409);
    
    // 🔒 COMPLETION-SPECIFIC: Get project and validate
    const project = await getProjectById(projectId);
    assert(project, 'Project not found', 404);
    assert(project.invoicingMethod === 'completion', 'Project must be completion-based', 400);
    assert(project.freelancerId === freelancerId, 'Unauthorized', 403);
    
    // Check if task already has an invoice
    const existingInvoices = await getInvoicesByTask(taskId);
    if (existingInvoices.length > 0) {
      return NextResponse.json(err('Task already has an invoice', 409), { status: 409 });
    }

    // 🧮 COMPLETION-SPECIFIC: Calculate manual invoice amount - 88% budget divided equally among ALL tasks
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');

    // Get all tasks for this project
    const allTasks = await getTasksByProject(project.projectId);
    const totalTasks = allTasks.length;

    if (totalTasks === 0) {
      return NextResponse.json(err('No tasks found for project', 400), { status: 400 });
    }

    // CORRECT LOGIC: 88% of budget divided equally among ALL tasks (upfront is NOT payment for a task)
    const taskPortionBudget = project.totalBudget * 0.88; // 88% for all tasks
    const amountPerTask = Math.round((taskPortionBudget / totalTasks) * 100) / 100;
    const manualInvoiceAmount = amountPerTask;

    console.log(`[COMPLETION_PAY] Manual invoice calculation for project ${project.projectId}: Total budget: $${project.totalBudget}, Task portion (88%): $${taskPortionBudget}, Total tasks: ${totalTasks}, Amount per task: $${manualInvoiceAmount}`);

    // Validate the calculated amount doesn't exceed remaining budget
    const budgetValidation = await CompletionCalculationService.validateRemainingBudgetIntegrity(project.projectId, manualInvoiceAmount);
    if (!budgetValidation.isValid) {
      console.error(`[REMAINDER_BUDGET] Manual invoice amount validation failed:`, budgetValidation.errors);
      return NextResponse.json(err(`Cannot create invoice: ${budgetValidation.errors.join(', ')}`, 400), { status: 400 });
    }
    
    // ✅ SAFE: Create invoice using existing infrastructure
    // Generate invoice number using commissioner initials (same pattern as upfront payment)
    let invoiceNumber = `COMP-MAN-${projectId}-${taskId}-${Date.now()}`; // Fallback

    try {
      // Get commissioner data using hierarchical storage
      const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
      const commissioner = await UnifiedStorageService.getUserById(project.commissionerId);

      if (commissioner?.name) {
        // Extract initials from commissioner name
        const initials = commissioner.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('');

        // Get existing invoices to determine next number
        const { getAllInvoices } = await import('@/lib/invoice-storage');
        const existingInvoices = await getAllInvoices({ commissionerId: project.commissionerId });
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

        invoiceNumber = `${initials}-${nextNumber}`;
        console.log(`📋 MANUAL INVOICE: Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️ MANUAL INVOICE: Could not generate custom invoice number, using fallback:', error);
    }

    const invoice = {
      invoiceNumber,
      projectId,
      taskId,
      freelancerId,
      commissionerId: project.commissionerId,
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
        taskId: taskId
      }],
      paymentDetails: {
        freelancerAmount: Math.round((manualInvoiceAmount * 0.95) * 100) / 100, // 5% platform fee
        platformFee: Math.round((manualInvoiceAmount * 0.05) * 100) / 100
      }
    };
    
    await saveInvoice(invoice);
    
    // ✅ SAFE: Log transition using existing infrastructure
    await logInvoiceTransition(invoiceNumber, 'draft', 'sent', Subsystems.COMPLETION_INVOICES);
    
    // 🔔 COMPLETION-SPECIFIC: Emit invoice received notification
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');
      await handleCompletionNotification({
        type: 'completion.invoice_received',
        actorId: freelancerId,
        targetId: project.commissionerId,
        projectId,
        context: {
          invoiceNumber: invoice.invoiceNumber,
          amount: manualInvoiceAmount,
          taskId,
          taskTitle: task.title
          // freelancerName will be enriched automatically
        }
      });
    } catch (e) {
      console.warn('Completion event emission failed:', e);
    }
    
    return NextResponse.json(ok({
      invoice: { 
        invoiceNumber: invoice.invoiceNumber, 
        amount: manualInvoiceAmount,
        taskId,
        taskTitle: task.title,
        status: 'sent',
        dueDate: invoice.dueDate
      },
      message: 'Manual invoice created successfully'
    }));
  });
}

// Helper functions - NEW, doesn't modify existing functions
async function getProjectById(projectId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf8');
    const projects = JSON.parse(projectsData);
    
    return projects.find((p: any) => p.projectId === projectId);
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}

async function getTaskById(taskId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');

    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);

    return tasks.find((t: any) => t.id === taskId);
  } catch (error) {
    console.error('Error reading task:', error);
    return null;
  }
}

async function getTasksByProject(projectId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');

    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);

    return tasks.filter((t: any) => t.projectId === projectId);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
}

async function getInvoicesByTask(taskId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
    const invoicesData = await fs.readFile(invoicesPath, 'utf8');
    const invoices = JSON.parse(invoicesData);
    
    return invoices.filter((inv: any) => inv.taskId === taskId);
  } catch (error) {
    console.error('Error reading invoices:', error);
    return [];
  }
}

async function saveInvoice(invoice: any) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
    let invoices = [];
    
    try {
      const invoicesData = await fs.readFile(invoicesPath, 'utf8');
      invoices = JSON.parse(invoicesData);
    } catch (e) {
      // File doesn't exist, start with empty array
    }
    
    const newInvoice = {
      ...invoice,
      id: invoices.length > 0 ? Math.max(...invoices.map((inv: any) => inv.id || 0)) + 1 : 1
    };
    
    invoices.push(newInvoice);
    
    await fs.writeFile(invoicesPath, JSON.stringify(invoices, null, 2));
    
    return newInvoice;
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
}
