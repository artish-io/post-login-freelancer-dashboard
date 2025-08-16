

// src/app/api/payments/repos/wallets-repo.ts
// JSON-backed repository for user wallets. Centralizes all I/O for wallet balances.

import path from 'path';
import fs from 'fs/promises';

export type UserType = 'freelancer' | 'commissioner';
// Allow any ISO 4217 currency string (e.g., 'USD', 'EUR', 'NGN')
export type Currency = string;

export interface Wallet {
  userId: number;
  userType: UserType;
  currency: Currency;
  availableBalance: number;    // funds ready for withdrawal
  pendingWithdrawals: number;  // funds in withdrawal process
  totalWithdrawn: number;      // lifetime withdrawn
  lifetimeEarnings: number;    // total credited ever
  holds: number;               // reserved for disputes or pending clearance
  updatedAt: string;           // ISO date
}

const WALLETS_PATH = path.join(process.cwd(), 'data', 'payments', 'wallets.json');

// File locking mechanism to prevent concurrent writes
const fileLocks = new Map<string, Promise<void>>();

/**
 * File locking mechanism to prevent concurrent writes
 */
async function withFileLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any existing lock
  while (fileLocks.has(lockKey)) {
    await fileLocks.get(lockKey);
  }

  // Create new lock
  const lockPromise = (async () => {
    try {
      return await fn();
    } finally {
      fileLocks.delete(lockKey);
    }
  })();

  fileLocks.set(lockKey, lockPromise.then(() => {}));
  return lockPromise;
}

async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    throw err;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ---------- Core ops ----------
export async function readAllWallets(): Promise<Wallet[]> {
  return readJsonSafe<Wallet[]>(WALLETS_PATH, []);
}

export async function writeAllWallets(records: Wallet[]): Promise<void> {
  await writeJson(WALLETS_PATH, records);
}

export async function getWallet(userId: number, userType: UserType, currency: Currency): Promise<Wallet | undefined> {
  const items = await readAllWallets();
  return items.find(w => w.userId === userId && w.userType === userType && w.currency === currency);
}

export async function upsertWallet(wallet: Wallet): Promise<void> {
  const walletLockKey = `wallet_${wallet.userId}_${wallet.userType}_${wallet.currency}`;

  await withFileLock(walletLockKey, async () => {
    const items = await readAllWallets();
    const idx = items.findIndex(w =>
      w.userId === wallet.userId &&
      w.userType === wallet.userType &&
      w.currency === wallet.currency
    );

    if (idx === -1) {
      items.push(wallet);
    } else {
      items[idx] = wallet;
    }

    await writeAllWallets(items);
  });
}

export async function updateWallet(userId: number, userType: UserType, currency: Currency, patch: Partial<Wallet>): Promise<boolean> {
  const items = await readAllWallets();
  const idx = items.findIndex(w => w.userId === userId && w.userType === userType && w.currency === currency);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeAllWallets(items);
  return true;
}

// ---------- Queries ----------
export async function listWalletsByUser(userId: number): Promise<Wallet[]> {
  const items = await readAllWallets();
  return items.filter(w => w.userId === userId);
}

export async function listWalletsByType(userType: UserType): Promise<Wallet[]> {
  const items = await readAllWallets();
  return items.filter(w => w.userType === userType);
}

// ---------- Validation ----------
export function ensureWalletShape(record: any): Wallet {
  if (!record || typeof record !== 'object') throw new Error('Invalid wallet object');
  const required = ['userId','userType','currency','availableBalance','pendingWithdrawals','totalWithdrawn','lifetimeEarnings','holds','updatedAt'];
  for (const k of required) {
    if (record[k] === undefined || record[k] === null) {
      throw new Error(`Missing required wallet field: ${k}`);
    }
  }
  return record as Wallet;
}
export async function listWalletsByUserAndCurrency(userId: number, currency: Currency): Promise<Wallet[]> {
  const items = await readAllWallets();
  return items.filter(w => w.userId === userId && w.currency === currency);
}