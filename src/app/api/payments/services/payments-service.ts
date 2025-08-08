// src/app/api/payments/services/payments-service.ts
// Domain-only payment + wallet logic (no file I/O). Persist results via repos.
// Refactored to consume shared types from ../domain/types

import {
  InvoicingMethod,
  InvoiceLike,
  ProjectLike,
  TaskLike,
  Wallet,
  TransactionRecord,
  Result,
  normalizeTaskStatus,
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
}