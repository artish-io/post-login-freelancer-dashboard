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
  try {
    console.log('[FINAL_PAY_DEBUG] Route called');

    const body = await req.json();
    console.log('[FINAL_PAY_DEBUG] Body parsed:', body);

    const { projectId } = sanitizeApiInput(body);
    console.log('[FINAL_PAY_DEBUG] Project ID:', projectId);

    // 🛡️ CRITICAL GUARD: Validate all tasks are approved and project is completion-based
    const project = await getProjectById(projectId);
    console.log('[FINAL_PAY_DEBUG] Project found:', !!project);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.invoicingMethod !== 'completion') {
      console.error(`[COMPLETION_PAY] GUARD VIOLATION: Attempt to use completion final payment for ${project.invoicingMethod} project ${projectId}`);
      return NextResponse.json({ error: `Project ${projectId} is not completion-based` }, { status: 400 });
    }

    console.log(`[COMPLETION_PAY] Processing final payment for completion project ${projectId} with budget $${project.totalBudget}`);
    
    const tasks = await getTasksByProject(projectId);
    const approvedTasks = tasks.filter((t: any) => t.status === 'Approved');
    assert(approvedTasks.length === tasks.length, 'All tasks must be approved before final payment', 400);
    
    // Check if final payment already processed
    const existingFinalInvoices = await getInvoicesByProject(projectId, 'completion_final');
    if (existingFinalInvoices.length > 0) {
      return NextResponse.json(err('Final payment already processed', 409), { status: 409 });
    }
    
    // ✅ ENHANCED: Calculate remaining amount by checking all existing paid invoices
    const actualRemainingBudget = await calculateActualRemainingBudgetForFinal(projectId, project.totalBudget);
    const finalAmount = Math.round(actualRemainingBudget * 100) / 100;

    // LEGACY: Keep original calculation for comparison/logging
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');
    const legacyFinalAmount = await CompletionCalculationService.calculateRemainingBudget(projectId, project.totalBudget);

    console.log(`[BUDGET_TRACKING] Final payment calculation - Enhanced: $${finalAmount}, Legacy: $${legacyFinalAmount}`);

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
    
    // 🔒 COMPLETION-SPECIFIC: Mark project as completed and update paidToDate
    await updateProjectStatusAndPaidToDate(projectId, 'completed', project.totalBudget);
    
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
      // Get commissioner name for context
      let commissionerName = 'Commissioner';
      try {
        const { getUserById } = await import('../../../../lib/storage/unified-storage-service');
        const commissioner = await getUserById(project.commissionerId);
        if (commissioner && commissioner.name) {
          commissionerName = commissioner.name;
        }
      } catch (userError) {
        console.warn('Could not fetch commissioner name for project completion notification');
      }

      await handleCompletionNotification({
        type: 'completion.project_completed',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          projectTitle: project.title || 'Project',
          commissionerName: commissionerName
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
    
    return NextResponse.json({
      success: true,
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
        finalAmount
      }
    });
  } catch (error) {
    console.error('[FINAL_PAY_DEBUG] Route error:', error);
    return NextResponse.json({
      error: `Final payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * Calculate actual remaining budget by checking all existing paid invoices for the project
 * This ensures accurate budget tracking even if paidToDate is not properly updated
 */
async function calculateActualRemainingBudgetForFinal(projectId: string, totalBudget: number): Promise<number> {
  try {
    // Get all invoices for this project using hierarchical storage
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const allInvoices = await getAllInvoices({ projectId });

    // Calculate total paid amount from all paid invoices
    const totalPaidAmount = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    const remainingBudget = totalBudget - totalPaidAmount;

    console.log(`[BUDGET_TRACKING] Final payment for project ${projectId}: Total budget: $${totalBudget}, Total paid: $${totalPaidAmount}, Remaining: $${remainingBudget}`);

    return Math.max(0, remainingBudget); // Ensure non-negative
  } catch (error) {
    console.error(`[BUDGET_TRACKING] Error calculating remaining budget for final payment of project ${projectId}:`, error);
    // Fallback to original calculation if there's an error
    return totalBudget * 0.88; // Assume only upfront was paid
  }
}

// Helper functions - NEW, doesn't modify existing functions
async function getProjectById(projectId: string) {
  try {
    // ✅ FIXED: Use hierarchical storage instead of flat file
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    return await UnifiedStorageService.readProject(projectId);
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}

async function getTasksByProject(projectId: string) {
  try {
    // ✅ FIXED: Use hierarchical storage instead of flat file
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    return await UnifiedStorageService.getTasksByProject(projectId);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
}

async function getInvoicesByProject(projectId: string, invoiceType: string, status?: string) {
  try {
    // ✅ FIXED: Use hierarchical storage instead of flat file
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const allInvoices = await getAllInvoices({ projectId });

    return allInvoices.filter((inv: any) => {
      const matchesType = inv.invoiceType === invoiceType;
      const matchesStatus = status ? inv.status === status : true;

      return matchesType && matchesStatus;
    });
  } catch (error) {
    console.error('Error reading invoices:', error);
    return [];
  }
}

async function saveInvoice(invoice: any) {
  try {
    // ✅ FIXED: Use hierarchical storage instead of flat file
    const { saveInvoice: saveInvoiceHierarchical } = await import('@/lib/invoice-storage');
    return await saveInvoiceHierarchical(invoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
}

async function updateProjectStatus(projectId: string, status: string) {
  try {
    // ✅ FIXED: Use hierarchical storage instead of flat file
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const project = await UnifiedStorageService.readProject(projectId);

    if (project) {
      const updatedProject = {
        ...project,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      };

      await UnifiedStorageService.writeProject(updatedProject);
    }
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
}

async function updateProjectStatusAndPaidToDate(projectId: string, status: string, totalBudget: number) {
  try {
    // ✅ ENHANCED: Update both status and paidToDate to ensure consistency
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const project = await UnifiedStorageService.readProject(projectId);

    if (project) {
      const updatedProject = {
        ...project,
        status,
        paidToDate: totalBudget, // Set to total budget since project is complete
        completedAt: status === 'completed' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      };

      await UnifiedStorageService.writeProject(updatedProject);
      console.log(`[COMPLETION_PAY] Updated project ${projectId}: status=${status}, paidToDate=${totalBudget}`);
    }
  } catch (error) {
    console.error('Error updating project status and paidToDate:', error);
    throw error;
  }
}
