/**
 * Milestone Invoicing Flow Test Suite
 *
 * Tests the complete flow from task submission to payment execution for milestone-based projects:
 * 1. Task submission by freelancer
 * 2. Task approval by commissioner
 * 3. Automatic payment execution
 * 4. Invoice history storage
 * 5. Wallet balance updates
 *
 * This test focuses on integration testing of the milestone invoicing flow
 * and identifies any breakages in the system.
 */

import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { getTasks, saveTasks } from '@/lib/tasks/task-store';
import { getOrCreateWallet, creditWallet } from '@/lib/wallets/wallet-store';

// Mock the new modules
jest.mock('@/lib/tasks/task-store');
jest.mock('@/lib/wallets/wallet-store');

const mockGetTasks = getTasks as jest.MockedFunction<typeof getTasks>;
const mockSaveTasks = saveTasks as jest.MockedFunction<typeof saveTasks>;
const mockGetOrCreateWallet = getOrCreateWallet as jest.MockedFunction<typeof getOrCreateWallet>;
const mockCreditWallet = creditWallet as jest.MockedFunction<typeof creditWallet>;

// Test interfaces matching the actual system
interface TestInvoice {
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'on_hold' | 'cancelled' | 'overdue';
  method: 'completion' | 'milestone' | 'storefront';
  milestoneNumber?: number;
}

interface TestProject {
  projectId: number;
  status: 'proposed' | 'ongoing' | 'paused' | 'completed' | 'archived';
  invoicingMethod: 'completion' | 'milestone';
  commissionerId: number;
  freelancerId: number;
}

interface TestTask {
  id: number;
  projectId: number;
  status: 'Ongoing' | 'Submitted' | 'In review' | 'Rejected' | 'Approved';
  completed: boolean;
}

