/**
 * Transaction Path Utilities for Hierarchical Storage
 * 
 * Provides utilities for generating and managing file paths
 * in the hierarchical transaction storage system.
 */

import path from 'path';
import { BaseTransaction, TransactionMetadata } from './transaction-schemas';

// Base data directory (configurable for testing)
const DATA_ROOT = process.env.TEST_DATA_ROOT || path.join(process.cwd(), 'data');

/**
 * Generate hierarchical directory path for a transaction
 * Format: data/transactions/YYYY/MM/DD/
 */
export function getTransactionDirectoryPath(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return path.join(DATA_ROOT, 'transactions', year, month, day);
}

/**
 * Generate full file path for a transaction
 * Format: data/transactions/YYYY/MM/DD/transactionId/payment.json or withdrawal.json
 */
export function getTransactionFilePath(transaction: BaseTransaction): string {
  const dirPath = getTransactionDirectoryPath(transaction.timestamp);
  const transactionDir = path.join(dirPath, transaction.transactionId);
  const fileName = transaction.type === 'payment' ? 'payment.json' : 'withdrawal.json';
  
  return path.join(transactionDir, fileName);
}

/**
 * Generate metadata file path for a transaction
 * Format: data/transactions/YYYY/MM/DD/transactionId/metadata.json
 */
export function getTransactionMetadataPath(transaction: BaseTransaction): string {
  const dirPath = getTransactionDirectoryPath(transaction.timestamp);
  const transactionDir = path.join(dirPath, transaction.transactionId);
  
  return path.join(transactionDir, 'metadata.json');
}

/**
 * Generate transaction ID
 * Format: TXN-{type}-{reference}-{timestamp}
 */
export function generateTransactionId(
  type: 'payment' | 'withdrawal',
  reference: string,
  timestamp?: string
): string {
  const ts = timestamp ? new Date(timestamp).getTime() : Date.now();
  const typePrefix = type === 'payment' ? 'PAY' : 'WD';
  
  // Clean reference to remove special characters
  const cleanReference = reference.replace(/[^A-Za-z0-9-]/g, '').substring(0, 20);
  
  return `TXN-${typePrefix}-${cleanReference}-${ts}`;
}

/**
 * Parse transaction ID to extract components
 */
export function parseTransactionId(transactionId: string): {
  type: 'payment' | 'withdrawal';
  reference: string;
  timestamp: number;
} | null {
  const pattern = /^TXN-(PAY|WD)-([A-Za-z0-9-]+)-(\d+)$/;
  const match = transactionId.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return {
    type: match[1] === 'PAY' ? 'payment' : 'withdrawal',
    reference: match[2],
    timestamp: parseInt(match[3])
  };
}

/**
 * Generate wallet balance snapshot directory path
 * Format: data/wallets/YYYY/MM/DD/
 */
export function getWalletSnapshotDirectoryPath(date: string): string {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear().toString();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return path.join(DATA_ROOT, 'wallets', year, month, day);
}

/**
 * Generate wallet balance snapshot file path
 * Format: data/wallets/YYYY/MM/DD/user-{userId}-balance-snapshot.json
 */
export function getWalletSnapshotFilePath(userId: number, date: string): string {
  const dirPath = getWalletSnapshotDirectoryPath(date);
  return path.join(dirPath, `user-${userId}-balance-snapshot.json`);
}

/**
 * Generate daily summary file path
 * Format: data/wallets/YYYY/MM/DD/daily-summary.json
 */
export function getDailySummaryFilePath(date: string): string {
  const dirPath = getWalletSnapshotDirectoryPath(date);
  return path.join(dirPath, 'daily-summary.json');
}

/**
 * Generate migration log directory path
 * Format: data/migration-logs/YYYY-MM-DD-HH-mm-ss/
 */
export function getMigrationLogDirectoryPath(timestamp?: string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  const migrationId = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
  return path.join(DATA_ROOT, 'migration-logs', migrationId);
}

/**
 * Get all transaction directories for a date range
 */
export function getTransactionDirectoriesInRange(startDate: string, endDate: string): string[] {
  const directories: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Iterate through each day in the range
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dirPath = getTransactionDirectoryPath(date.toISOString());
    directories.push(dirPath);
  }
  
  return directories;
}

/**
 * Get all transaction directories for a specific user (requires scanning)
 * Note: This is less efficient and should be used sparingly
 */
export function getUserTransactionDirectories(userId: number, startDate?: string, endDate?: string): string[] {
  // This would require filesystem scanning - implementation depends on specific needs
  // For now, return empty array and implement when needed
  return [];
}

/**
 * Create transaction metadata object
 */
export function createTransactionMetadata(transaction: BaseTransaction): TransactionMetadata {
  const filePath = getTransactionFilePath(transaction);
  const directoryPath = path.dirname(filePath);
  
  return {
    transactionId: transaction.transactionId,
    filePath,
    directoryPath,
    createdAt: new Date().toISOString()
  };
}

/**
 * Validate transaction directory structure
 */
export function validateTransactionPath(filePath: string): boolean {
  // Check if path follows expected pattern
  const pattern = /data\/transactions\/\d{4}\/\d{2}\/\d{2}\/TXN-[A-Z]+-[A-Za-z0-9-]+-\d+\/(payment|withdrawal)\.json$/;
  return pattern.test(filePath.replace(/\\/g, '/'));
}

/**
 * Extract date from transaction file path
 */
export function extractDateFromPath(filePath: string): string | null {
  const pattern = /data\/transactions\/(\d{4})\/(\d{2})\/(\d{2})\//;
  const match = filePath.match(pattern);
  
  if (!match) {
    return null;
  }
  
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Extract transaction ID from file path
 */
export function extractTransactionIdFromPath(filePath: string): string | null {
  const pattern = /\/(TXN-[A-Z]+-[A-Za-z0-9-]+-\d+)\//;
  const match = filePath.match(pattern);
  
  return match ? match[1] : null;
}

/**
 * Get relative path from data root
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(DATA_ROOT, absolutePath);
}

/**
 * Get absolute path from relative path
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(DATA_ROOT, relativePath);
}

/**
 * Ensure directory exists (utility for creating directories)
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Check if transaction file exists
 */
export async function transactionFileExists(transaction: BaseTransaction): Promise<boolean> {
  const { access } = await import('fs/promises');
  const filePath = getTransactionFilePath(transaction);
  
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size of transaction
 */
export async function getTransactionFileSize(transaction: BaseTransaction): Promise<number> {
  const { stat } = await import('fs/promises');
  const filePath = getTransactionFilePath(transaction);
  
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}
