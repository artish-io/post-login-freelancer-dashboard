// src/lib/log/transitions.ts
// Observability helper for tracking status transitions across entities
// Provides structured logging for debugging and monitoring

export interface TransitionLog {
  entity: string;
  id: string | number;
  fromStatus: string;
  toStatus: string;
  actorId: string | number;
  timestamp: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a status transition for observability
 * @param entity - Entity type (e.g., 'invoice', 'task', 'project', 'withdrawal')
 * @param id - Entity identifier
 * @param fromStatus - Previous status
 * @param toStatus - New status
 * @param actorId - User who initiated the transition
 * @param subsystem - Subsystem prefix for logging (e.g., 'payments.trigger')
 * @param metadata - Additional context data
 */
export function logTransition(
  entity: string,
  id: string | number,
  fromStatus: string,
  toStatus: string,
  actorId: number | string,
  subsystem: string = 'general',
  metadata?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();

  const logEntry: TransitionLog = {
    entity,
    id,
    fromStatus,
    toStatus,
    actorId,
    timestamp,
    metadata,
  };

  // Structured console logging with subsystem prefix
  console.log(
    `[${subsystem}] ${entity}#${id}: ${fromStatus} -> ${toStatus} by ${actorId} @ ${timestamp}`,
    metadata ? { metadata } : ''
  );

  // In production, this could be extended to:
  // - Send to structured logging service (e.g., DataDog, CloudWatch)
  // - Store in audit log database
  // - Trigger monitoring alerts for critical transitions
  // - Generate metrics for transition success rates
}

/**
 * Subsystem constants for consistent logging
 */
export const Subsystems = {
  PAYMENTS_TRIGGER: 'payments.trigger',
  PAYMENTS_EXECUTE: 'payments.execute',
  PAYMENTS_WITHDRAW: 'withdraw.create',
  PAYMENTS_STOREFRONT: 'storefront.credit',
  TASKS_APPROVE: 'tasks.approve',
  TASKS_SUBMIT: 'tasks.submit',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  GIGS_MATCH: 'gigs.match',
  PROPOSALS_CREATE: 'proposals.create',
  PROPOSALS_ACCEPT: 'proposals.accept',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_UPDATE: 'invoices.update',
  WALLETS_UPDATE: 'wallets.update',
} as const;

/**
 * Log an invoice status transition
 */
export function logInvoiceTransition(
  invoiceNumber: string,
  fromStatus: string,
  toStatus: string,
  actorId: number | string,
  subsystem: string = Subsystems.INVOICES_UPDATE,
  metadata?: {
    projectId?: number;
    amount?: number;
    currency?: string;
    integration?: string;
    transactionId?: string;
  }
): void {
  logTransition('invoice', invoiceNumber, fromStatus, toStatus, actorId, subsystem, metadata);
}

/**
 * Log a task status transition
 */
export function logTaskTransition(
  taskId: number | string,
  fromStatus: string,
  toStatus: string,
  actorId: number | string,
  subsystem: string = Subsystems.TASKS_APPROVE,
  metadata?: {
    projectId?: number;
    taskTitle?: string;
    rejectionReason?: string;
  }
): void {
  logTransition('task', taskId, fromStatus, toStatus, actorId, subsystem, metadata);
}

/**
 * Log a project status transition
 */
export function logProjectTransition(
  projectId: number | string,
  fromStatus: string,
  toStatus: string,
  actorId: number | string,
  subsystem: string = Subsystems.PROJECTS_UPDATE,
  metadata?: {
    projectTitle?: string;
    gigId?: number;
    reason?: string;
  }
): void {
  logTransition('project', projectId, fromStatus, toStatus, actorId, subsystem, metadata);
}

/**
 * Log a withdrawal status transition
 */
export function logWithdrawalTransition(
  withdrawalId: string,
  fromStatus: string,
  toStatus: string,
  actorId: number | string,
  subsystem: string = Subsystems.PAYMENTS_WITHDRAW,
  metadata?: {
    amount?: number;
    currency?: string;
    method?: string;
    reason?: string;
  }
): void {
  logTransition('withdrawal', withdrawalId, fromStatus, toStatus, actorId, subsystem, metadata);
}

/**
 * Log a wallet balance change
 */
export function logWalletChange(
  userId: number,
  userType: 'freelancer' | 'commissioner',
  changeType: 'credit' | 'debit' | 'hold' | 'release',
  amount: number,
  currency: string,
  actorId: number | string,
  subsystem: string = Subsystems.WALLETS_UPDATE,
  metadata?: {
    reason?: string;
    transactionId?: string;
    invoiceNumber?: string;
    withdrawalId?: string;
    previousBalance?: number;
    newBalance?: number;
  }
): void {
  const walletId = `${userType}-${userId}-${currency}`;
  logTransition('wallet', walletId, 'balance_change', changeType, actorId, subsystem, {
    amount,
    currency,
    ...metadata,
  });
}
