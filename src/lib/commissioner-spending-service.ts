/**
 * Unified Commissioner Spending Service
 * 
 * This service provides a single source of truth for all commissioner spending data,
 * ensuring consistent behavior across all commissioner types (not just user 32).
 * 
 * All spending data is derived from the hierarchical invoice storage system.
 */

import { getAllInvoices, type Invoice } from './invoice-storage';
import { parseISO, isWithinInterval, format } from 'date-fns';

export type SpendingTransaction = {
  id: string;
  commissionerId: number;
  freelancerId?: number;
  projectId?: number;
  type: 'freelancer_payout' | 'withdrawal';
  amount: number;
  currency: string;
  date: string;
  description: string;
  projectName?: string;
};

export type SpendingSummary = {
  range: string;
  currentTotal: number;
  lastWeekTotal: number;
  previousTotal: number;
  monthlyGrowthPercent: number;
  dailyBreakdown: Array<{
    date: string;
    amount: number;
  }>;
};

/**
 * Convert paid invoices to spending transactions for a commissioner
 */
export async function getSpendingTransactions(commissionerId: number): Promise<SpendingTransaction[]> {
  const allInvoices = await getAllInvoices({ commissionerId });

  const transactions = allInvoices
    .filter(invoice => invoice.status === 'paid')
    .map(invoice => ({
      id: invoice.invoiceNumber,
      commissionerId: invoice.commissionerId,
      freelancerId: invoice.freelancerId as number,
      projectId: invoice.projectId,
      type: 'freelancer_payout' as const,
      amount: invoice.totalAmount,
      currency: 'USD',
      date: invoice.paidDate || invoice.issueDate,
      description: `Payment for ${invoice.projectTitle}`,
      projectName: invoice.projectTitle
    }));

  // Deduplicate by invoice number (keep the most recent one)
  const uniqueTransactions = new Map<string, SpendingTransaction>();

  transactions.forEach(transaction => {
    const existing = uniqueTransactions.get(transaction.id);
    if (!existing || new Date(transaction.date) > new Date(existing.date)) {
      uniqueTransactions.set(transaction.id, transaction);
    }
  });

  return Array.from(uniqueTransactions.values());
}

/**
 * Get spending transactions within a date range
 */
export function filterTransactionsByDateRange(
  transactions: SpendingTransaction[],
  fromDate: Date,
  toDate: Date
): SpendingTransaction[] {
  return transactions.filter((tx) => {
    const txDate = parseISO(tx.date);
    return isWithinInterval(txDate, { start: fromDate, end: toDate });
  });
}

/**
 * Calculate spending summary for a commissioner
 */
export async function getSpendingSummary(
  commissionerId: number,
  fromDate: Date,
  toDate: Date,
  previousPeriodStart: Date,
  previousPeriodEnd: Date,
  lastWeekStart: Date
): Promise<Omit<SpendingSummary, 'range'>> {
  const allTransactions = await getSpendingTransactions(commissionerId);
  
  // Filter transactions by current date range
  const currentTransactions = filterTransactionsByDateRange(allTransactions, fromDate, toDate);
  const currentTotal = currentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Calculate last week total
  const lastWeekTransactions = filterTransactionsByDateRange(allTransactions, lastWeekStart, toDate);
  const lastWeekTotal = lastWeekTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Calculate previous period total for growth calculation
  const previousTransactions = filterTransactionsByDateRange(allTransactions, previousPeriodStart, previousPeriodEnd);
  const previousTotal = previousTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Calculate growth percentage
  const monthlyGrowthPercent = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : 0;
  
  // Create daily breakdown for chart
  const dailyMap = new Map<string, number>();
  currentTransactions.forEach((tx) => {
    const date = format(parseISO(tx.date), 'yyyy-MM-dd');
    dailyMap.set(date, (dailyMap.get(date) || 0) + tx.amount);
  });
  
  const dailyBreakdown = Array.from(dailyMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }));
  
  return {
    currentTotal: Number(currentTotal.toFixed(2)),
    lastWeekTotal: Number(lastWeekTotal.toFixed(2)),
    previousTotal: Number(previousTotal.toFixed(2)),
    monthlyGrowthPercent: Number(monthlyGrowthPercent.toFixed(2)),
    dailyBreakdown,
  };
}

/**
 * Check if a commissioner has any spending data (paid invoices)
 */
export async function hasSpendingData(commissionerId: number): Promise<boolean> {
  const transactions = await getSpendingTransactions(commissionerId);
  return transactions.length > 0;
}

/**
 * Get all spending transactions for combined history
 */
export async function getSpendingTransactionsForHistory(
  commissionerId: number,
  limit?: number
): Promise<SpendingTransaction[]> {
  const transactions = await getSpendingTransactions(commissionerId);
  
  // Sort by date (newest first)
  const sorted = transactions.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    return dateB.getTime() - dateA.getTime();
  });
  
  return limit ? sorted.slice(0, limit) : sorted;
}
