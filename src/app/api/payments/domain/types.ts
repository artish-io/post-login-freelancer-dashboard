

// src/app/api/payments/domain/types.ts
// Shared domain types & helpers used across payments, projects, and invoices.
// Keep this file dependency-free so routes, repos, and services can import it safely.

/**
 * Currency is intentionally a free-form string to allow multi-currency wallets.
 * Use ISO 4217 codes where possible (e.g., 'USD', 'EUR', 'NGN').
 */
export type Currency = string;

// ---------------- Invoice / Project / Task core enums ----------------
export type InvoiceStatus = 'draft' | 'sent' | 'processing' | 'paid' | 'void';

/**
 * ProjectStatus reflects your JSON structure and UI tabs.
 * Note: `archived` is reserved for future use (e.g., soft-deleted proposals).
 * Completed projects already appear under a "completed" tab via the status navs.
 */
export type ProjectStatus = 'proposed' | 'ongoing' | 'paused' | 'completed' | 'archived';

export type InvoicingMethod = 'completion' | 'milestone';

// NOTE: 'In review' matches hierarchical task storage casing
export type TaskStatus = 'incomplete' | 'In review' | 'complete' | 'approved' | 'rejected';

// ---------------- Payments / Transactions ----------------
export type Integration = 'mock' | 'stripe' | 'paystack' | 'paypal';
export type TxType = 'invoice' | 'store-purchase' | 'withdrawal';
export type TxStatus = 'processing' | 'paid' | 'failed';

// ---------------- Primary records (cross-module DTOs) ----------------
export interface InvoiceLike {
  invoiceNumber: string;
  projectId: string | number; // Support both string (e.g., "Z-005") and number project IDs
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  currency?: Currency;
  status: InvoiceStatus;
  method: InvoicingMethod;
  milestoneNumber?: number; // completion: 1 = upfront; >1 = final; milestone: current index
  issueDate?: string; // ISO
  dueDate?: string;   // ISO
  paidDate?: string;  // ISO
  [key: string]: any;
}

export interface ProjectLike {
  projectId: string | number; // Support both string and number project IDs
  status: ProjectStatus;
  invoicingMethod: InvoicingMethod;
  currency?: Currency;
  commissionerId?: number;
  freelancerId?: number;
  [key: string]: any;
}

export interface TaskLike {
  id: number | string;
  projectId: string | number; // Support both string and number project IDs
  status: TaskStatus;
  completed?: boolean; // some UIs set this flag alongside status
  [key: string]: any;
}

export type UserType = 'freelancer' | 'commissioner';

export interface Wallet {
  userId: number;
  userType: UserType;
  currency: Currency;
  availableBalance: number;
  pendingWithdrawals: number;
  lifetimeEarnings: number;
  totalWithdrawn: number;
  holds: number;
  updatedAt: string; // ISO
}

export interface TransactionRecord {
  transactionId: string;
  type: TxType;
  integration: Integration;
  status: TxStatus;
  amount: number;
  timestamp: string; // ISO
  // Optional linkages
  invoiceNumber?: string;
  projectId?: string | number; // Support both string and number project IDs
  freelancerId?: number;
  commissionerId?: number;
  productId?: string;
  withdrawalId?: string;
  currency?: Currency; // Optional; add if you decide to track per-tx currency
  metadata?: Record<string, unknown>;
}

export type Result<T = void> = { ok: true; data?: T } | { ok: false; reason: string };

// ---------------- Status helpers & guards ----------------
export const INVOICE_STATUS_FLOW: Record<'sent' | 'processing', InvoiceStatus> = {
  sent: 'processing',
  processing: 'paid',
};

export const PROJECT_STATUS_FLOW: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  // Allowed transitions (extend as needed)
  proposed: ['ongoing', 'archived'],
  ongoing: ['paused', 'completed'],
  paused: ['ongoing', 'completed'],
  completed: ['archived'], // UI already shows "completed" tab; archived is optional future
  archived: [],
};

export function isInvoiceStatus(v: any): v is InvoiceStatus {
  return ['draft','sent','processing','paid','void'].includes(String(v));
}

export function isProjectStatus(v: any): v is ProjectStatus {
  return ['proposed','ongoing','paused','completed','archived'].includes(String(v));
}

export function normalizeTaskStatus(s: any): TaskStatus {
  const v = String(s).toLowerCase();
  if (v === 'approved') return 'approved';
  if (v === 'complete' || v === 'completed') return 'complete';
  // Map multiple spellings/cases to canonical data value 'In review'
  if (v === 'awaiting_review' || v === 'awaiting-review' || v === 'review' || v === 'in review') return 'In review';
  if (v === 'rejected' || v === 'failed') return 'rejected';
  return 'incomplete';
}

/**
 * Utility to check final-payment eligibility for completion-based projects.
 * Returns true only if at least one task exists and all are complete/approved.
 */
export function allTasksEligibleForFinal(tasks: TaskLike[], projectId: string | number): boolean {
  const relevant = tasks.filter(t => String(t.projectId) === String(projectId));
  if (relevant.length === 0) return false;
  return relevant.every(t => {
    const st = normalizeTaskStatus(t.status);
    return st === 'complete' || st === 'approved' || t.completed === true;
  });
}