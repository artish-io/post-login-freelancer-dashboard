// src/app/api/payments/services/payments-service.ts
// Domain-only payment + wallet logic (no file I/O). Persist results via repos.
// Refactored to consume shared types from ../domain/types

import {
  InvoiceLike,
  ProjectLike,
  TaskLike,
  Wallet,
  TransactionRecord,
  Result,
  allTasksEligibleForFinal,
  Integration,
} from '../domain/types';

export type PaymentPhase = 'trigger' | 'execute';

function nowISO() { return new Date().toISOString(); }

function ensure(cond: any, reason: string): asserts cond {
  if (!cond) throw new Error(reason);
}

/**
 * Validate and normalize currency code
 * @param currency - Currency code to validate
 * @param fallback - Fallback currency (default: 'USD')
 * @returns Normalized currency code
 */
export function validateCurrency(currency: string | undefined | null, fallback: string = 'USD'): string {
  if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
    return fallback;
  }
  return currency.trim().toUpperCase();
}

export class PaymentsService {
  // ---------- Eligibility Rules ----------
  static canTriggerPayment(
    invoice: InvoiceLike,
    project: ProjectLike,
    tasks: TaskLike[]
  ): Result {
    if (!invoice || !project) return { ok: false, reason: 'Missing invoice or project' };
    if (invoice.status === 'paid') return { ok: false, reason: 'Invoice already paid' };
    if (invoice.status !== 'sent') return { ok: false, reason: "Invoice must be 'sent' to trigger" };
    if (invoice.projectId !== project.projectId) return { ok: false, reason: 'Invoice/project mismatch' };

    if (project.invoicingMethod === 'completion') {
      // Upfront (milestone 1) is always eligible; final requires all tasks complete/approved
      const isFinal = (invoice.milestoneNumber ?? 2) > 1;
      if (isFinal) {
        const eligible = allTasksEligibleForFinal(tasks, invoice.projectId);
        if (!eligible) return { ok: false, reason: 'All tasks must be complete/approved for final completion payment' };
      }
    } else if (project.invoicingMethod === 'milestone') {
      // For milestone method, being 'sent' is enough (add per-milestone rules here if needed)
    }

    return { ok: true };
  }

  static canExecutePayment(invoice: InvoiceLike, commissionerId: number, opts?: { allowSent?: boolean }): Result {
    if (!invoice) return { ok: false, reason: 'Missing invoice' };
    if (invoice.commissionerId !== commissionerId) return { ok: false, reason: 'Unauthorized commissioner' };
    if (invoice.status === 'paid') return { ok: false, reason: 'Invoice already paid' };

    // Default: require 'processing' (strict), but allow 'sent' in mock mode if configured
    const allowSent = !!opts?.allowSent;
    if (invoice.status !== 'processing' && !(allowSent && invoice.status === 'sent')) {
      return { ok: false, reason: "Invoice must be 'processing' to execute" };
    }
    return { ok: true };
  }

  static nextInvoiceStatus(phase: PaymentPhase): 'processing' | 'paid' {
    return phase === 'trigger' ? 'processing' : 'paid';
  }

  static buildTransaction(
    invoice: Pick<InvoiceLike, 'invoiceNumber' | 'projectId' | 'freelancerId' | 'commissionerId' | 'totalAmount'>,
    phase: PaymentPhase,
    integration: Integration = 'mock'
  ): TransactionRecord {
    return {
      transactionId: `TXN-${invoice.invoiceNumber}`,
      type: 'invoice',
      integration,
      status: phase === 'trigger' ? 'processing' : 'paid',
      invoiceNumber: invoice.invoiceNumber,
      projectId: invoice.projectId,
      freelancerId: invoice.freelancerId,
      commissionerId: invoice.commissionerId,
      amount: invoice.totalAmount,
      timestamp: nowISO(),
    };
  }

