/**
 * Invoice Status Definitions and Management
 * 
 * This module defines the well-structured invoice status system with clear
 * transitions and business logic for different invoice types.
 */

export type InvoiceStatus = 
  | 'draft'           // Created by freelancer, not yet sent
  | 'sent'            // Sent by freelancer, awaiting commissioner payment
  | 'paid'            // Paid by commissioner (manual or auto)
  | 'on_hold'         // Auto-milestone payment failed, awaiting retry or manual trigger
  | 'cancelled'       // Cancelled by freelancer or system
  | 'overdue';        // Past due date without payment

export type InvoiceType = 
  | 'manual'          // Manually created by freelancer
  | 'auto_milestone'  // Auto-generated for milestone completion
  | 'auto_completion'; // Auto-generated for task completion

export interface InvoiceStatusConfig {
  status: InvoiceStatus;
  label: string;
  description: string;
  visibleToCommissioner: boolean;
  visibleToFreelancer: boolean;
  allowsPayment: boolean;
  allowsEdit: boolean;
  allowsCancel: boolean;
  color: string;
  bgColor: string;
}

/**
 * Complete invoice status configuration
 */
export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, InvoiceStatusConfig> = {
  draft: {
    status: 'draft',
    label: 'Draft',
    description: 'Invoice created but not yet sent to commissioner',
    visibleToCommissioner: false, // Commissioners cannot see draft invoices
    visibleToFreelancer: true,
    allowsPayment: false,
    allowsEdit: true,
    allowsCancel: true,
    color: 'text-gray-800',
    bgColor: 'bg-gray-100'
  },
  sent: {
    status: 'sent',
    label: 'Awaiting Payment',
    description: 'Invoice sent to commissioner, awaiting payment',
    visibleToCommissioner: true,
    visibleToFreelancer: true,
    allowsPayment: true,
    allowsEdit: false,
    allowsCancel: true,
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100'
  },
  paid: {
    status: 'paid',
    label: 'Paid',
    description: 'Invoice has been paid by commissioner',
    visibleToCommissioner: true,
    visibleToFreelancer: true,
    allowsPayment: false,
    allowsEdit: false,
    allowsCancel: false,
    color: 'text-green-800',
    bgColor: 'bg-green-100'
  },
  on_hold: {
    status: 'on_hold',
    label: 'On Hold',
    description: 'Auto-milestone payment failed, awaiting retry or manual trigger',
    visibleToCommissioner: true,
    visibleToFreelancer: true,
    allowsPayment: true, // Can be manually triggered
    allowsEdit: false,
    allowsCancel: true,
    color: 'text-orange-800',
    bgColor: 'bg-orange-100'
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    description: 'Invoice has been cancelled',
    visibleToCommissioner: true,
    visibleToFreelancer: true,
    allowsPayment: false,
    allowsEdit: false,
    allowsCancel: false,
    color: 'text-red-800',
    bgColor: 'bg-red-100'
  },
  overdue: {
    status: 'overdue',
    label: 'Overdue',
    description: 'Invoice is past due date without payment',
    visibleToCommissioner: true,
    visibleToFreelancer: true,
    allowsPayment: true,
    allowsEdit: false,
    allowsCancel: true,
    color: 'text-red-800',
    bgColor: 'bg-red-100'
  }
};

/**
 * Invoice status transition rules
 */
export const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'on_hold', 'cancelled', 'overdue'],
  paid: [], // Terminal state
  on_hold: ['paid', 'sent', 'cancelled'], // Can retry or manual trigger
  cancelled: [], // Terminal state
  overdue: ['paid', 'cancelled']
};

/**
 * Auto-milestone invoice workflow
 */
export interface AutoMilestoneConfig {
  initialStatus: InvoiceStatus;
  autoPaymentEnabled: boolean;
  retryAttempts: number;
  retryDelayDays: number;
  onFailureStatus: InvoiceStatus;
}

export const AUTO_MILESTONE_CONFIG: AutoMilestoneConfig = {
  initialStatus: 'sent', // Auto-milestone invoices start as 'sent'
  autoPaymentEnabled: true,
  retryAttempts: 3,
  retryDelayDays: 2,
  onFailureStatus: 'on_hold'
};

/**
 * Filter invoices by commissioner visibility
 */
export function filterInvoicesForCommissioner(invoices: any[]): any[] {
  return invoices.filter(invoice => {
    const config = INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus];
    return config?.visibleToCommissioner ?? true;
  });
}

/**
 * Filter invoices by freelancer visibility
 */
export function filterInvoicesForFreelancer(invoices: any[]): any[] {
  return invoices.filter(invoice => {
    const config = INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus];
    return config?.visibleToFreelancer ?? true;
  });
}

/**
 * Check if invoice status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: InvoiceStatus, 
  newStatus: InvoiceStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get status configuration for an invoice
 */
export function getInvoiceStatusConfig(status: InvoiceStatus): InvoiceStatusConfig {
  return INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.draft;
}

/**
 * Check if invoice can be paid
 */
export function canPayInvoice(status: InvoiceStatus): boolean {
  return INVOICE_STATUS_CONFIG[status]?.allowsPayment ?? false;
}

/**
 * Check if invoice can be edited
 */
export function canEditInvoice(status: InvoiceStatus): boolean {
  return INVOICE_STATUS_CONFIG[status]?.allowsEdit ?? false;
}

/**
 * Check if invoice can be cancelled
 */
export function canCancelInvoice(status: InvoiceStatus): boolean {
  return INVOICE_STATUS_CONFIG[status]?.allowsCancel ?? false;
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(invoice: any): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return false;
  }
  
  const dueDate = new Date(invoice.dueDate);
  const now = new Date();
  return now > dueDate;
}

/**
 * Auto-update overdue invoices
 */
export function updateOverdueStatus(invoice: any): any {
  if (isInvoiceOverdue(invoice) && invoice.status === 'sent') {
    return {
      ...invoice,
      status: 'overdue',
      updatedAt: new Date().toISOString()
    };
  }
  return invoice;
}

/**
 * Determine initial status for new invoice
 */
export function getInitialInvoiceStatus(
  invoiceType: InvoiceType,
  isAutoGenerated: boolean = false
): InvoiceStatus {
  if (isAutoGenerated) {
    if (invoiceType === 'auto_milestone') {
      return AUTO_MILESTONE_CONFIG.initialStatus; // 'sent'
    }
    if (invoiceType === 'auto_completion') {
      return 'sent'; // Auto-completion invoices are immediately sent
    }
  }
  
  return 'draft'; // Manual invoices start as draft
}
