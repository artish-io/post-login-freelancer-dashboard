import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { appendTransaction } from '@/app/api/payments/repos/transactions-repo';
import { getInvoiceByNumber, updateInvoice } from '@/app/api/payments/repos/invoices-repo';
import { processMockPayment } from '../../utils/gateways/test-gateway';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { logInvoiceTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing milestone routes

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId: commissionerId } = await requireSession(req);
    const body = await req.json();
    const { invoiceNumber, manualTrigger = true } = sanitizeApiInput(body);

    // 🔍 DIAGNOSTIC: Log manual payment trigger
    console.log(`[EDGE_CASE] Manual payment execution triggered for invoice ${invoiceNumber}, manualTrigger: ${manualTrigger}`);
    
    // 🛡️ MANUAL TRIGGER GUARD: Ensure this is an explicit manual action
    assert(manualTrigger === true, 'Manual trigger flag required for edge-case payouts', 400);

    // ✅ SAFE: Get invoice and validate ownership
    const invoice = await getInvoiceByNumber(invoiceNumber);
    assert(invoice, 'Invoice not found', 404);
    assertOwnership(commissionerId, invoice.commissionerId, 'invoice');
    assert(invoice.invoiceType === 'completion_manual', 'Must be manual completion invoice', 400);
    assert(invoice.status === 'sent', 'Invoice must be in sent status', 400);
    
    // 🔒 COMPLETION-SPECIFIC: Validate project is completion-based
    const project = await getProjectById(invoice.projectId);
    assert(project, 'Project not found', 404);
    assert(project.invoicingMethod === 'completion', 'Project must be completion-based', 400);

    // 🔒 COMPLETION-SPECIFIC: Validate budget integrity before processing payment
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');
    const budgetValidation = await CompletionCalculationService.validateRemainingBudgetIntegrity(
      invoice.projectId,
      Number(invoice.totalAmount)
    );

    if (!budgetValidation.isValid) {
      console.error(`[REMAINDER_BUDGET] Manual payment budget validation failed for project ${invoice.projectId}:`, budgetValidation.errors);
      return NextResponse.json(err(`Budget validation failed: ${budgetValidation.errors.join(', ')}`, 400), { status: 400 });
    }

    console.log(`[REMAINDER_BUDGET] Manual payment validated for project ${invoice.projectId}: $${invoice.totalAmount} from remaining $${budgetValidation.currentRemainingBudget}`);
    console.log(`[EDGE_CASE] Pro-rata manual payout: $${invoice.totalAmount} for task ${invoice.taskId || 'unknown'} with manual trigger`);

    // ✅ SAFE: Process payment using existing infrastructure
    const paymentRecord = await processMockPayment({
      invoiceNumber,
      projectId: Number(invoice.projectId),
      freelancerId: Number(invoice.freelancerId),
      commissionerId: Number(invoice.commissionerId),
      totalAmount: Number(invoice.totalAmount)
    }, 'execute');
    
    // ✅ SAFE: Update invoice status
    await updateInvoice(invoiceNumber, { 
      status: 'paid', 
      paidDate: new Date().toISOString() 
    });
    
    // ✅ SAFE: Update wallet and transaction log
    const wallet = await getWallet(invoice.freelancerId, 'freelancer', 'USD');
    const updatedWallet = PaymentsService.creditWallet(wallet, invoice.totalAmount);
    await upsertWallet(updatedWallet);

    console.log(`[EDGE_CASE] Atomic budget update: wallet credited $${invoice.totalAmount}, new balance: $${updatedWallet.availableBalance}`);

    const transaction = PaymentsService.buildTransaction({
      invoiceNumber,
      projectId: invoice.projectId,
      freelancerId: invoice.freelancerId,
      commissionerId: invoice.commissionerId,
      totalAmount: invoice.totalAmount
    }, 'execute', 'mock');
    await appendTransaction(transaction);

    console.log(`[EDGE_CASE] Transaction recorded with source: manual, amount: $${invoice.totalAmount}`);
    
    // 🔒 COMPLETION-SPECIFIC: Mark task as paid
    if (invoice.taskId) {
      await updateTaskInvoicePaid(invoice.taskId, true);
    }
    
    // ✅ SAFE: Log transitions using existing infrastructure
    await logInvoiceTransition(invoiceNumber, 'sent', 'paid', Subsystems.COMPLETION_PAYMENTS);
    await logWalletChange(
      invoice.freelancerId, 
      'freelancer', 
      wallet.availableBalance, 
      updatedWallet.availableBalance, 
      'completion_manual_payment',
      Subsystems.COMPLETION_PAYMENTS
    );
    
    // 🔔 COMPLETION-SPECIFIC: Emit invoice paid notifications for both freelancer and commissioner
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Get task and project details for notification context
      const { getProjectTaskById } = await import('@/lib/project-tasks-service');
      const { getProjectById } = await import('@/lib/projects-service');

      const task = await getProjectTaskById(invoice.taskId);
      const project = await getProjectById(invoice.projectId);

      // Calculate remaining budget for completion projects
      let remainingBudget = 0;
      if (project) {
        const totalBudget = project.totalBudget || 0;
        const paidToDate = project.paidToDate || 0;
        remainingBudget = Math.max(0, totalBudget - paidToDate - invoice.totalAmount);
      }

      // Validate amount before sending notifications
      const paymentAmount = Number(invoice.totalAmount) || 0;
      if (paymentAmount <= 0) {
        console.warn(`[NOTIFY][WARN] Payment enrichment failed: zero amount for invoice ${invoiceNumber}`);
        return; // Skip notifications for zero amounts
      }

      // Get enriched user data for better notifications
      const { getUserById } = await import('@/lib/storage/unified-storage-service');
      let freelancerName = 'Freelancer';
      let orgName = 'Organization';

      try {
        const freelancer = await getUserById(invoice.freelancerId);
        if (freelancer?.name) {
          freelancerName = freelancer.name;
        }

        const commissioner = await getUserById(commissionerId);
        if (commissioner?.organizationId) {
          const { getAllOrganizations } = await import('@/lib/storage/unified-storage-service');
          const organizations = await getAllOrganizations();
          const organization = organizations.find((org: any) => org.id === commissioner.organizationId);
          if (organization?.name) {
            orgName = organization.name;
          }
        } else if (commissioner?.name) {
          orgName = commissioner.name;
        }
      } catch (enrichError) {
        console.warn('Could not enrich payment notification data:', enrichError);
      }

      // 1. Notification for freelancer (receiving payment)
      await handleCompletionNotification({
        type: 'completion.invoice_paid',
        actorId: commissionerId,
        targetId: invoice.freelancerId,
        projectId: invoice.projectId,
        context: {
          invoiceNumber,
          amount: paymentAmount,
          taskId: invoice.taskId,
          taskTitle: task?.title || 'Task',
          projectTitle: project?.title || 'Project',
          remainingBudget,
          orgName,
          freelancerName
        }
      });

      // 2. Notification for commissioner (payment confirmation)
      await handleCompletionNotification({
        type: 'completion.commissioner_payment',
        actorId: commissionerId,
        targetId: commissionerId, // Self-notification
        projectId: invoice.projectId,
        context: {
          invoiceNumber,
          amount: paymentAmount,
          taskId: invoice.taskId,
          taskTitle: task?.title || 'Task',
          projectTitle: project?.title || 'Project',
          remainingBudget,
          freelancerName,
          orgName
        }
      });
    } catch (e) {
      console.warn('Completion event emission failed:', e);
    }
    
    return NextResponse.json(ok({
      transaction: { transactionId: paymentRecord.transactionId },
      wallet: { availableBalance: updatedWallet.availableBalance },
      invoice: {
        invoiceNumber,
        status: 'paid',
        amount: invoice.totalAmount,
        taskId: invoice.taskId
      },
      message: 'Manual payment executed successfully'
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

async function updateTaskInvoicePaid(taskId: string, invoicePaid: boolean) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);
    
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        invoicePaid,
        paidAt: invoicePaid ? new Date().toISOString() : null
      };
      
      await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
    }
  } catch (error) {
    console.error('Error updating task invoice paid status:', error);
    throw error;
  }
}
