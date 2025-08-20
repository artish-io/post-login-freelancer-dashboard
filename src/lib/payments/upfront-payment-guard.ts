/**
 * Shared Upfront Payment Guard Service
 * 
 * Provides robust, idempotent verification and reconciliation of upfront payments
 * for both completion and milestone invoicing methods.
 * 
 * Features:
 * - Invoice/transaction linking verification
 * - Automatic reconciliation of orphaned transactions
 * - Amount normalization for missing invoice amounts
 * - Idempotent operations safe for retries/HMR
 * - Hierarchical storage only
 */

export interface UpfrontGuardParams {
  projectId: string;
  expectedInvoiceTypes: string[];
  expectedAmount?: number;
  gigBudget?: number;
  upfrontPercentage?: number; // Default: 0.12 (12%)
}

export interface UpfrontGuardResult {
  success: boolean;
  reason?: string;
  invoicesFound: number;
  transactionsFound: number;
  reconciledCount: number;
  normalizedAmounts: number;
}

export class UpfrontPaymentGuard {
  
  /**
   * Main entry point: Ensure upfront payment is verified and reconciled
   */
  static async ensureUpfrontPaidAndReconciled(params: UpfrontGuardParams): Promise<UpfrontGuardResult> {
    console.log('🔍 [ATOMIC] Upfront guard start', {
      projectId: params.projectId,
      types: params.expectedInvoiceTypes,
      expectedAmount: params.expectedAmount
    });

    try {
      // Step 1: Find all paid invoices for the project with expected types
      const paidInvoices = await this.findPaidUpfrontInvoices(params.projectId, params.expectedInvoiceTypes, 0);
      console.log('📄 [ATOMIC] Paid invoices:', paidInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceType: inv.invoiceType,
        amount: inv.totalAmount || inv.amount,
        status: inv.status
      })));

      if (paidInvoices.length === 0) {
        return {
          success: false,
          reason: 'No paid upfront invoices found',
          invoicesFound: 0,
          transactionsFound: 0,
          reconciledCount: 0,
          normalizedAmounts: 0
        };
      }

      // Step 2: Normalize missing amounts
      let normalizedAmounts = 0;
      for (const invoice of paidInvoices) {
        if (!invoice.totalAmount && !invoice.amount) {
          const normalizedAmount = await this.normalizeInvoiceAmount(invoice, params);
          if (normalizedAmount > 0) {
            normalizedAmounts++;
            console.log('💰 [ATOMIC] Normalized invoice amount:', {
              invoiceNumber: invoice.invoiceNumber,
              amount: normalizedAmount
            });
          }
        }
      }

      // Step 3: Find linked transactions
      const linkedTransactions = await this.findLinkedTransactions(paidInvoices);
      console.log('🔗 [ATOMIC] Linked transactions found:', linkedTransactions.length);

      // Step 4: Reconcile orphaned transactions if needed
      let reconciledCount = 0;
      if (linkedTransactions.length < paidInvoices.length) {
        reconciledCount = await this.reconcileOrphanedTransactions(params.projectId, paidInvoices, linkedTransactions);
        console.log('✅ [ATOMIC] Reconciled transactions:', reconciledCount);
      }

      // Step 5: Final verification
      const finalLinkedTransactions = await this.findLinkedTransactions(paidInvoices);
      const success = finalLinkedTransactions.length > 0;

      if (success) {
        console.log('✅ [ATOMIC] Upfront guard passed:', {
          invoices: paidInvoices.length,
          transactions: finalLinkedTransactions.length,
          reconciled: reconciledCount,
          normalized: normalizedAmounts
        });
      } else {
        console.log('❌ [ATOMIC] Upfront guard failed: No linked transactions after reconciliation');
      }

      return {
        success,
        reason: success ? undefined : 'No linked transactions found after reconciliation attempt',
        invoicesFound: paidInvoices.length,
        transactionsFound: finalLinkedTransactions.length,
        reconciledCount,
        normalizedAmounts
      };

    } catch (error: any) {
      console.error('❌ [ATOMIC] Upfront guard error:', error);
      return {
        success: false,
        reason: `Guard error: ${error.message}`,
        invoicesFound: 0,
        transactionsFound: 0,
        reconciledCount: 0,
        normalizedAmounts: 0
      };
    }
  }

  /**
   * Find all paid upfront invoices for a project
   */
  private static async findPaidUpfrontInvoices(projectId: string, expectedTypes: string[], retryCount: number = 0): Promise<any[]> {
    const { getAllInvoices } = await import('../invoice-storage');
    const allInvoices = await getAllInvoices();

    console.log('🔍 [ATOMIC] Debug - All invoices for project:', allInvoices.filter(inv => inv.projectId === projectId).map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      projectId: inv.projectId,
      invoiceType: inv.invoiceType,
      status: inv.status,
      amount: inv.totalAmount || inv.amount
    })));

    const typeMatchingInvoices = allInvoices.filter(inv =>
      inv.projectId === projectId &&
      expectedTypes.includes(inv.invoiceType)
    );

    console.log('🔍 [ATOMIC] Debug - Type matching invoices:', typeMatchingInvoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceType: inv.invoiceType,
      status: inv.status,
      amount: inv.totalAmount || inv.amount
    })));

    const paidInvoices = typeMatchingInvoices.filter(inv => inv.status === 'paid');

    // If no paid invoices found and this is the first attempt, wait a bit and retry
    // This handles potential race conditions where invoice status update hasn't been fully persisted
    if (paidInvoices.length === 0 && retryCount === 0) {
      console.log('🔄 [ATOMIC] No paid invoices found on first attempt, retrying after 500ms...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.findPaidUpfrontInvoices(projectId, expectedTypes, 1);
    }

    // Debug logging for troubleshooting
    if (paidInvoices.length === 0) {
      const projectInvoices = allInvoices.filter(inv => inv.projectId === projectId);
      console.log('🔍 [ATOMIC] Debug - All invoices for project:', projectInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceType: inv.invoiceType,
        status: inv.status,
        amount: inv.totalAmount || inv.amount
      })));

      const typeMatchingInvoices = allInvoices.filter(inv =>
        inv.projectId === projectId && expectedTypes.includes(inv.invoiceType)
      );
      console.log('🔍 [ATOMIC] Debug - Type matching invoices:', typeMatchingInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceType: inv.invoiceType,
        status: inv.status,
        amount: inv.totalAmount || inv.amount
      })));
    }

    return paidInvoices;
  }

  /**
   * Find transactions linked to invoices by invoiceNumber
   */
  private static async findLinkedTransactions(invoices: any[]): Promise<any[]> {
    const { getAllTransactions } = await import('../transactions/hierarchical-storage');
    const allTransactions = await getAllTransactions({ status: 'paid' });

    const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    return allTransactions.filter(tx =>
      invoiceNumbers.includes(tx.invoiceNumber) &&
      tx.status === 'paid'
    );
  }

  /**
   * Reconcile orphaned transactions by linking them to invoices
   */
  private static async reconcileOrphanedTransactions(
    projectId: string,
    invoices: any[],
    alreadyLinked: any[]
  ): Promise<number> {
    const { getAllTransactions, updateTransaction } = await import('../transactions/hierarchical-storage');
    const allTransactions = await getAllTransactions();
    
    const linkedInvoiceNumbers = new Set(alreadyLinked.map(tx => tx.invoiceNumber));
    const unlinkedInvoices = invoices.filter(inv => !linkedInvoiceNumbers.has(inv.invoiceNumber));
    
    if (unlinkedInvoices.length === 0) {
      return 0;
    }

    let reconciledCount = 0;
    
    // Find orphaned transactions by projectId + amount matching
    for (const invoice of unlinkedInvoices) {
      const invoiceAmount = invoice.totalAmount || invoice.amount;
      if (!invoiceAmount) continue;

      // Look for transactions with matching project and amount but no invoiceNumber
      const orphanedTransaction = allTransactions.find(tx =>
        Number(tx.projectId) === Number(projectId.replace(/\D/g, '')) && // Extract numeric part
        Math.abs(tx.amount - invoiceAmount) < 0.01 && // Allow for floating point precision
        tx.status === 'paid' &&
        !tx.invoiceNumber
      );

      if (orphanedTransaction) {
        console.log('🔗 [ATOMIC] Linking transaction to invoiceNumber:', {
          transactionId: orphanedTransaction.transactionId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoiceAmount
        });

        // Link the transaction to the invoice
        await updateTransaction(orphanedTransaction.transactionId, {
          invoiceNumber: invoice.invoiceNumber
        });

        reconciledCount++;
      }
    }

    return reconciledCount;
  }

  /**
   * Normalize missing invoice amount based on project budget
   */
  private static async normalizeInvoiceAmount(invoice: any, params: UpfrontGuardParams): Promise<number> {
    if (!params.gigBudget && !params.expectedAmount) {
      return 0;
    }

    const upfrontPercentage = params.upfrontPercentage || 0.12;
    const normalizedAmount = params.expectedAmount || (params.gigBudget! * upfrontPercentage);
    
    if (normalizedAmount > 0) {
      // Update the invoice with the normalized amount
      const { updateInvoice } = await import('../invoice-storage');
      await updateInvoice(invoice.invoiceNumber, {
        totalAmount: normalizedAmount,
        amount: normalizedAmount
      });
    }

    return normalizedAmount;
  }

  /**
   * Utility: Find transactions by project and type for debugging
   */
  static async findTransactionsByProjectAndType(projectId: string, invoiceType: string): Promise<any[]> {
    const { getAllTransactions } = await import('../transactions/hierarchical-storage');
    const allTransactions = await getAllTransactions();
    
    const numericProjectId = Number(projectId.replace(/\D/g, ''));
    return allTransactions.filter(tx =>
      Number(tx.projectId) === numericProjectId &&
      tx.metadata?.invoiceType === invoiceType
    );
  }

  /**
   * Utility: Find transactions by invoice number
   */
  static async findTransactionsByInvoiceNumber(invoiceNumber: string): Promise<any[]> {
    const { listByInvoiceNumber } = await import('../../app/api/payments/repos/transactions-repo');
    return await listByInvoiceNumber(invoiceNumber);
  }
}
