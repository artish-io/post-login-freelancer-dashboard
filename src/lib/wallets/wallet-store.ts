/**
 * Wallet Store - Idempotent wallet management
 * 
 * Provides get-or-create wallet functionality with atomic operations.
 * Ensures wallets are automatically initialized on first payment.
 */

import * as path from 'path';
import { writeJsonAtomic, readJson, fileExists, ensureDir } from '../fs-json';

export interface Wallet {
  userId: number;
  available: number;
  pending: number;
  currency: string;
  updatedAt: string;
  // Additional fields for compatibility
  totalWithdrawn?: number;
  lifetimeEarnings?: number;
  holds?: number;
  version?: number;
}

export class WalletStoreError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'INVALID_DATA' | 'IO_ERROR' | 'CREATION_FAILED',
    public userId?: number
  ) {
    super(message);
    this.name = 'WalletStoreError';
  }
}

/**
 * Get wallet file path for a user
 */
function getWalletFilePath(userId: number): string {
  return path.join(process.cwd(), 'data', 'wallets', `${userId}.json`);
}

/**
 * Get wallet directory path
 */
function getWalletsDir(): string {
  return path.join(process.cwd(), 'data', 'wallets');
}

/**
 * Read wallet for a user (returns null if not found)
 */
export async function getWallet(userId: number): Promise<Wallet | null> {
  const walletPath = getWalletFilePath(userId);
  
  try {
    if (await fileExists(walletPath)) {
      const wallet = await readJson<Wallet | null>(walletPath, null);
      if (wallet && wallet.userId === userId) {
        return wallet;
      }
    }
    return null;
  } catch (error) {
    throw new WalletStoreError(
      `Failed to read wallet for user ${userId}: ${error}`,
      'IO_ERROR',
      userId
    );
  }
}

/**
 * Get wallet or create if it doesn't exist (idempotent)
 */
export async function getOrCreateWallet(userId: number, currency: string = 'USD'): Promise<Wallet> {
  // First try to get existing wallet
  const existingWallet = await getWallet(userId);
  if (existingWallet) {
    return existingWallet;
  }
  
  // Create new wallet
  try {
    const newWallet: Wallet = {
      userId,
      available: 0,
      pending: 0,
      currency,
      updatedAt: new Date().toISOString(),
      // Initialize compatibility fields
      totalWithdrawn: 0,
      lifetimeEarnings: 0,
      holds: 0,
      version: 1
    };
    
    await saveWallet(newWallet);
    
    console.log(`💰 Created new wallet for user ${userId} with currency ${currency}`);
    return newWallet;
  } catch (error) {
    throw new WalletStoreError(
      `Failed to create wallet for user ${userId}: ${error}`,
      'CREATION_FAILED',
      userId
    );
  }
}

/**
 * Save wallet atomically
 */
export async function saveWallet(wallet: Wallet): Promise<void> {
  const walletPath = getWalletFilePath(wallet.userId);
  
  try {
    // Ensure wallets directory exists
    await ensureDir(getWalletsDir());
    
    // Update timestamp
    const updatedWallet = {
      ...wallet,
      updatedAt: new Date().toISOString()
    };
    
    await writeJsonAtomic(walletPath, updatedWallet);
  } catch (error) {
    throw new WalletStoreError(
      `Failed to save wallet for user ${wallet.userId}: ${error}`,
      'IO_ERROR',
      wallet.userId
    );
  }
}

/**
 * Update wallet with partial data
 */
export async function updateWallet(userId: number, updates: Partial<Omit<Wallet, 'userId'>>): Promise<Wallet> {
  const wallet = await getOrCreateWallet(userId);
  
  const updatedWallet = {
    ...wallet,
    ...updates,
    userId, // Ensure userId cannot be changed
    updatedAt: new Date().toISOString()
  };
  
  await saveWallet(updatedWallet);
  return updatedWallet;
}