  // ---------- Wallet Logic (pure) ----------
  static creditWallet(wallet: Wallet, amount: number): Wallet {
    ensure(amount > 0, 'Amount must be > 0');
    ensure(wallet.currency && wallet.currency.trim().length > 0, 'Wallet must have valid currency');
    const updated: Wallet = { ...wallet };
    updated.availableBalance = Number(updated.availableBalance) + Number(amount);
    updated.lifetimeEarnings = Number(updated.lifetimeEarnings) + Number(amount);
    updated.updatedAt = nowISO();
    return updated;
  }

  static holdWithdrawal(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Withdrawal amount must be > 0' };
    if (wallet.availableBalance < amount) return { ok: false, reason: 'Insufficient available balance' };
    const updated: Wallet = { ...wallet };
    updated.availableBalance = Number(updated.availableBalance) - Number(amount);
    updated.pendingWithdrawals = Number(updated.pendingWithdrawals) + Number(amount);
    updated.updatedAt = nowISO();
    return { ok: true, data: updated };
  }

  static finalizeWithdrawal(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Finalize amount must be > 0' };
    if (wallet.pendingWithdrawals < amount) return { ok: false, reason: 'Insufficient pending withdrawals' };
    const updated: Wallet = { ...wallet };
    updated.pendingWithdrawals = Number(updated.pendingWithdrawals) - Number(amount);
    updated.totalWithdrawn = Number(updated.totalWithdrawn) + Number(amount);
    updated.updatedAt = nowISO();
    return { ok: true, data: updated };
  }

