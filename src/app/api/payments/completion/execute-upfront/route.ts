import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { saveTransaction } from '@/lib/transactions/hierarchical-storage';
import { getInvoiceByNumber, updateInvoice } from '@/app/api/payments/repos/invoices-repo';
import { processMockPayment } from '../../utils/gateways/test-gateway';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err, ErrorCodes } from '@/lib/http/envelope';
import { logInvoiceTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing milestone routes

export async function POST(req: NextRequest) {
  console.log('🚀 UPFRONT PAYMENT: Starting execute-upfront route...');

  try {
    console.log('🔐 UPFRONT PAYMENT: Starting auth check...');
    console.log('🔐 UPFRONT PAYMENT: Starting auth check...');

    console.log('📄 UPFRONT PAYMENT: Parsing request body...');
    const body = await req.json();
    const { projectId } = sanitizeApiInput(body);

    // ✅ SAFE: Reuse auth infrastructure with test bypass
    let actorId: string;
    if (process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true') {
      console.log('🧪 TEST MODE: Bypassing auth for upfront payment testing');
      actorId = body.actorId?.toString() || '34'; // Default test commissioner
      console.log('🧪 TEST MODE: Using test actorId:', actorId);
    } else {
      const { userId } = await requireSession(req);
      actorId = userId;
    }
    console.log('✅ UPFRONT PAYMENT: Auth successful, actorId:', actorId);
    console.log('📊 UPFRONT PAYMENT: Request data:', { projectId, actorId });

    // 🔒 COMPLETION-SPECIFIC: Validate project is completion-based
    console.log('🔍 UPFRONT PAYMENT: Looking up project...');
    const project = await getProjectById(projectId);
    console.log('📋 UPFRONT PAYMENT: Project lookup result:', {
      found: !!project,
      projectId: project?.projectId,
      invoicingMethod: project?.invoicingMethod,
      commissionerId: project?.commissionerId,
      totalBudget: project?.totalBudget
    });

    assert(project, 'Project not found', 404);
    assert(project.invoicingMethod === 'completion', 'Project must be completion-based', 400);
    assert(project.commissionerId === actorId, 'Unauthorized', 403);
    console.log('✅ UPFRONT PAYMENT: Project validation passed');
    
    // 🧮 COMPLETION-SPECIFIC: Calculate 12% upfront (separate from milestone logic)
    console.log('🧮 UPFRONT PAYMENT: Calculating upfront amount...');
    const upfrontAmount = Math.round(project.totalBudget * 0.12 * 100) / 100;
    console.log('💰 UPFRONT PAYMENT: Calculated upfront amount:', upfrontAmount);

    // Check if upfront already paid
    console.log('🔍 UPFRONT PAYMENT: Checking for existing upfront invoices...');
    const existingUpfrontInvoices = await getInvoicesByProject(projectId, 'completion_upfront');
    console.log('📊 UPFRONT PAYMENT: Existing upfront invoices:', {
      count: existingUpfrontInvoices.length,
      invoices: existingUpfrontInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        amount: inv.totalAmount
      }))
    });

    if (existingUpfrontInvoices.length > 0) {
      const existingInvoice = existingUpfrontInvoices[0];
      console.log('⚠️ UPFRONT PAYMENT: Found existing upfront invoice:', {
        invoiceNumber: existingInvoice.invoiceNumber,
        status: existingInvoice.status,
        amount: existingInvoice.totalAmount
      });

      // If already paid, return success
      if (existingInvoice.status === 'paid') {
        console.log('✅ UPFRONT PAYMENT: Upfront already paid, returning success');
        return NextResponse.json(ok({
          message: 'Upfront payment already completed',
          invoice: existingInvoice,
          alreadyPaid: true
        }));
      }

      // If processing, complete the payment
      if (existingInvoice.status === 'processing') {
        console.log('💳 UPFRONT PAYMENT: Processing existing upfront invoice...');
        try {
          // Process payment using existing infrastructure
          const paymentRecord = await processMockPayment({
            invoiceNumber: existingInvoice.invoiceNumber,
            projectId: Number(projectId),
            freelancerId: Number(existingInvoice.freelancerId),
            commissionerId: Number(existingInvoice.commissionerId),
            totalAmount: Number(existingInvoice.totalAmount)
          }, 'execute');

          console.log('✅ UPFRONT PAYMENT: Payment processed:', {
            transactionId: paymentRecord.transactionId,
            status: paymentRecord.status
          });

          // Update invoice status to paid
          const { updateInvoice } = await import('@/lib/invoice-storage');
          await updateInvoice(existingInvoice.invoiceNumber, {
            status: 'paid',
            paidDate: new Date().toISOString().split('T')[0],
            paidAmount: existingInvoice.totalAmount,
            paymentDetails: {
              paymentId: paymentRecord.transactionId,
              paymentMethod: 'mock',
              platformFee: 0,
              freelancerAmount: existingInvoice.totalAmount,
              currency: 'USD',
              processedAt: new Date().toISOString()
            }
          });

          console.log('✅ UPFRONT PAYMENT: Existing invoice processed successfully');
          return NextResponse.json(ok({
            message: 'Upfront payment completed',
            invoice: {
              ...existingInvoice,
              status: 'paid',
              paidDate: new Date().toISOString().split('T')[0]
            },
            payment: paymentRecord
          }));

        } catch (paymentError: any) {
          console.error('❌ UPFRONT PAYMENT: Error processing existing invoice:', paymentError);
          return NextResponse.json(
            err(ErrorCodes.OPERATION_NOT_ALLOWED, `Failed to process existing upfront payment: ${paymentError.message}`, 500),
            { status: 500 }
          );
        }
      }

      // If in any other status, return error
      console.log('❌ UPFRONT PAYMENT: Invalid invoice status for processing:', existingInvoice.status);
      return NextResponse.json(
        err(ErrorCodes.OPERATION_NOT_ALLOWED, `Upfront invoice exists with status '${existingInvoice.status}' - cannot process`, 409),
        { status: 409 }
      );
    }
    
    // ✅ SAFE: Create invoice using existing infrastructure
    console.log('📄 UPFRONT PAYMENT: Creating invoice...');

    // Generate invoice number using commissioner initials with completion prefix
    let invoiceNumber = `COMP-UPF-C-${projectId}-${Date.now()}`; // Fallback

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

        // Get existing COMPLETION invoices to determine next number
        const { getAllInvoices } = await import('@/lib/invoice-storage');
        const existingInvoices = await getAllInvoices({ commissionerId: project.commissionerId });
        const completionInvoices = existingInvoices.filter(inv =>
          inv.invoiceType && (
            inv.invoiceType.includes('completion') ||
            inv.invoiceNumber?.includes('-C')
          )
        );

        // Find the highest existing number for this commissioner's completion invoices
        let highestNumber = 0;
        for (const invoice of completionInvoices) {
          const parts = invoice.invoiceNumber.split('-');
          const numberPart = parts[parts.length - 1]; // Get last part after final dash
          if (numberPart && /^\d+$/.test(numberPart)) {
            const num = parseInt(numberPart, 10);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }

        const nextNumber = String(highestNumber + 1).padStart(3, '0');

        invoiceNumber = `${initials}-C${nextNumber}`;
        console.log(`📋 UPFRONT PAYMENT: Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️ UPFRONT PAYMENT: Could not generate custom invoice number, using fallback:', error);
    }

    const invoice = {
      invoiceNumber,
      projectId,
      freelancerId: project.freelancerId,
      commissionerId: project.commissionerId,
      projectTitle: project.title || 'Completion-Based Project',
      totalAmount: upfrontAmount,
      invoiceType: 'completion_upfront', // 🔒 COMPLETION-SPECIFIC type
      milestoneNumber: 1, // 1 = upfront
      status: 'processing',
      currency: 'USD',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      createdAt: new Date().toISOString(),
      milestones: [{
        description: '12% Upfront Payment',
        rate: upfrontAmount,
        title: '12% Upfront Payment',
        taskId: 'upfront'
      }],
      paymentDetails: {
        freelancerAmount: Math.round((upfrontAmount * 0.95) * 100) / 100, // 5% platform fee
        platformFee: Math.round((upfrontAmount * 0.05) * 100) / 100
      }
    };
    console.log('📋 UPFRONT PAYMENT: Invoice data:', invoice);

    console.log('💾 UPFRONT PAYMENT: Saving invoice...');
    await saveInvoice(invoice);
    console.log('✅ UPFRONT PAYMENT: Invoice saved successfully');
    
    // ✅ SAFE: Process payment using existing gateway
    console.log('💳 UPFRONT PAYMENT: Processing mock payment...');
    const paymentRecord = await processMockPayment({
      invoiceNumber: invoice.invoiceNumber,
      projectId: Number(projectId),
      freelancerId: Number(project.freelancerId),
      commissionerId: Number(project.commissionerId),
      totalAmount: upfrontAmount
    }, 'execute');
    console.log('✅ UPFRONT PAYMENT: Payment processed:', {
      transactionId: paymentRecord.transactionId,
      status: paymentRecord.status
    });

    // ✅ SAFE: Update invoice to paid (using simple update by invoice number)
    console.log('📝 UPFRONT PAYMENT: Updating invoice status to paid...');
    const { updateInvoice } = await import('@/lib/invoice-storage');
    const updateSuccess = await updateInvoice(invoiceNumber, {
      status: 'paid',
      paidDate: new Date().toISOString()
    });

    if (!updateSuccess) {
      console.error('❌ UPFRONT PAYMENT: Failed to update invoice status');
      throw new Error('Failed to update invoice status to paid');
    }
    console.log('✅ UPFRONT PAYMENT: Invoice status updated to paid');
    
    // ✅ SAFE: Update wallet using existing infrastructure
    console.log('💰 UPFRONT PAYMENT: Getting freelancer wallet...');
    const wallet = await getWallet(project.freelancerId, 'freelancer', 'USD');
    console.log('📊 UPFRONT PAYMENT: Wallet lookup result:', {
      walletExists: !!wallet,
      freelancerId: project.freelancerId,
      walletData: wallet
    });

    if (!wallet) {
      console.error('❌ UPFRONT PAYMENT: Freelancer wallet not found');
      throw new Error(`Freelancer wallet not found for freelancerId: ${project.freelancerId}`);
    }

    console.log('📊 UPFRONT PAYMENT: Current wallet balance:', wallet.availableBalance);

    console.log('💰 UPFRONT PAYMENT: Crediting wallet...');
    const updatedWallet = PaymentsService.creditWallet(wallet, upfrontAmount);
    console.log('📊 UPFRONT PAYMENT: New wallet balance:', updatedWallet.availableBalance);

    console.log('💾 UPFRONT PAYMENT: Saving updated wallet...');
    await upsertWallet(updatedWallet);
    console.log('✅ UPFRONT PAYMENT: Wallet updated successfully');

    // ✅ SAFE: Log transaction using hierarchical storage
    console.log('📝 UPFRONT PAYMENT: Building transaction record...');
    const transaction = PaymentsService.buildTransaction({
      invoiceNumber: invoice.invoiceNumber,
      projectId,
      freelancerId: project.freelancerId,
      commissionerId: project.commissionerId,
      totalAmount: upfrontAmount,
    }, 'execute', 'mock');
    console.log('📋 UPFRONT PAYMENT: Transaction record:', {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      status: transaction.status
    });

    console.log('💾 UPFRONT PAYMENT: Saving transaction to hierarchical storage...');
    await saveTransaction(transaction);
    console.log('✅ UPFRONT PAYMENT: Transaction saved successfully to hierarchical storage');
    
    // ✅ SAFE: Log transitions using existing infrastructure
    console.log('📝 UPFRONT PAYMENT: Logging transitions...');
    await logInvoiceTransition(invoiceNumber, 'processing', 'paid', Subsystems.COMPLETION_PAYMENTS);
    await logWalletChange(
      project.freelancerId,
      'freelancer',
      wallet.availableBalance,
      updatedWallet.availableBalance,
      'completion_upfront_payment',
      Subsystems.COMPLETION_PAYMENTS
    );
    console.log('✅ UPFRONT PAYMENT: Transitions logged successfully');

    // 🔔 COMPLETION-SPECIFIC: Emit upfront payment event only (project activation handled separately)
    console.log('🔔 UPFRONT PAYMENT: Emitting completion notification...');
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');
      await handleCompletionNotification({
        type: 'completion.upfront_payment',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          upfrontAmount,
          projectTitle: project.title || 'Project',
          remainingBudget: project.totalBudget * 0.88
          // orgName and freelancerName will be enriched automatically
        }
      });
      console.log('✅ UPFRONT PAYMENT: Completion notification emitted successfully');
    } catch (e) {
      console.warn('⚠️ UPFRONT PAYMENT: Completion event emission failed:', e);
    }

    console.log('🎉 UPFRONT PAYMENT: Preparing success response...');
    const successResponse = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        amount: upfrontAmount,
        status: 'paid'
      },
      transaction: { transactionId: paymentRecord.transactionId },
      wallet: { availableBalance: updatedWallet.availableBalance },
      project: {
        projectId,
        upfrontPaid: true
      }
    };
    console.log('📋 UPFRONT PAYMENT: Success response data:', successResponse);

    console.log('✅ UPFRONT PAYMENT: Returning success response');
    return NextResponse.json(ok(successResponse));

  } catch (error: any) {
    console.error('❌ UPFRONT PAYMENT: Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Return proper error response
    return NextResponse.json(
      err(error.message || 'Internal server error', 500),
      { status: 500 }
    );
  }
}

// Helper functions - NEW, doesn't modify existing functions
async function getProjectById(projectId: string) {
  console.log(`🔍 HELPER: getProjectById called with projectId: ${projectId}`);
  try {
    // Use UnifiedStorageService to read project from hierarchical storage
    console.log('📚 HELPER: Importing UnifiedStorageService...');
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    console.log('📖 HELPER: Calling UnifiedStorageService.readProject...');
    const project = await UnifiedStorageService.readProject(projectId);
    console.log('📋 HELPER: Project lookup result:', {
      found: !!project,
      projectId: project?.projectId,
      invoicingMethod: project?.invoicingMethod
    });
    return project;
  } catch (error) {
    console.error('❌ HELPER: Error reading project:', error);
    return null;
  }
}

async function getInvoicesByProject(projectId: string, invoiceType: string) {
  try {
    // Use the same invoice storage that the match-freelancer route uses
    const { getAllInvoices } = await import('@/lib/invoice-storage');
    const allInvoices = await getAllInvoices();

    return allInvoices.filter((inv: any) =>
      inv.projectId === projectId && inv.invoiceType === invoiceType
    );
  } catch (error) {
    console.error('Error reading invoices:', error);
    return [];
  }
}

async function saveInvoice(invoice: any) {
  try {
    // Use the same invoice storage that the match-freelancer route uses
    const { saveInvoice: saveInvoiceToStorage } = await import('@/lib/invoice-storage');
    return await saveInvoiceToStorage(invoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
}