/**
 * Credit amount to wallet (for payments received)
 */
export async function creditWallet(userId: number, amount: number, currency: string = 'USD'): Promise<Wallet> {
  if (amount <= 0) {
    throw new WalletStoreError(
      `Credit amount must be positive, got ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const wallet = await getOrCreateWallet(userId, currency);
  
  const updatedWallet = {
    ...wallet,
    available: wallet.available + amount,
    lifetimeEarnings: (wallet.lifetimeEarnings || 0) + amount,
    updatedAt: new Date().toISOString()
  };
  
  await saveWallet(updatedWallet);
  
  console.log(`💰 Credited ${amount} ${currency} to user ${userId} wallet`);
  return updatedWallet;
}

/**
 * Debit amount from wallet (for withdrawals)
 */
export async function debitWallet(userId: number, amount: number): Promise<Wallet> {
  if (amount <= 0) {
    throw new WalletStoreError(
      `Debit amount must be positive, got ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const wallet = await getOrCreateWallet(userId);
  
  if (wallet.available < amount) {
    throw new WalletStoreError(
      `Insufficient funds: available ${wallet.available}, requested ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const updatedWallet = {
    ...wallet,
    available: wallet.available - amount,
    totalWithdrawn: (wallet.totalWithdrawn || 0) + amount,
    updatedAt: new Date().toISOString()
  };
  
  await saveWallet(updatedWallet);
  
  console.log(`💸 Debited ${amount} ${wallet.currency} from user ${userId} wallet`);
  return updatedWallet;
}

/**
 * Move amount from pending to available (for payment confirmations)
 */
export async function confirmPendingPayment(userId: number, amount: number): Promise<Wallet> {
  if (amount <= 0) {
    throw new WalletStoreError(
      `Confirmation amount must be positive, got ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const wallet = await getOrCreateWallet(userId);
  
  if (wallet.pending < amount) {
    throw new WalletStoreError(
      `Insufficient pending funds: pending ${wallet.pending}, requested ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const updatedWallet = {
    ...wallet,
    pending: wallet.pending - amount,
    available: wallet.available + amount,
    updatedAt: new Date().toISOString()
  };
  
  await saveWallet(updatedWallet);
  
  console.log(`✅ Confirmed ${amount} ${wallet.currency} pending payment for user ${userId}`);
  return updatedWallet;
}

/**
 * Add amount to pending (for payments in process)
 */
export async function addPendingPayment(userId: number, amount: number, currency: string = 'USD'): Promise<Wallet> {
  if (amount <= 0) {
    throw new WalletStoreError(
      `Pending amount must be positive, got ${amount}`,
      'INVALID_DATA',
      userId
    );
  }
  
  const wallet = await getOrCreateWallet(userId, currency);
  
  const updatedWallet = {
    ...wallet,
    pending: wallet.pending + amount,
    updatedAt: new Date().toISOString()
  };
  
  await saveWallet(updatedWallet);
  
  console.log(`⏳ Added ${amount} ${currency} to pending for user ${userId}`);
  return updatedWallet;
}

/**
 * Get all wallets (for admin/reporting purposes)
 */
export async function getAllWallets(): Promise<Wallet[]> {
  const walletsDir = getWalletsDir();
  const wallets: Wallet[] = [];
  
  try {
    if (await fileExists(walletsDir)) {
      const { readdir } = await import('fs/promises');
      const files = await readdir(walletsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const userId = parseInt(path.basename(file, '.json'));
            const wallet = await getWallet(userId);
            if (wallet) {
              wallets.push(wallet);
            }
          } catch (error) {
            console.warn(`⚠️ Skipping invalid wallet file ${file}: ${error}`);
          }
        }
      }
    }
    
    return wallets.sort((a, b) => a.userId - b.userId);
  } catch (error) {
    throw new WalletStoreError(
      `Failed to read all wallets: ${error}`,
      'IO_ERROR'
    );
  }
}
