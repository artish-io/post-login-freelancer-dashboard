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
  }): Promise<{ success: boolean; paymentId?: string; amount?: number; error?: string }> {
    try {
      console.log(`💳 Processing payment:`, {
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        from: `Commissioner ${params.commissionerId}`,
        to: `Freelancer ${params.freelancerId}`,
        project: params.projectId,
        source: params.source
      });

      // Call test gateway to actually process the payment
      const { processMockPayment } = await import('../utils/gateways/test-gateway');

      const mockInvoice = {
        invoiceNumber: params.invoiceNumber,
        projectId: parseInt(params.projectId) || 0, // Convert string to number for interface
        freelancerId: params.freelancerId,
        commissionerId: params.commissionerId,
        totalAmount: params.amount
      };

      const transaction = await processMockPayment(mockInvoice, 'execute');

      console.log(`✅ Payment processed successfully:`, transaction);

      // Update invoice status to 'paid' after successful payment
      const { updateInvoice } = await import('../../../../lib/invoice-storage');
      await updateInvoice(params.invoiceNumber, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paidAmount: params.amount,
        paymentDetails: {
          paymentId: transaction.transactionId,
          paymentMethod: 'mock',
          platformFee: 0,
          freelancerAmount: params.amount,
          currency: 'USD',
          processedAt: new Date().toISOString()
        }
      });

      console.log(`📄 Invoice ${params.invoiceNumber} status updated to 'paid'`);

      // Record transaction in hierarchical storage
      try {
        const { HierarchicalTransactionService } = await import('../../../../lib/storage/hierarchical-transaction-service');

        const paymentTransaction = {
          userId: params.freelancerId,
          type: 'payment' as const,
          amount: params.amount,
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
          description: `Payment for invoice ${params.invoiceNumber}`
        };

        await HierarchicalTransactionService.createPaymentTransaction(paymentTransaction);
        console.log(`💾 Transaction recorded in hierarchical storage: ${paymentTransaction.userId}`);

      } catch (transactionError) {
        console.error('⚠️ Failed to record transaction in hierarchical storage:', transactionError);
        // Don't fail the payment if transaction recording fails - log and continue
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