/**
 * Hierarchical Transaction Service
 * 
 * Core service for managing transactions in hierarchical storage.
 * Replaces flat file storage with organized, scalable structure.
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  BaseTransaction,
  PaymentTransaction,
  WithdrawalTransaction,
  TransactionFilters,
  TransactionMetadata,
  BalanceCalculation,
  TransactionError,
  TransactionErrorCode,
  CreatePaymentTransactionData,
  CreateWithdrawalTransactionData,
  isPaymentTransaction,
  isWithdrawalTransaction,
  validateTransactionId,
  validateAmount,
  validateCurrency
} from './transaction-schemas';
import {
  getTransactionFilePath,
  getTransactionMetadataPath,
  getTransactionDirectoryPath,
  generateTransactionId,
  createTransactionMetadata,
  ensureDirectoryExists,
  transactionFileExists,
  getTransactionDirectoriesInRange
} from './transaction-paths';

export class HierarchicalTransactionService {
  
  /**
   * Save a transaction to hierarchical storage
   */
  static async saveTransaction(transaction: BaseTransaction): Promise<void> {
    try {
      // Validate transaction data
      this.validateTransaction(transaction);
      
      // Check if transaction already exists
      if (await transactionFileExists(transaction)) {
        throw new TransactionError(
          `Transaction ${transaction.transactionId} already exists`,
          TransactionErrorCode.DUPLICATE_TRANSACTION,
          transaction.transactionId,
          transaction.userId
        );
      }
      
      // Ensure directory exists
      const filePath = getTransactionFilePath(transaction);
      const dirPath = path.dirname(filePath);
      await ensureDirectoryExists(dirPath);
      
      // Save transaction file
      await fs.writeFile(filePath, JSON.stringify(transaction, null, 2));
      
      // Save metadata file
      const metadata = createTransactionMetadata(transaction);
      const metadataPath = getTransactionMetadataPath(transaction);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`✅ Transaction saved: ${transaction.transactionId}`);
      
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        `Failed to save transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.STORAGE_ERROR,
        transaction.transactionId,
        transaction.userId
      );
    }
  }
  
  /**
   * Get a transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<BaseTransaction | null> {
    try {
      if (!validateTransactionId(transactionId)) {
        throw new TransactionError(
          `Invalid transaction ID format: ${transactionId}`,
          TransactionErrorCode.VALIDATION_ERROR,
          transactionId
        );
      }
      
      // We need to search for the transaction since we don't know the date
      // This is less efficient but necessary for ID-based lookups
      const transaction = await this.searchTransactionById(transactionId);
      return transaction;
      
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        `Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.STORAGE_ERROR,
        transactionId
      );
    }
  }
  
  /**
   * Get all transactions for a user
   */
  static async getTransactionsByUser(
    userId: number,
    filters?: TransactionFilters
  ): Promise<BaseTransaction[]> {
    try {
      const transactions: BaseTransaction[] = [];
      
      // Determine date range for scanning
      const startDate = filters?.startDate || '2020-01-01';
      const endDate = filters?.endDate || new Date().toISOString().split('T')[0];
      
      // Get all directories in date range
      const directories = getTransactionDirectoriesInRange(startDate, endDate);
      
      // Scan each directory for transactions
      for (const dirPath of directories) {
        try {
          const dirTransactions = await this.scanDirectoryForUserTransactions(dirPath, userId, filters);
          transactions.push(...dirTransactions);
        } catch (error) {
          // Continue scanning other directories if one fails
          console.warn(`Warning: Failed to scan directory ${dirPath}:`, error);
        }
      }
      
      // Sort by timestamp (newest first)
      transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Apply limit and offset
      const limit = filters?.limit || transactions.length;
      const offset = filters?.offset || 0;
      
      return transactions.slice(offset, offset + limit);
      
    } catch (error) {
      throw new TransactionError(
        `Failed to get transactions for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.STORAGE_ERROR,
        undefined,
        userId
      );
    }
  }
  
  /**
   * Calculate balance for a user from all transactions
   */
  static async calculateUserBalance(userId: number): Promise<BalanceCalculation> {
    try {
      const transactions = await this.getTransactionsByUser(userId);
      
      let totalPayments = 0;
      let totalWithdrawals = 0;
      let pendingWithdrawals = 0;
      let lastTransactionDate: string | undefined;
      
      for (const transaction of transactions) {
        if (transaction.status === 'completed') {
          if (isPaymentTransaction(transaction)) {
            totalPayments += transaction.amount;
          } else if (isWithdrawalTransaction(transaction)) {
            totalWithdrawals += transaction.amount;
          }
        } else if (transaction.status === 'pending' && isWithdrawalTransaction(transaction)) {
          pendingWithdrawals += transaction.amount;
        }
        
        // Track most recent transaction
        if (!lastTransactionDate || transaction.timestamp > lastTransactionDate) {
          lastTransactionDate = transaction.timestamp;
        }
      }
      
      const availableBalance = totalPayments - totalWithdrawals;
      
      return {
        userId,
        totalPayments,
        totalWithdrawals,
        availableBalance,
        lifetimeEarnings: totalPayments, // Same as totalPayments for business logic clarity
        pendingWithdrawals,
        lastCalculated: new Date().toISOString(),
        transactionCount: transactions.length,
        lastTransactionDate
      };
      
    } catch (error) {
      throw new TransactionError(
        `Failed to calculate balance for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.CALCULATION_ERROR,
        undefined,
        userId
      );
    }
  }
  
  /**
   * Create a new payment transaction
   */
  static async createPaymentTransaction(data: CreatePaymentTransactionData): Promise<PaymentTransaction> {
    const now = new Date().toISOString();
    const transactionId = generateTransactionId('payment', data.invoiceNumber, data.timestamp);
    
    const transaction: PaymentTransaction = {
      ...data,
      transactionId,
      createdAt: now,
      updatedAt: now
    };
    
    await this.saveTransaction(transaction);
    return transaction;
  }
  
  /**
   * Create a new withdrawal transaction
   */
  static async createWithdrawalTransaction(data: CreateWithdrawalTransactionData): Promise<WithdrawalTransaction> {
    const now = new Date().toISOString();
    const transactionId = generateTransactionId('withdrawal', data.withdrawalMethodId, data.timestamp);
    
    const transaction: WithdrawalTransaction = {
      ...data,
      transactionId,
      createdAt: now,
      updatedAt: now
    };
    
    await this.saveTransaction(transaction);
    return transaction;
  }
  
  /**
   * Update an existing transaction
   */
  static async updateTransaction(
    transactionId: string,
    updates: Partial<BaseTransaction>
  ): Promise<BaseTransaction> {
    try {
      const existingTransaction = await this.getTransactionById(transactionId);
      if (!existingTransaction) {
        throw new TransactionError(
          `Transaction not found: ${transactionId}`,
          TransactionErrorCode.TRANSACTION_NOT_FOUND,
          transactionId
        );
      }
      
      const updatedTransaction = {
        ...existingTransaction,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Validate updated transaction
      this.validateTransaction(updatedTransaction);
      
      // Save updated transaction
      const filePath = getTransactionFilePath(updatedTransaction);
      await fs.writeFile(filePath, JSON.stringify(updatedTransaction, null, 2));
      
      console.log(`✅ Transaction updated: ${transactionId}`);
      return updatedTransaction;
      
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        `Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.STORAGE_ERROR,
        transactionId
      );
    }
  }
  
  /**
   * Delete a transaction (use with caution)
   */
  static async deleteTransaction(transactionId: string): Promise<void> {
    try {
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction) {
        throw new TransactionError(
          `Transaction not found: ${transactionId}`,
          TransactionErrorCode.TRANSACTION_NOT_FOUND,
          transactionId
        );
      }
      
      // Delete transaction file
      const filePath = getTransactionFilePath(transaction);
      await fs.unlink(filePath);
      
      // Delete metadata file
      const metadataPath = getTransactionMetadataPath(transaction);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist, continue
      }
      
      // Try to remove empty directory
      const dirPath = path.dirname(filePath);
      try {
        await fs.rmdir(dirPath);
      } catch {
        // Directory might not be empty, that's okay
      }
      
      console.log(`✅ Transaction deleted: ${transactionId}`);
      
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        `Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TransactionErrorCode.STORAGE_ERROR,
        transactionId
      );
    }
  }
  
  // Private helper methods
  
  private static validateTransaction(transaction: BaseTransaction): void {
    if (!validateTransactionId(transaction.transactionId)) {
      throw new TransactionError(
        `Invalid transaction ID: ${transaction.transactionId}`,
        TransactionErrorCode.VALIDATION_ERROR,
        transaction.transactionId,
        transaction.userId
      );
    }
    
    if (!validateAmount(transaction.amount)) {
      throw new TransactionError(
        `Invalid amount: ${transaction.amount}`,
        TransactionErrorCode.VALIDATION_ERROR,
        transaction.transactionId,
        transaction.userId
      );
    }
    
    if (!validateCurrency(transaction.currency)) {
      throw new TransactionError(
        `Invalid currency: ${transaction.currency}`,
        TransactionErrorCode.VALIDATION_ERROR,
        transaction.transactionId,
        transaction.userId
      );
    }
    
    if (!transaction.userId || typeof transaction.userId !== 'number') {
      throw new TransactionError(
        `Invalid user ID: ${transaction.userId}`,
        TransactionErrorCode.VALIDATION_ERROR,
        transaction.transactionId,
        transaction.userId
      );
    }
  }
  
  private static async searchTransactionById(transactionId: string): Promise<BaseTransaction | null> {
    // This is a brute force search - in production, consider indexing
    const startDate = '2020-01-01';
    const endDate = new Date().toISOString().split('T')[0];
    const directories = getTransactionDirectoriesInRange(startDate, endDate);
    
    for (const dirPath of directories) {
      try {
        const transaction = await this.findTransactionInDirectory(dirPath, transactionId);
        if (transaction) {
          return transaction;
        }
      } catch {
        // Continue searching other directories
      }
    }
    
    return null;
  }
  
  private static async findTransactionInDirectory(
    dirPath: string,
    transactionId: string
  ): Promise<BaseTransaction | null> {
    try {
      const transactionDir = path.join(dirPath, transactionId);
      
      // Try payment file first
      try {
        const paymentFile = path.join(transactionDir, 'payment.json');
        const data = await fs.readFile(paymentFile, 'utf-8');
        return JSON.parse(data) as PaymentTransaction;
      } catch {
        // Try withdrawal file
        const withdrawalFile = path.join(transactionDir, 'withdrawal.json');
        const data = await fs.readFile(withdrawalFile, 'utf-8');
        return JSON.parse(data) as WithdrawalTransaction;
      }
    } catch {
      return null;
    }
  }
  
  private static async scanDirectoryForUserTransactions(
    dirPath: string,
    userId: number,
    filters?: TransactionFilters
  ): Promise<BaseTransaction[]> {
    const transactions: BaseTransaction[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const transactionDir = path.join(dirPath, entry.name);
          const transaction = await this.loadTransactionFromDirectory(transactionDir);
          
          if (transaction && transaction.userId === userId) {
            // Apply filters
            if (this.matchesFilters(transaction, filters)) {
              transactions.push(transaction);
            }
          }
        }
      }
    } catch {
      // Directory might not exist, return empty array
    }
    
    return transactions;
  }
  
  private static async loadTransactionFromDirectory(dirPath: string): Promise<BaseTransaction | null> {
    try {
      // Try payment file first
      const paymentFile = path.join(dirPath, 'payment.json');
      try {
        const data = await fs.readFile(paymentFile, 'utf-8');
        return JSON.parse(data) as PaymentTransaction;
      } catch {
        // Try withdrawal file
        const withdrawalFile = path.join(dirPath, 'withdrawal.json');
        const data = await fs.readFile(withdrawalFile, 'utf-8');
        return JSON.parse(data) as WithdrawalTransaction;
      }
    } catch {
      return null;
    }
  }
  
  private static matchesFilters(transaction: BaseTransaction, filters?: TransactionFilters): boolean {
    if (!filters) return true;
    
    if (filters.type && transaction.type !== filters.type) return false;
    if (filters.status && transaction.status !== filters.status) return false;
    if (filters.minAmount && transaction.amount < filters.minAmount) return false;
    if (filters.maxAmount && transaction.amount > filters.maxAmount) return false;
    
    if (filters.startDate && transaction.timestamp < filters.startDate) return false;
    if (filters.endDate && transaction.timestamp > filters.endDate) return false;
    
    if (isPaymentTransaction(transaction)) {
      if (filters.projectId && transaction.projectId !== filters.projectId) return false;
      if (filters.invoiceNumber && transaction.invoiceNumber !== filters.invoiceNumber) return false;
      if (filters.paymentMethod && transaction.paymentMethod !== filters.paymentMethod) return false;
      if (filters.source && transaction.source !== filters.source) return false;
    }
    
    return true;
  }
}