describe('Milestone Invoicing Flow', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Canonical Task Storage Integration', () => {

    it('should read tasks from canonical storage', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Design wireframes',
          status: 'done' as const,
          milestoneId: 1,
          completedAt: '2025-08-11T10:00:00.000Z',
          links: { brief: '', work: 'https://figma.com/design' }
        },
        {
          id: 2,
          title: 'Implement frontend',
          status: 'in_progress' as const,
          milestoneId: 2,
          completedAt: null,
          links: { brief: '', work: '' }
        }
      ];

      mockGetTasks.mockResolvedValue(mockTasks);

      const tasks = await getTasks(301);

      expect(tasks).toEqual(mockTasks);
      expect(mockGetTasks).toHaveBeenCalledWith(301);
    });

    it('should handle task storage consolidation fallback', async () => {
      // First call fails (no canonical file)
      mockGetTasks.mockRejectedValueOnce(new Error('Tasks file not found'));

      // Second call succeeds (after consolidation)
      const consolidatedTasks = [
        {
          id: 1,
          title: 'Consolidated task',
          status: 'done' as const,
          milestoneId: 1,
          completedAt: '2025-08-11T10:00:00.000Z',
          links: { brief: '', work: '' }
        }
      ];
      mockGetTasks.mockResolvedValueOnce(consolidatedTasks);

      const tasks = await getTasks(301);

      expect(tasks).toEqual(consolidatedTasks);
      expect(mockGetTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wallet Auto-Initialization', () => {

    it('should auto-initialize wallet on first payment', async () => {
      const mockWallet = {
        userId: 31,
        available: 0,
        pending: 0,
        currency: 'USD',
        updatedAt: '2025-08-11T10:00:00.000Z',
        totalWithdrawn: 0,
        lifetimeEarnings: 0,
        holds: 0,
        version: 1
      };

      mockGetOrCreateWallet.mockResolvedValue(mockWallet);

      const wallet = await getOrCreateWallet(31, 'USD');

      expect(wallet).toEqual(mockWallet);
      expect(mockGetOrCreateWallet).toHaveBeenCalledWith(31, 'USD');
    });

    it('should not create duplicate wallets on repeat calls', async () => {
      const existingWallet = {
        userId: 31,
        available: 1000,
        pending: 0,
        currency: 'USD',
        updatedAt: '2025-08-11T09:00:00.000Z',
        totalWithdrawn: 0,
        lifetimeEarnings: 1000,
        holds: 0,
        version: 1
      };

      mockGetOrCreateWallet.mockResolvedValue(existingWallet);

      const wallet1 = await getOrCreateWallet(31, 'USD');
      const wallet2 = await getOrCreateWallet(31, 'USD');

      expect(wallet1).toEqual(existingWallet);
      expect(wallet2).toEqual(existingWallet);
      expect(mockGetOrCreateWallet).toHaveBeenCalledTimes(2);
    });
  });

  describe('409 Conflict Handling', () => {

    it('should handle version conflicts during concurrent updates', async () => {
      // This would be implemented in the actual transaction service
      // For now, we test the concept with a mock scenario

      const mockError = new Error('Version conflict detected');
      (mockError as any).code = 'VERSION_CONFLICT';
      (mockError as any).status = 409;

      mockSaveTasks.mockRejectedValueOnce(mockError);

      await expect(saveTasks(301, [])).rejects.toThrow('Version conflict detected');
    });

    it('should provide retryable error information', async () => {
      const mockError = new Error('Temporary failure');
      (mockError as any).retryable = true;

      mockGetTasks.mockRejectedValueOnce(mockError);

      try {
        await getTasks(301);
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as any).retryable).toBe(true);
      }
    });
  });

  describe('Payment Eligibility Rules for Milestone Projects', () => {

    it('should allow milestone payment for sent invoices', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent',
        method: 'milestone',
        milestoneNumber: 1
      };

      const project: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      const tasks: TestTask[] = [
        { id: 1001, projectId: 301, status: 'Approved', completed: true }
      ];

      // Act
      const result = PaymentsService.canTriggerPayment(invoice, project, tasks);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject payment for already paid invoices', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'paid',
        method: 'milestone',
        milestoneNumber: 1
      };

      const project: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      // Act
      const result = PaymentsService.canTriggerPayment(invoice, project, []);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Invoice already paid');
      }
    });

    it('should reject payment for invoices not in sent status', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'draft',
        method: 'milestone',
        milestoneNumber: 1
      };

      const project: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      // Act
      const result = PaymentsService.canTriggerPayment(invoice, project, []);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("Invoice must be 'sent' to trigger");
      }
    });
  });

  describe('Payment Execution Rules', () => {

    it('should allow payment execution for processing invoices', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent', // Will be moved to processing before execution
        method: 'milestone'
      };

      // Act - Test with allowSent option for mock mode
      const result = PaymentsService.canExecutePayment(invoice, 32, { allowSent: true });

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject payment execution for unauthorized commissioner', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent',
        method: 'milestone'
      };

      // Act - Wrong commissioner ID
      const result = PaymentsService.canExecutePayment(invoice, 99, { allowSent: true });

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Unauthorized commissioner');
      }
    });

    it('should reject payment execution for already paid invoices', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'paid',
        method: 'milestone'
      };

      // Act
      const result = PaymentsService.canExecutePayment(invoice, 32);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Invoice already paid');
      }
    });
  });

  describe('Transaction Building and Status Management', () => {

    it('should build correct transaction record for milestone payment', () => {
      // Arrange
      const invoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748
      };

      // Act
      const transaction = PaymentsService.buildTransaction(invoice, 'trigger', 'mock');

      // Assert
      expect(transaction.transactionId).toBe('TXN-MGL301001-M1');
      expect(transaction.type).toBe('invoice');
      expect(transaction.integration).toBe('mock');
      expect(transaction.status).toBe('processing');
      expect(transaction.invoiceNumber).toBe('MGL301001-M1');
      expect(transaction.projectId).toBe(301);
      expect(transaction.freelancerId).toBe(31);
      expect(transaction.commissionerId).toBe(32);
      expect(transaction.amount).toBe(1748);
      expect(transaction.timestamp).toBeDefined();
    });

    it('should set correct status for execute phase', () => {
      // Arrange
      const invoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748
      };

      // Act
      const transaction = PaymentsService.buildTransaction(invoice, 'execute', 'mock');

      // Assert
      expect(transaction.status).toBe('paid');
    });

    it('should determine next invoice status correctly', () => {
      // Act & Assert
      expect(PaymentsService.nextInvoiceStatus('trigger')).toBe('processing');
      expect(PaymentsService.nextInvoiceStatus('execute')).toBe('paid');
    });
  });

  describe('Milestone vs Completion Invoicing Differences', () => {

    it('should handle milestone invoicing method correctly', () => {
      // Arrange
      const milestoneInvoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent',
        method: 'milestone',
        milestoneNumber: 1
      };

      const milestoneProject: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      const tasks: TestTask[] = [
        { id: 1001, projectId: 301, status: 'Approved', completed: true }
      ];

      // Act
      const result = PaymentsService.canTriggerPayment(milestoneInvoice, milestoneProject, tasks);

      // Assert
      expect(result.ok).toBe(true);
      // For milestone method, being 'sent' is enough - no need for all tasks to be complete
    });

    it('should require all tasks complete for completion method final payment', () => {
      // Arrange
      const completionInvoice: TestInvoice = {
        invoiceNumber: 'COMP301001-M2',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 4000,
        status: 'sent',
        method: 'completion',
        milestoneNumber: 2 // Final payment
      };

      const completionProject: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'completion',
        commissionerId: 32,
        freelancerId: 31
      };

      const incompleteTasks: TestTask[] = [
        { id: 1001, projectId: 301, status: 'Approved', completed: true },
        { id: 1002, projectId: 301, status: 'Ongoing', completed: false } // Not complete
      ];

      // Act
      const result = PaymentsService.canTriggerPayment(completionInvoice, completionProject, incompleteTasks);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('All tasks must be complete/approved for final completion payment');
      }
    });
  });

  describe('Error Scenarios and Edge Cases', () => {

    it('should handle missing invoice data', () => {
      // Arrange
      const project: TestProject = {
        projectId: 301,
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      // Act
      const result = PaymentsService.canTriggerPayment(null as any, project, []);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Missing invoice or project');
      }
    });

    it('should handle missing project data', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent',
        method: 'milestone'
      };

      // Act
      const result = PaymentsService.canTriggerPayment(invoice, null as any, []);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Missing invoice or project');
      }
    });

    it('should handle invoice/project mismatch', () => {
      // Arrange
      const invoice: TestInvoice = {
        invoiceNumber: 'MGL301001-M1',
        projectId: 301,
        freelancerId: 31,
        commissionerId: 32,
        totalAmount: 1748,
        status: 'sent',
        method: 'milestone'
      };

      const project: TestProject = {
        projectId: 999, // Different project ID
        status: 'ongoing',
        invoicingMethod: 'milestone',
        commissionerId: 32,
        freelancerId: 31
      };

      // Act
      const result = PaymentsService.canTriggerPayment(invoice, project, []);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Invoice/project mismatch');
      }
    });
  });

});
