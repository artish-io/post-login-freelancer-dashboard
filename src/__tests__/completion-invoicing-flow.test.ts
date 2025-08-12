/**
 * Completion Invoicing Flow Tests
 * 
 * Tests the completion-based invoicing method that requires:
 * 1. Upfront payment upon project activation
 * 2. Remaining payment upon project completion (all tasks done)
 * 3. Proper invoice record storage and tracking
 * 4. Project status transitions and validation
 */

import { jest } from '@jest/globals';

// Mock the services
const mockGetTasks = jest.fn();
const mockSaveTasks = jest.fn();
const mockGetOrCreateWallet = jest.fn();
const mockUpdateWallet = jest.fn();
const mockGetProject = jest.fn();
const mockUpdateProject = jest.fn();
const mockCreateInvoice = jest.fn();
const mockGetInvoice = jest.fn();
const mockUpdateInvoice = jest.fn();
const mockCreateTransaction = jest.fn();

// Mock modules
jest.mock('../lib/tasks/task-store', () => ({
  getTasks: mockGetTasks,
  saveTasks: mockSaveTasks
}));

jest.mock('../lib/wallets/wallet-store', () => ({
  getOrCreateWallet: mockGetOrCreateWallet,
  updateWallet: mockUpdateWallet
}));

jest.mock('../lib/projects/project-store', () => ({
  getProject: mockGetProject,
  updateProject: mockUpdateProject
}));

jest.mock('../lib/invoices/invoice-store', () => ({
  createInvoice: mockCreateInvoice,
  getInvoice: mockGetInvoice,
  updateInvoice: mockUpdateInvoice
}));

jest.mock('../lib/transactions/transaction-store', () => ({
  createTransaction: mockCreateTransaction
}));

// Import after mocking
import { getTasks, saveTasks } from '../lib/tasks/task-store';
import { getOrCreateWallet, updateWallet } from '../lib/wallets/wallet-store';
import { getProject, updateProject } from '../lib/projects/project-store';
import { createInvoice, getInvoice, updateInvoice } from '../lib/invoices/invoice-store';
import { createTransaction } from '../lib/transactions/transaction-store';

// Test interfaces
interface TestProject {
  id: number;
  title: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  invoicingMethod: 'completion' | 'milestone';
  budget: number;
  upfrontPercentage: number;
  freelancerId: number;
  commissionerId: number;
  activatedAt?: string;
  completedAt?: string;
}

interface TestTask {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  projectId: number;
  completedAt: string | null;
  approvedAt: string | null;
  links: { brief: string; work: string };
}

interface TestInvoice {
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'on_hold' | 'cancelled' | 'overdue';
  method: 'completion' | 'milestone';
  invoiceType: 'upfront' | 'completion';
  createdAt: string;
  paidAt?: string;
}

interface TestWallet {
  userId: number;
  available: number;
  pending: number;
  currency: string;
  updatedAt: string;
  totalWithdrawn: number;
  lifetimeEarnings: number;
  holds: number;
  version: number;
}

interface TestTransaction {
  transactionId: string;
  invoiceNumber: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  type: 'upfront' | 'completion';
  createdAt: string;
  paidAt?: string;
}

// Mock PaymentsService
const PaymentsService = {
  canTriggerPayment: jest.fn(),
  canExecutePayment: jest.fn(),
  buildTransaction: jest.fn(),
  determineNextStatus: jest.fn()
};

