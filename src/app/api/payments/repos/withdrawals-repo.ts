

// src/app/api/payments/repos/withdrawals-repo.ts
// JSON-backed repository for withdrawal records. Centralizes all I/O for withdrawals history.

import path from 'path';
import fs from 'fs/promises';

export type UserType = 'freelancer' | 'commissioner';
export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface WithdrawalRecord {
  withdrawalId: string;     // e.g., WD-31-171242343
  userId: number;
  userType: UserType;
  amount: number;
  currency: string;         // 'USD' | 'CAD' | 'NGN' etc.
  status: WithdrawalStatus; // pending | paid | rejected
  requestedAt: string;      // ISO timestamp
  processedAt?: string;     // ISO timestamp
  processedById?: number;   // who executed the payout
  note?: string | null;     // optional description
}

const WITHDRAWALS_PATH = path.join(process.cwd(), 'data', 'payments', 'withdrawals.json');

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

// ---------- Core CRUD ----------
export async function readAllWithdrawals(): Promise<WithdrawalRecord[]> {
  return readJsonSafe<WithdrawalRecord[]>(WITHDRAWALS_PATH, []);
}

export async function writeAllWithdrawals(records: WithdrawalRecord[]): Promise<void> {
  await writeJson(WITHDRAWALS_PATH, records);
}

export async function addWithdrawal(record: WithdrawalRecord): Promise<void> {
  const items = await readAllWithdrawals();
  items.push(record);
  await writeAllWithdrawals(items);
}

export async function getWithdrawalById(withdrawalId: string): Promise<WithdrawalRecord | undefined> {
  const items = await readAllWithdrawals();
  return items.find(w => w.withdrawalId === String(withdrawalId));
}

export async function updateWithdrawal(withdrawalId: string, patch: Partial<WithdrawalRecord>): Promise<boolean> {
  const items = await readAllWithdrawals();
  const idx = items.findIndex(w => w.withdrawalId === String(withdrawalId));
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch };
  await writeAllWithdrawals(items);
  return true;
}

// ---------- Queries ----------
export async function listWithdrawalsByUser(userId: number): Promise<WithdrawalRecord[]> {
  const items = await readAllWithdrawals();
  return items.filter(w => Number(w.userId) === Number(userId));
}

export async function listWithdrawalsByStatus(status: WithdrawalStatus): Promise<WithdrawalRecord[]> {
  const items = await readAllWithdrawals();
  return items.filter(w => w.status === status);
}

// ---------- Validation ----------
export function ensureWithdrawalShape(record: any): WithdrawalRecord {
  if (!record || typeof record !== 'object') throw new Error('Invalid withdrawal object');
  const required = ['withdrawalId','userId','userType','amount','currency','status','requestedAt'];
  for (const k of required) {
    if (record[k] === undefined || record[k] === null) {
      throw new Error(`Missing required withdrawal field: ${k}`);
    }
  }
  return record as WithdrawalRecord;
}