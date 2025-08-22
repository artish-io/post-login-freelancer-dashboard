import 'server-only';
import { getAllInvoices } from '@/lib/invoice-storage';

/**
 * Hierarchical invoice storage helpers for completion projects
 * Server-only module for invoice reconciliation and summation
 */

export interface PaidInvoiceSummary {
  totalPaid: number;
  invoiceCount: number;
  invoices: Array<{
    invoiceNumber: string;
    amount: number;
    paidDate: string;
  }>;
}

/**
 * Sum all paid invoices for a given project
 * Used for paidToDate reconciliation
 */
export async function sumPaidInvoicesByProject(projectId: string): Promise<PaidInvoiceSummary> {
  try {
    const allInvoices = await getAllInvoices({ projectId });
    
    const paidInvoices = allInvoices.filter(invoice => 
      invoice.status === 'paid' && 
      invoice.totalAmount && 
      invoice.totalAmount > 0
    );
    
    const totalPaid = paidInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    
    return {
      totalPaid,
      invoiceCount: paidInvoices.length,
      invoices: paidInvoices.map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount || 0,
        paidDate: invoice.paidDate || invoice.updatedAt || invoice.createdAt
      }))
    };
  } catch (error) {
    console.error('Error summing paid invoices:', error);
    return {
      totalPaid: 0,
      invoiceCount: 0,
      invoices: []
    };
  }
}

/**
 * Get all invoices for a project with status filtering
 */
export async function getInvoicesByProjectAndStatus(
  projectId: string, 
  status?: 'draft' | 'sent' | 'paid'
): Promise<any[]> {
  try {
    const allInvoices = await getAllInvoices({ projectId });
    
    if (status) {
      return allInvoices.filter(invoice => invoice.status === status);
    }
    
    return allInvoices;
  } catch (error) {
    console.error('Error getting invoices by project and status:', error);
    return [];
  }
}

/**
 * Check if a task has already been invoiced (excluding drafts)
 */
export async function isTaskAlreadyInvoiced(projectId: string, taskId: number | string): Promise<boolean> {
  try {
    const nonDraftInvoices = await getInvoicesByProjectAndStatus(projectId);
    const paidInvoices = nonDraftInvoices.filter(invoice => invoice.status !== 'draft');
    
    for (const invoice of paidInvoices) {
      if (invoice.milestones) {
        for (const milestone of invoice.milestones) {
          if (milestone.taskId === taskId) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if task is invoiced:', error);
    return false;
  }
}