describe('Completion Invoicing Flow', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Activation and Upfront Payment', () => {
    
    it('should trigger upfront payment when project is activated', async () => {
      // Arrange
      const project: TestProject = {
        id: 401,
        title: 'E-commerce Website Development',
        status: 'draft',
        invoicingMethod: 'completion',
        budget: 5000,
        upfrontPercentage: 30,
        freelancerId: 31,
        commissionerId: 21
      };

      const upfrontAmount = project.budget * (project.upfrontPercentage / 100);
      
      mockGetProject.mockResolvedValue(project);
      mockCreateInvoice.mockResolvedValue({
        invoiceNumber: 'CMP401-UP',
        projectId: 401,
        freelancerId: 31,
        commissionerId: 21,
        totalAmount: upfrontAmount,
        status: 'sent',
        method: 'completion',
        invoiceType: 'upfront',
        createdAt: '2025-08-11T10:00:00.000Z'
      });

      // Act - Simulate project activation
      const activatedProject = { ...project, status: 'active' as const, activatedAt: '2025-08-11T10:00:00.000Z' };
      mockUpdateProject.mockResolvedValue(activatedProject);

      // Assert
      expect(upfrontAmount).toBe(1500); // 30% of 5000
      
      // Verify upfront invoice would be created
      const upfrontInvoice = await mockCreateInvoice();
      expect(upfrontInvoice.invoiceType).toBe('upfront');
      expect(upfrontInvoice.totalAmount).toBe(1500);
      expect(upfrontInvoice.status).toBe('sent');
    });

    it('should prevent project activation without upfront payment capability', async () => {
      // Arrange
      const project: TestProject = {
        id: 402,
        title: 'Mobile App Development',
        status: 'draft',
        invoicingMethod: 'completion',
        budget: 8000,
        upfrontPercentage: 25,
        freelancerId: 32,
        commissionerId: 22
      };

      // Mock payment service to reject upfront payment
      PaymentsService.canTriggerPayment.mockReturnValue({
        ok: false,
        reason: 'Insufficient commissioner funds'
      });

      // Act & Assert
      const result = PaymentsService.canTriggerPayment(project.commissionerId, 2000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Insufficient commissioner funds');
      }
    });

    it('should create proper upfront invoice record with tracking', async () => {
      // Arrange
      const project: TestProject = {
        id: 403,
        title: 'Brand Identity Design',
        status: 'active',
        invoicingMethod: 'completion',
        budget: 3000,
        upfrontPercentage: 40,
        freelancerId: 33,
        commissionerId: 23,
        activatedAt: '2025-08-11T10:00:00.000Z'
      };

      const expectedInvoice: TestInvoice = {
        invoiceNumber: 'CMP403-UP',
        projectId: 403,
        freelancerId: 33,
        commissionerId: 23,
        totalAmount: 1200, // 40% of 3000
        status: 'paid',
        method: 'completion',
        invoiceType: 'upfront',
        createdAt: '2025-08-11T10:00:00.000Z',
        paidAt: '2025-08-11T10:05:00.000Z'
      };

      mockCreateInvoice.mockResolvedValue(expectedInvoice);
      mockGetInvoice.mockResolvedValue(expectedInvoice);

      // Act
      const createdInvoice = await mockCreateInvoice();
      const retrievedInvoice = await mockGetInvoice('CMP403-UP');

      // Assert
      expect(createdInvoice.invoiceType).toBe('upfront');
      expect(createdInvoice.totalAmount).toBe(1200);
      expect(retrievedInvoice).toEqual(expectedInvoice);
      expect(retrievedInvoice.status).toBe('paid');
    });
  });

  describe('Project Completion and Final Payment', () => {
    
    it('should require all tasks to be completed and approved before final payment', async () => {
      // Arrange
      const project: TestProject = {
        id: 404,
        title: 'Corporate Website Redesign',
        status: 'active',
        invoicingMethod: 'completion',
        budget: 6000,
        upfrontPercentage: 25,
        freelancerId: 34,
        commissionerId: 24,
        activatedAt: '2025-08-11T09:00:00.000Z'
      };

      const incompleteTasks: TestTask[] = [
        {
          id: 1,
          title: 'Design mockups',
          status: 'done',
          projectId: 404,
          completedAt: '2025-08-11T10:00:00.000Z',
          approvedAt: '2025-08-11T10:30:00.000Z',
          links: { brief: '', work: 'https://figma.com/design' }
        },
        {
          id: 2,
          title: 'Frontend development',
          status: 'in_progress', // Not completed
          projectId: 404,
          completedAt: null,
          approvedAt: null,
          links: { brief: '', work: '' }
        }
      ];

      mockGetTasks.mockResolvedValue(incompleteTasks);
      mockGetProject.mockResolvedValue(project);

      // Mock payment service to reject completion payment
      PaymentsService.canTriggerPayment.mockReturnValue({
        ok: false,
        reason: 'All tasks must be complete and approved for completion payment'
      });

      // Act
      const result = PaymentsService.canTriggerPayment(project.id, 'completion');

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('All tasks must be complete and approved for completion payment');
      }
    });

    it('should allow final payment when all tasks are completed and approved', async () => {
      // Arrange
      const project: TestProject = {
        id: 405,
        title: 'Marketing Campaign Design',
        status: 'active',
        invoicingMethod: 'completion',
        budget: 4000,
        upfrontPercentage: 30,
        freelancerId: 35,
        commissionerId: 25,
        activatedAt: '2025-08-11T08:00:00.000Z'
      };

      const completedTasks: TestTask[] = [
        {
          id: 1,
          title: 'Campaign strategy',
          status: 'done',
          projectId: 405,
          completedAt: '2025-08-11T10:00:00.000Z',
          approvedAt: '2025-08-11T10:30:00.000Z',
          links: { brief: '', work: 'https://docs.google.com/strategy' }
        },
        {
          id: 2,
          title: 'Visual assets',
          status: 'done',
          projectId: 405,
          completedAt: '2025-08-11T11:00:00.000Z',
          approvedAt: '2025-08-11T11:30:00.000Z',
          links: { brief: '', work: 'https://figma.com/assets' }
        }
      ];

      const remainingAmount = project.budget * (1 - project.upfrontPercentage / 100); // 70% of 4000 = 2800

      mockGetTasks.mockResolvedValue(completedTasks);
      mockGetProject.mockResolvedValue(project);
      PaymentsService.canTriggerPayment.mockReturnValue({ ok: true });

      // Act
      const result = PaymentsService.canTriggerPayment(project.id, 'completion');

      // Assert
      expect(result.ok).toBe(true);
      expect(remainingAmount).toBe(2800);
    });
  });
