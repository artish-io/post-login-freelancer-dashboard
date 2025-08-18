/**
 * Wallet Data Adapters
 * 
 * Shared utilities for fetching and formatting wallet/earnings data
 * from the invoice storage system (read-only).
 */

import { getAllInvoices } from '../invoice-storage';

export interface EarningsData {
  amount: number;
  currency: string;
  lastUpdated: string | null;
}

export interface WalletSummary {
  range: string;
  totalEarningsCents: number;
  previousTotalCents: number;
  availableBalanceCents: number;
  transactionCount: number;
  lastUpdated: string | null;
  dailyBreakdown: Array<{ date: string; amount: number }>;
}

/**
 * Fetch user earnings from paid invoices (same logic as working earnings card)
 */
export async function fetchUserEarnings(userId: number): Promise<EarningsData> {
  try {
    console.log('🔍 Adapter | Fetching earnings for user:', userId);
    
    // Get all invoices from the storage system
    const invoices = await getAllInvoices();
    
    // Calculate total earnings from paid invoices
    const paidInvoices = invoices.filter((invoice: any) =>
      invoice.freelancerId === userId && invoice.status === 'paid'
    );
    
    console.log('💰 Adapter | Found paid invoices:', paidInvoices.length);
    
    const totalAmount = paidInvoices.reduce((sum: number, invoice: any) => {
      // Use freelancerAmount if available (after platform fees), otherwise use totalAmount
      const amount = invoice.paymentDetails?.freelancerAmount || invoice.totalAmount;
      return sum + amount;
    }, 0);
    
    // Get the most recent payment date
    const lastUpdated = paidInvoices.length > 0
      ? paidInvoices
          .map((inv: any) => inv.paidDate || inv.paymentDetails?.processedAt)
          .filter(Boolean)
          .sort()
          .pop()
      : null;
    
    const result = {
      amount: totalAmount,
      currency: 'USD',
      lastUpdated
    };
    
    console.log('✅ Adapter | Calculated earnings:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Adapter | Error fetching earnings:', error);
    return {
      amount: 0,
      currency: 'USD',
      lastUpdated: null
    };
  }
}

/**
 * Fetch wallet summary with range filtering
 */
export async function fetchWalletSummary(userId: number, range: string = 'month'): Promise<WalletSummary> {
  try {
    console.log('🔍 Adapter | Fetching wallet summary for user:', userId, 'range:', range);

    const earnings = await fetchUserEarnings(userId);

    // Get all invoices to create daily breakdown
    const invoices = await getAllInvoices();
    const userPaidInvoices = invoices.filter((invoice: any) =>
      invoice.freelancerId === userId && invoice.status === 'paid'
    );

    // Create daily breakdown from paid invoices
    const dailyMap = new Map<string, number>();

    userPaidInvoices.forEach((invoice: any) => {
      const paidDate = invoice.paidDate || invoice.paymentDetails?.processedAt || invoice.sentDate;
      if (paidDate) {
        const date = paidDate.split('T')[0]; // Get YYYY-MM-DD format
        const amount = invoice.paymentDetails?.freelancerAmount || invoice.totalAmount;
        dailyMap.set(date, (dailyMap.get(date) || 0) + amount);
      }
    });

    // Convert to array and sort by date
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const result: WalletSummary = {
      range,
      totalEarningsCents: Math.round(earnings.amount * 100), // Convert to cents
      previousTotalCents: 0, // TODO: Implement range-based calculation
      availableBalanceCents: Math.round(earnings.amount * 100), // Same as total for now
      transactionCount: userPaidInvoices.length,
      lastUpdated: earnings.lastUpdated,
      dailyBreakdown
    };

    console.log('✅ Adapter | Wallet summary with', dailyBreakdown.length, 'daily entries:', result);
    return result;

  } catch (error) {
    console.error('❌ Adapter | Error fetching wallet summary:', error);
    return {
      range,
      totalEarningsCents: 0,
      previousTotalCents: 0,
      availableBalanceCents: 0,
      transactionCount: 0,
      lastUpdated: null,
      dailyBreakdown: []
    };
  }
}

/**
 * Convert cents to display amount for CurrencyDisplay component
 */
export function centsToDisplay(cents: number): number {
  return cents / 100;
}

/**
 * Feature flag for wallet ledger reads
 */
export function isWalletLedgerReadsEnabled(): boolean {
  return process.env.WALLET_LEDGER_READS !== 'false';
}