  /**
   * Process invoice payment - executes payment from commissioner to freelancer
   */
  static async processInvoicePayment(params: {
    invoiceNumber: string;
    amount: number;
    commissionerId: number;
    freelancerId: number;
    projectId: string;
    source: string;
    invoiceType?: 'milestone' | 'completion'; // Add this parameter
  }): Promise<{ success: boolean; paymentId?: string; amount?: number; error?: string }> {
    try {
      console.log(`💳 Processing payment:`, {
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        from: `Commissioner ${params.commissionerId}`,
        to: `Freelancer ${params.freelancerId}`,
        project: params.projectId,
        source: params.source,
        invoiceType: params.invoiceType
      });

      // Derive invoiceType from project if not provided
      let actualInvoiceType = params.invoiceType;
      if (!actualInvoiceType) {
        try {
          const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
          const project = await UnifiedStorageService.getProjectById(params.projectId);
          if (project) {
            actualInvoiceType = project.invoicingMethod;
            console.log(`📋 Derived invoiceType from project: ${actualInvoiceType}`);
          }
        } catch (projectError) {
          console.warn('Failed to derive invoiceType from project:', projectError);
        }
      } else {
        // Validate provided invoiceType against project's actual invoicing method
        try {
          const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
          const project = await UnifiedStorageService.getProjectById(params.projectId);
          if (project && project.invoicingMethod !== actualInvoiceType) {
            console.warn(`⚠️ Provided invoiceType '${actualInvoiceType}' mismatches project's actual invoicing method '${project.invoicingMethod}'. Using project's method.`);
            actualInvoiceType = project.invoicingMethod;
          }
        } catch (projectError) {
          console.warn('Failed to validate invoiceType against project:', projectError);
        }
      }

      // Call test gateway to actually process the payment
      const { processMockPayment } = await import('../utils/gateways/test-gateway');

      const mockInvoice = {
        invoiceNumber: params.invoiceNumber,
        projectId: params.projectId, // Keep as string - project IDs can be alphanumeric like "Z-005"
        freelancerId: params.freelancerId,
        commissionerId: params.commissionerId,
        totalAmount: params.amount
      };

      const transaction = await processMockPayment(mockInvoice, 'execute');

      console.log(`✅ Payment processed successfully:`, transaction);

      // Calculate platform fee based on invoice type
      const platformFeeRate = params.invoiceType === 'milestone' ? 0.052666 : 0.05; // 5.2666% for milestone, 5% for completion
      const platformFee = Math.round(params.amount * platformFeeRate * 100) / 100;
      const freelancerAmount = Math.round((params.amount - platformFee) * 100) / 100;

      console.log(`💰 Platform fee calculation for ${params.invoiceType || 'unknown'} invoice:`, {
        totalAmount: params.amount,
        platformFeeRate: `${(platformFeeRate * 100).toFixed(4)}%`,
        platformFee,
        freelancerAmount
      });

      // Update invoice status to 'paid' after successful payment
      const { updateInvoice } = await import('../../../../lib/invoice-storage');
      await updateInvoice(params.invoiceNumber, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paidAmount: params.amount,
        paymentDetails: {
          paymentId: transaction.transactionId,
          paymentMethod: 'mock',
          platformFee: platformFee,
          freelancerAmount: freelancerAmount,
          currency: 'USD',
          processedAt: new Date().toISOString()
        }
      });

      console.log(`📄 Invoice ${params.invoiceNumber} status updated to 'paid'`);

      // Update project's paidToDate field
      try {
        const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
        const project = await UnifiedStorageService.getProjectById(params.projectId);

        if (project) {
          const currentPaidToDate = Number(project.paidToDate) || 0;
          const newPaidToDate = currentPaidToDate + params.amount;

          await UnifiedStorageService.writeProject({
            ...project,
            paidToDate: newPaidToDate,
            updatedAt: new Date().toISOString()
          });

          console.log(`💰 Project ${params.projectId} paidToDate updated: ${currentPaidToDate} -> ${newPaidToDate}`);
        }
      } catch (projectUpdateError) {
        console.error('⚠️ Failed to update project paidToDate:', projectUpdateError);
        // Don't fail the payment if project update fails - log and continue
      }

      // Record transaction in hierarchical storage
      try {
        const { HierarchicalTransactionService } = await import('../../../../lib/storage/hierarchical-transaction-service');

        const paymentTransaction = {
          userId: params.freelancerId,
          type: 'payment' as const,
          amount: freelancerAmount, // Use freelancer amount after platform fee deduction
          currency: 'USD',
          timestamp: new Date().toISOString(),
          status: 'completed' as const,
          invoiceNumber: params.invoiceNumber,
          projectId: params.projectId || 'unknown',
          commissionerId: params.commissionerId || 0,
          freelancerId: params.freelancerId,
          source: 'auto_milestone' as const,
          paymentMethod: 'mock' as const,
          gatewayTransactionId: transaction.transactionId,
          description: `Payment for invoice ${params.invoiceNumber}`,
          platformFee: platformFee, // Track platform fee in transaction
          totalInvoiceAmount: params.amount // Track original invoice amount
        };

        await HierarchicalTransactionService.createPaymentTransaction(paymentTransaction);
        console.log(`💾 Transaction recorded in hierarchical storage: ${paymentTransaction.userId}`);

      } catch (transactionError) {
        console.error('⚠️ Failed to record transaction in hierarchical storage:', transactionError);
        // Don't fail the payment if transaction recording fails - log and continue
      }

      // 🔔 Only emit bus event for milestone-based projects
      if (actualInvoiceType === 'milestone') {
        try {
          const busModule = await import('../../../../lib/events/bus');
          await busModule.emit('invoice.paid', {
            actorId: params.commissionerId,
            targetId: params.freelancerId,
            projectId: params.projectId,
            invoiceNumber: params.invoiceNumber,
            amount: params.amount,
            projectTitle: undefined, // Could be fetched if needed
          });
          console.log(`🔔 Emitted invoice.paid event for milestone project ${params.projectId}`);
        } catch (busError) {
          console.warn('[payments.service] bus emit failed:', busError);
          // Don't fail the payment if bus emission fails
        }
      } else {
        console.log(`ℹ️ Skipping payment notification for ${actualInvoiceType}-based project`);
      }

      return {
        success: true,
        paymentId: transaction.transactionId,
        amount: params.amount
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }
}