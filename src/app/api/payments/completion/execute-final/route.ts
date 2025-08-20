import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { appendTransaction } from '@/app/api/payments/repos/transactions-repo';
import { getInvoiceByNumber, updateInvoice } from '@/app/api/payments/repos/invoices-repo';
import { processMockPayment } from '../../utils/gateways/test-gateway';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { logInvoiceTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing milestone routes

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId: actorId } = await requireSession(req);
    const body = await req.json();
    const { projectId } = sanitizeApiInput(body);
    
    // 🛡️ CRITICAL GUARD: Validate all tasks are approved and project is completion-based
    const project = await getProjectById(projectId);
    assert(project, 'Project not found', 404);

    if (project.invoicingMethod !== 'completion') {
      console.error(`[COMPLETION_PAY] GUARD VIOLATION: Attempt to use completion final payment for ${project.invoicingMethod} project ${projectId}`);
      assert(false, `GUARD: Final payment endpoint is for completion projects only. Project ${projectId} is ${project.invoicingMethod}-based`, 400);
    }

    assert(project.commissionerId === actorId, 'Unauthorized', 403);
    console.log(`[COMPLETION_PAY] Processing final payment for completion project ${projectId} with budget $${project.totalBudget}`);
    
    const tasks = await getTasksByProject(projectId);
    const approvedTasks = tasks.filter((t: any) => t.status === 'Approved');
    assert(approvedTasks.length === tasks.length, 'All tasks must be approved before final payment', 400);
    
    // Check if final payment already processed
    const existingFinalInvoices = await getInvoicesByProject(projectId, 'completion_final');
    if (existingFinalInvoices.length > 0) {
      return NextResponse.json(err('Final payment already processed', 409), { status: 409 });
    }
    
    // 🧮 COMPLETION-SPECIFIC: Calculate remaining amount using budget integrity service
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');
    const finalAmount = await CompletionCalculationService.calculateRemainingBudget(projectId, project.totalBudget);

    // 🔒 COMPLETION-SPECIFIC: Validate budget integrity before processing payment
    const budgetValidation = await CompletionCalculationService.validateRemainingBudgetIntegrity(projectId, finalAmount);

    if (!budgetValidation.isValid) {
      console.error(`[REMAINDER_BUDGET] Budget validation failed for project ${projectId}:`, budgetValidation.errors);
      return NextResponse.json(err(`Budget validation failed: ${budgetValidation.errors.join(', ')}`, 400), { status: 400 });
    }

    // Skip if no remaining amount
    if (finalAmount <= 0) {
      // Mark project as completed even if no final payment needed
      await updateProjectStatus(projectId, 'completed');
      console.log(`[COMPLETION_PAY] Project ${projectId} completed with no remaining payment needed`);
      return NextResponse.json(ok({
        message: 'No remaining amount to pay - project marked as completed',
        finalAmount: 0,
        project: { status: 'completed' }
      }));
    }
    
    // ✅ SAFE: Create final invoice and process payment
    // Generate invoice number using commissioner initials (same pattern as other completion invoices)
    let invoiceNumber = `COMP-FIN-${projectId}-${Date.now()}`; // Fallback

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
        console.log(`📋 FINAL PAYMENT: Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️ FINAL PAYMENT: Could not generate custom invoice number, using fallback:', error);
    }

    const invoice = {
      invoiceNumber,
      projectId,
      freelancerId: project.freelancerId,
      commissionerId: project.commissionerId,
      projectTitle: project.title || 'Completion-Based Project',
      totalAmount: finalAmount,
      invoiceType: 'completion_final', // 🔒 COMPLETION-SPECIFIC type
      milestoneNumber: 99, // 99 = final payment
      status: 'processing',
      currency: 'USD',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      createdAt: new Date().toISOString(),
      description: 'Final completion payment (remaining 88%)',
      milestones: [{
        description: 'Final completion payment (remaining 88%)',
        rate: finalAmount,
        title: 'Final Payment',
        taskId: 'final'
      }],
      paymentDetails: {
        freelancerAmount: Math.round((finalAmount * 0.95) * 100) / 100, // 5% platform fee
        platformFee: Math.round((finalAmount * 0.05) * 100) / 100
      }
    };
    
    await saveInvoice(invoice);
    
    // ✅ SAFE: Process payment using existing gateway
    const paymentRecord = await processMockPayment({
      invoiceNumber: invoice.invoiceNumber,
      projectId: Number(projectId),
      freelancerId: Number(project.freelancerId),
      commissionerId: Number(project.commissionerId),
      totalAmount: finalAmount
    }, 'execute');
    
    // ✅ SAFE: Update invoice to paid
    await updateInvoice(invoiceNumber, {
      status: 'paid',
      paidDate: new Date().toISOString()
    });
    
    // ✅ SAFE: Update wallet using existing infrastructure
    const wallet = await getWallet(project.freelancerId, 'freelancer', 'USD');
    const updatedWallet = PaymentsService.creditWallet(wallet, finalAmount);
    await upsertWallet(updatedWallet);
    
    // ✅ SAFE: Log transaction using existing infrastructure
    const transaction = PaymentsService.buildTransaction({
      invoiceNumber: invoice.invoiceNumber,
      projectId,
      freelancerId: project.freelancerId,
      commissionerId: project.commissionerId,
      totalAmount: finalAmount,
    }, 'execute', 'mock');
    await appendTransaction(transaction);
    
    // 🔒 COMPLETION-SPECIFIC: Mark project as completed
    await updateProjectStatus(projectId, 'completed');
    
    // ✅ SAFE: Log transitions using existing infrastructure
    await logInvoiceTransition(invoiceNumber, 'processing', 'paid', Subsystems.COMPLETION_PAYMENTS);
    await logWalletChange(
      project.freelancerId, 
      'freelancer', 
      wallet.availableBalance, 
      updatedWallet.availableBalance, 
      'completion_final_payment',
      Subsystems.COMPLETION_PAYMENTS
    );
    
    // 🔔 COMPLETION-SPECIFIC: Emit three separate events (project completion + final payment + rating prompt)
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // 1. Project completion notification
      await handleCompletionNotification({
        type: 'completion.project_completed',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          projectTitle: project.title || 'Project',
          freelancerName: 'Freelancer' // TODO: Get actual name
        }
      });

      // 2. Final payment notification (if there's an amount to pay)
      if (finalAmount > 0) {
        await handleCompletionNotification({
          type: 'completion.final_payment',
          actorId: project.commissionerId,
          targetId: project.freelancerId,
          projectId,
          context: {
            finalAmount,
            projectTitle: project.title || 'Project',
            finalPercent: Math.round((finalAmount / project.totalBudget) * 100),
            orgName: 'Organization', // TODO: Get actual org name
            freelancerName: 'Freelancer' // TODO: Get actual name
          }
        });
      }

      // 3. Rating prompt notification
      await handleCompletionNotification({
        type: 'completion.rating_prompt',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          projectTitle: project.title || 'Project',
          commissionerName: 'Commissioner', // TODO: Get actual name
          freelancerName: 'Freelancer' // TODO: Get actual name
        }
      });
    } catch (e) {
      console.warn('Completion event emission failed:', e);
    }
    
    return NextResponse.json(ok({
      invoice: { 
        invoiceNumber: invoice.invoiceNumber, 
        amount: finalAmount,
        status: 'paid'
      },
      transaction: { transactionId: paymentRecord.transactionId },
      wallet: { availableBalance: updatedWallet.availableBalance },
      project: { 
        projectId,
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      summary: {
        totalBudget: project.totalBudget,
        upfrontAmount: project.totalBudget * 0.12,
        manualPaymentsTotal,
        finalAmount
      }
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

async function getInvoicesByProject(projectId: string, invoiceType: string, status?: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
    const invoicesData = await fs.readFile(invoicesPath, 'utf8');
    const invoices = JSON.parse(invoicesData);
    
    return invoices.filter((inv: any) => {
      const matchesProject = inv.projectId === projectId;
      const matchesType = inv.invoiceType === invoiceType;
      const matchesStatus = status ? inv.status === status : true;
      
      return matchesProject && matchesType && matchesStatus;
    });
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

async function updateProjectStatus(projectId: string, status: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf8');
    const projects = JSON.parse(projectsData);
    
    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : null
      };
      
      await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2));
    }
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
}
