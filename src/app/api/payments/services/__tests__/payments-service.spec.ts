// src/app/api/payments/services/__tests__/payments-service.spec.ts
// Unit tests for PaymentsService business logic

import { PaymentsService } from '../payments-service';
import type { InvoiceLike, ProjectLike, TaskLike } from '../../domain/types';

describe('PaymentsService', () => {
  describe('canTriggerPayment', () => {
    const mockProject: ProjectLike = {
      projectId: 1,
      status: 'ongoing',
      invoicingMethod: 'completion',
      commissionerId: 100,
      freelancerId: 200,
    };

    const mockInvoice: InvoiceLike = {
      invoiceNumber: 'INV-001',
      projectId: 1,
      freelancerId: 200,
      commissionerId: 100,
      totalAmount: 1000,
      status: 'sent',
      method: 'completion',
    };

    it('should allow triggering payment for completion method when all tasks are approved', () => {
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Approved', completed: true },
        { id: 2, projectId: 1, status: 'Approved', completed: true },
      ];

      const result = PaymentsService.canTriggerPayment(mockInvoice, mockProject, tasks);
      expect(result.ok).toBe(true);
    });

    it('should reject triggering payment when invoice is already paid', () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' as const };
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Approved', completed: true },
      ];

      const result = PaymentsService.canTriggerPayment(paidInvoice, mockProject, tasks);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('already paid');
    });

    it('should reject triggering payment when invoice status is not sent', () => {
      const processingInvoice = { ...mockInvoice, status: 'processing' as const };
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Approved', completed: true },
      ];

      const result = PaymentsService.canTriggerPayment(processingInvoice, mockProject, tasks);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("must be 'sent'");
    });

    it('should reject triggering payment when not all tasks are approved for completion method', () => {
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Approved', completed: true },
        { id: 2, projectId: 1, status: 'In review', completed: false },
      ];

      const result = PaymentsService.canTriggerPayment(mockInvoice, mockProject, tasks);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('All tasks must be approved');
    });

    it('should allow triggering payment for milestone method regardless of task status', () => {
      const milestoneProject = { ...mockProject, invoicingMethod: 'milestone' as const };
      const milestoneInvoice = { ...mockInvoice, method: 'milestone' as const };
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Ongoing', completed: false },
        { id: 2, projectId: 1, status: 'In review', completed: false },
      ];

      const result = PaymentsService.canTriggerPayment(milestoneInvoice, milestoneProject, tasks);
      expect(result.ok).toBe(true);
    });

    it('should reject triggering payment when invoice and project IDs do not match', () => {
      const mismatchedInvoice = { ...mockInvoice, projectId: 999 };
      const tasks: TaskLike[] = [
        { id: 1, projectId: 1, status: 'Approved', completed: true },
      ];

      const result = PaymentsService.canTriggerPayment(mismatchedInvoice, mockProject, tasks);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Invoice/project mismatch');
    });
  });

  describe('canExecutePayment', () => {
    const mockInvoice: InvoiceLike = {
      invoiceNumber: 'INV-001',
      projectId: 1,
      freelancerId: 200,
      commissionerId: 100,
      totalAmount: 1000,
      status: 'processing',
      method: 'completion',
    };

    it('should allow executing payment when invoice is in processing status', () => {
      const result = PaymentsService.canExecutePayment(mockInvoice, 100);
      expect(result.ok).toBe(true);
    });

    it('should reject executing payment when commissioner does not match', () => {
      const result = PaymentsService.canExecutePayment(mockInvoice, 999);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Unauthorized commissioner');
    });

    it('should reject executing payment when invoice is already paid', () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' as const };
      const result = PaymentsService.canExecutePayment(paidInvoice, 100);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('already paid');
    });

    it('should reject executing payment when invoice is not in processing status', () => {
      const sentInvoice = { ...mockInvoice, status: 'sent' as const };
      const result = PaymentsService.canExecutePayment(sentInvoice, 100);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("must be 'processing'");
    });

    it('should allow executing payment from sent status when allowSent option is true', () => {
      const sentInvoice = { ...mockInvoice, status: 'sent' as const };
      const result = PaymentsService.canExecutePayment(sentInvoice, 100, { allowSent: true });
      expect(result.ok).toBe(true);
    });
  });

  describe('nextInvoiceStatus', () => {
    it('should return processing for trigger phase', () => {
      const status = PaymentsService.nextInvoiceStatus('trigger');
      expect(status).toBe('processing');
    });

    it('should return paid for execute phase', () => {
      const status = PaymentsService.nextInvoiceStatus('execute');
      expect(status).toBe('paid');
    });
  });

  describe('buildTransaction', () => {
    const mockInvoice = {
      invoiceNumber: 'INV-001',
      projectId: 1,
      freelancerId: 200,
      commissionerId: 100,
      totalAmount: 1000,
    };

    it('should build transaction for trigger phase', () => {
      const transaction = PaymentsService.buildTransaction(mockInvoice, 'trigger', 'mock');
      
      expect(transaction.transactionId).toBe('TXN-INV-001');
      expect(transaction.type).toBe('invoice');
      expect(transaction.integration).toBe('mock');
      expect(transaction.status).toBe('processing');
      expect(transaction.amount).toBe(1000);
      expect(transaction.invoiceNumber).toBe('INV-001');
      expect(transaction.projectId).toBe(1);
      expect(transaction.freelancerId).toBe(200);
      expect(transaction.commissionerId).toBe(100);
      expect(transaction.timestamp).toBeDefined();
    });

    it('should build transaction for execute phase', () => {
      const transaction = PaymentsService.buildTransaction(mockInvoice, 'execute', 'stripe');
      
      expect(transaction.status).toBe('paid');
      expect(transaction.integration).toBe('stripe');
    });

    it('should default to mock integration', () => {
      const transaction = PaymentsService.buildTransaction(mockInvoice, 'trigger');
      expect(transaction.integration).toBe('mock');
    });
  });

  describe('creditWallet', () => {
    it('should credit wallet with correct amounts', () => {
      const wallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'USD',
        availableBalance: 500,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 500,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = PaymentsService.creditWallet(wallet, 1000);
      
      expect(result.availableBalance).toBe(1500);
      expect(result.lifetimeEarnings).toBe(1500);
      expect(result.updatedAt).not.toBe(wallet.updatedAt);
    });

    it('should handle multi-currency scenarios', () => {
      const usdWallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'USD',
        availableBalance: 1000,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 1000,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const eurWallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'EUR',
        availableBalance: 800,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 800,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const updatedUsd = PaymentsService.creditWallet(usdWallet, 500);
      const updatedEur = PaymentsService.creditWallet(eurWallet, 200);

      expect(updatedUsd.availableBalance).toBe(1500);
      expect(updatedUsd.currency).toBe('USD');
      expect(updatedEur.availableBalance).toBe(1000);
      expect(updatedEur.currency).toBe('EUR');
    });
  });

  describe('holdWithdrawal', () => {
    it('should hold withdrawal amount from available balance', () => {
      const wallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'USD',
        availableBalance: 1000,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 1000,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = PaymentsService.holdWithdrawal(wallet, 300);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.availableBalance).toBe(700);
        expect(result.data.pendingWithdrawals).toBe(300);
      }
    });

    it('should reject withdrawal when insufficient funds', () => {
      const wallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'USD',
        availableBalance: 100,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 100,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = PaymentsService.holdWithdrawal(wallet, 300);
      
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Insufficient funds');
    });
  });

  describe('finalizeWithdrawal', () => {
    it('should finalize withdrawal by updating totalWithdrawn', () => {
      const wallet = {
        userId: 200,
        userType: 'freelancer' as const,
        currency: 'USD',
        availableBalance: 700,
        pendingWithdrawals: 300,
        totalWithdrawn: 0,
        lifetimeEarnings: 1000,
        holds: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = PaymentsService.finalizeWithdrawal(wallet, 300);
      
      expect(result.pendingWithdrawals).toBe(0);
      expect(result.totalWithdrawn).toBe(300);
      expect(result.availableBalance).toBe(700); // Should remain unchanged
    });
  });
});
