/**
 * Balance Calculation Service
 * 
 * Provides real-time balance calculation from hierarchical transaction storage.
 * Replaces static wallet balance storage with dynamic calculations.
 */

import {
  BalanceCalculation,
  BalanceVerification,
  TransactionSummary,
  TransactionError,
  TransactionErrorCode
} from '../storage/transaction-schemas';
import { HierarchicalTransactionService } from '../storage/hierarchical-transaction-service';

export class BalanceCalculationService {
  
  /**
   * Calculate real-time balance for a user from all transactions
   */
  static async calculateBalance(userId: number): Promise<BalanceCalculation> {
    try {
      console.log(`💰 Calculating balance for user ${userId}...`);
      
      const balance = await HierarchicalTransactionService.calculateUserBalance(userId);
      
      console.log(`✅ Balance calculated for user ${userId}:`, {
        availableBalance: balance.availableBalance,
        totalPayments: balance.totalPayments,
        totalWithdrawals: balance.totalWithdrawals,
        transactionCount: balance.transactionCount
      });
      
      return balance;
      
    } catch (error) {
      console.error(`❌ Failed to calculate balance for user ${userId}:`, error);
      
      if (error instanceof TransactionError) {
        throw error;
      }
      
      throw new TransactionError(
        `Balance calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.CALCULATION_ERROR,
        undefined,
        userId
      );
    }
  }
  
  /**
   * Calculate earnings only (total payments, excluding withdrawals)
   */
  static async calculateEarnings(userId: number): Promise<number> {
    try {
      console.log(`💵 Calculating earnings for user ${userId}...`);
      
      const balance = await this.calculateBalance(userId);
      const earnings = balance.lifetimeEarnings;
      
      console.log(`✅ Earnings calculated for user ${userId}: $${earnings}`);
      return earnings;
      
    } catch (error) {
      console.error(`❌ Failed to calculate earnings for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get balance for multiple users efficiently
   */
  static async calculateMultipleBalances(userIds: number[]): Promise<Map<number, BalanceCalculation>> {
    const balances = new Map<number, BalanceCalculation>();
    
    console.log(`💰 Calculating balances for ${userIds.length} users...`);
    
    // Calculate balances in parallel for better performance
    const promises = userIds.map(async (userId) => {
      try {
        const balance = await this.calculateBalance(userId);
        return { userId, balance };
      } catch (error) {
        console.error(`Failed to calculate balance for user ${userId}:`, error);
        return { userId, balance: null };
      }
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(({ userId, balance }) => {
      if (balance) {
        balances.set(userId, balance);
      }
    });
    
    console.log(`✅ Calculated balances for ${balances.size}/${userIds.length} users`);
    return balances;
  }
  
  /**
   * Verify balance against stored balance (for migration/audit purposes)
   */
  static async verifyBalance(
    userId: number,
    storedBalance?: number
  ): Promise<BalanceVerification> {
    try {
      console.log(`🔍 Verifying balance for user ${userId}...`);
      
      const calculatedBalance = await this.calculateBalance(userId);
      
      const verification: BalanceVerification = {
        userId,
        calculatedBalance: calculatedBalance.availableBalance,
        storedBalance,
        isAccurate: true,
        lastVerified: new Date().toISOString(),
        transactionsVerified: calculatedBalance.transactionCount
      };
      
      if (storedBalance !== undefined) {
        const discrepancy = Math.abs(calculatedBalance.availableBalance - storedBalance);
        verification.isAccurate = discrepancy < 0.01; // Allow for minor rounding differences
        verification.discrepancy = discrepancy;
        
        if (!verification.isAccurate) {
          console.warn(`⚠️ Balance discrepancy for user ${userId}: calculated=${calculatedBalance.availableBalance}, stored=${storedBalance}, difference=${discrepancy}`);
        }
      }
      
      console.log(`✅ Balance verification completed for user ${userId}: ${verification.isAccurate ? 'ACCURATE' : 'DISCREPANCY'}`);
      return verification;
      
    } catch (error) {
      console.error(`❌ Failed to verify balance for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get transaction summary for a user over a specific period
   */
  static async getTransactionSummary(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<TransactionSummary> {
    try {
      console.log(`📊 Generating transaction summary for user ${userId} from ${startDate} to ${endDate}...`);
      
      // Get transactions for the period
      const transactions = await HierarchicalTransactionService.getTransactionsByUser(userId, {
        startDate,
        endDate
      });
      
      // Calculate balance at start of period
      const balanceAtStart = await this.calculateBalanceAtDate(userId, startDate);
      
      // Calculate current balance
      const currentBalance = await this.calculateBalance(userId);
      
      // Analyze transactions
      let paymentCount = 0;
      let paymentTotal = 0;
      let withdrawalCount = 0;
      let withdrawalTotal = 0;
      
      transactions.forEach(transaction => {
        if (transaction.status === 'completed') {
          if (transaction.type === 'payment') {
            paymentCount++;
            paymentTotal += transaction.amount;
          } else if (transaction.type === 'withdrawal') {
            withdrawalCount++;
            withdrawalTotal += transaction.amount;
          }
        }
      });
      
      const summary: TransactionSummary = {
        userId,
        period: { startDate, endDate },
        payments: {
          count: paymentCount,
          totalAmount: paymentTotal,
          averageAmount: paymentCount > 0 ? paymentTotal / paymentCount : 0
        },
        withdrawals: {
          count: withdrawalCount,
          totalAmount: withdrawalTotal,
          averageAmount: withdrawalCount > 0 ? withdrawalTotal / withdrawalCount : 0
        },
        netChange: paymentTotal - withdrawalTotal,
        balanceAtStart,
        balanceAtEnd: currentBalance.availableBalance
      };
      
      console.log(`✅ Transaction summary generated for user ${userId}:`, {
        payments: summary.payments.count,
        withdrawals: summary.withdrawals.count,
        netChange: summary.netChange
      });
      
      return summary;
      
    } catch (error) {
      console.error(`❌ Failed to generate transaction summary for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate balance at a specific date (for historical analysis)
   */
  static async calculateBalanceAtDate(userId: number, date: string): Promise<number> {
    try {
      // Get all transactions up to the specified date
      const transactions = await HierarchicalTransactionService.getTransactionsByUser(userId, {
        startDate: '2020-01-01', // Start from earliest possible date
        endDate: date
      });
      
      let balance = 0;
      
      transactions.forEach(transaction => {
        if (transaction.status === 'completed') {
          if (transaction.type === 'payment') {
            balance += transaction.amount;
          } else if (transaction.type === 'withdrawal') {
            balance -= transaction.amount;
          }
        }
      });
      
      return balance;
      
    } catch (error) {
      console.error(`❌ Failed to calculate balance at date ${date} for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get pending withdrawals for a user
   */
  static async getPendingWithdrawals(userId: number): Promise<number> {
    try {
      const transactions = await HierarchicalTransactionService.getTransactionsByUser(userId, {
        type: 'withdrawal',
        status: 'pending'
      });
      
      return transactions.reduce((total, transaction) => total + transaction.amount, 0);
      
    } catch (error) {
      console.error(`❌ Failed to get pending withdrawals for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if user has sufficient balance for a withdrawal
   */
  static async hasSufficientBalance(userId: number, amount: number): Promise<boolean> {
    try {
      const balance = await this.calculateBalance(userId);
      const availableForWithdrawal = balance.availableBalance - balance.pendingWithdrawals;
      
      return availableForWithdrawal >= amount;
      
    } catch (error) {
      console.error(`❌ Failed to check sufficient balance for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Get balance trend over time (daily balances for a period)
   */
  static async getBalanceTrend(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; balance: number }>> {
    try {
      const trend: Array<{ date: string; balance: number }> = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Calculate balance for each day in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const balance = await this.calculateBalanceAtDate(userId, dateString);
        trend.push({ date: dateString, balance });
      }
      
      return trend;
      
    } catch (error) {
      console.error(`❌ Failed to get balance trend for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Refresh balance calculation (force recalculation)
   */
  static async refreshBalance(userId: number): Promise<BalanceCalculation> {
    console.log(`🔄 Refreshing balance calculation for user ${userId}...`);
    
    // Simply recalculate - in the future, this could clear any caches
    return await this.calculateBalance(userId);
  }
  
  /**
   * Get system-wide balance statistics
   */
  static async getSystemBalanceStats(): Promise<{
    totalUsers: number;
    totalBalance: number;
    totalPayments: number;
    totalWithdrawals: number;
    averageBalance: number;
  }> {
    try {
      console.log(`📈 Calculating system-wide balance statistics...`);
      
      // This is a simplified implementation - in production, you'd want to optimize this
      // by maintaining aggregate statistics or using a more efficient scanning method
      
      // For now, return placeholder data
      // TODO: Implement efficient system-wide statistics calculation
      
      return {
        totalUsers: 0,
        totalBalance: 0,
        totalPayments: 0,
        totalWithdrawals: 0,
        averageBalance: 0
      };
      
    } catch (error) {
      console.error(`❌ Failed to calculate system balance statistics:`, error);
      throw error;
    }
  }
}
