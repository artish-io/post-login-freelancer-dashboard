// src/lib/transactions/hierarchical-storage.ts
// Hierarchical storage for transactions to match the invoice storage pattern

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import path from 'path';

export interface Transaction {
  transactionId: string;
  type: 'invoice' | 'store-purchase' | 'withdrawal';
  integration: 'mock' | 'stripe' | 'paystack' | 'paypal';
  status: 'processing' | 'paid' | 'failed';
  amount: number;
  timestamp: string;
  currency?: string;
  invoiceNumber?: string;
  projectId?: number;
  freelancerId?: number;
  commissionerId?: number;
  productId?: string;
  withdrawalId?: string;
  metadata?: Record<string, unknown>;
}

// Helper function to parse transaction timestamp
function parseTransactionDate(timestamp: string): Date {
  return new Date(timestamp);
}

// Helper function to get date parts
function getDateParts(date: Date): { year: string; month: string; day: string } {
  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'), // Use numeric month (01-12)
    day: date.getDate().toString().padStart(2, '0')
  };
}

// Get directory path for transactions
function getTransactionDirectoryPath(transaction: Transaction): string {
  const transactionDate = parseTransactionDate(transaction.timestamp);
  const { year, month, day } = getDateParts(transactionDate);
  const projectId = transaction.projectId ? transaction.projectId.toString() : 'general';

  return path.join(
    process.cwd(),
    'data',
    'transactions',
    year,
    month,
    day,
    projectId
  );
}

// Get file path for a transaction
function getTransactionFilePath(transaction: Transaction): string {
  return path.join(
    getTransactionDirectoryPath(transaction),
    `${transaction.transactionId}.json`
  );
}

// Ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await stat(dirPath);
  } catch {
    // Directory doesn't exist, create it recursively
    const { mkdir } = await import('fs/promises');
    await mkdir(dirPath, { recursive: true });
  }
}

// Save a transaction to the hierarchical structure
export async function saveTransaction(transaction: Transaction): Promise<void> {
  const dirPath = getTransactionDirectoryPath(transaction);
  await ensureDir(dirPath);

  const filePath = getTransactionFilePath(transaction);
  await writeFile(filePath, JSON.stringify(transaction, null, 2));
}

// Get all transactions (with optional filters)
export async function getAllTransactions(filters?: {
  projectId?: number;
  invoiceNumber?: string;
  status?: string;
  type?: string;
}): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const transactionsDir = path.join(process.cwd(), 'data', 'transactions');

  try {
    await stat(transactionsDir);
  } catch {
    return transactions;
  }

  async function scanDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== '.gitkeep') {
          try {
            const content = await readFile(fullPath, 'utf-8');
            const transaction = JSON.parse(content) as Transaction;
            
            // Apply filters if provided
            if (filters) {
              if (filters.projectId && transaction.projectId !== filters.projectId) continue;
              if (filters.invoiceNumber && transaction.invoiceNumber !== filters.invoiceNumber) continue;
              if (filters.status && transaction.status !== filters.status) continue;
              if (filters.type && transaction.type !== filters.type) continue;
            }
            
            transactions.push(transaction);
          } catch (error) {
            console.warn(`Failed to parse transaction file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  await scanDirectory(transactionsDir);
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get transaction by ID
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  const allTransactions = await getAllTransactions();
  return allTransactions.find(tx => tx.transactionId === transactionId) || null;
}

// Update a transaction
export async function updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<boolean> {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) return false;

  const updatedTransaction = { ...transaction, ...updates };
  await saveTransaction(updatedTransaction);
  return true;
}

// Delete a transaction
export async function deleteTransaction(transactionId: string): Promise<boolean> {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) return false;

  try {
    const filePath = getTransactionFilePath(transaction);
    await writeFile(filePath, ''); // Clear the file instead of deleting to avoid directory issues
    return true;
  } catch {
    return false;
  }
}

// Get transactions by project ID
export async function getTransactionsByProject(projectId: number): Promise<Transaction[]> {
  return getAllTransactions({ projectId });
}

// Get transactions by invoice number
export async function getTransactionsByInvoice(invoiceNumber: string): Promise<Transaction[]> {
  return getAllTransactions({ invoiceNumber });
}
