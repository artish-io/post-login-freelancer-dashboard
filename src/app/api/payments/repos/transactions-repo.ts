

// src/app/api/payments/repos/transactions-repo.ts
// JSON-backed repository for payment transactions. Centralizes all I/O for tx logs.

import path from 'path';
import fs from 'fs/promises';

export type Integration = 'mock' | 'stripe' | 'paystack' | 'paypal';
export type TxType = 'invoice' | 'store-purchase' | 'withdrawal';
export type TxStatus = 'processing' | 'paid' | 'failed';

export interface TransactionRecord {
  transactionId: string;          // unique id, e.g., TXN-INV10001
  type: TxType;                   // invoice | store-purchase | withdrawal
  integration: Integration;       // mock | stripe | paystack | paypal
  status: TxStatus;               // processing | paid | failed
  amount: number;                 // transaction amount (minor or major units depending on system)
  timestamp: string;              // ISO
  currency?: string;              // ISO 4217 currency code (e.g., 'USD', 'EUR', 'NGN')
  // Optional linkages
  invoiceNumber?: string;
  projectId?: number;
  freelancerId?: number;
  commissionerId?: number;
  productId?: string;             // for storefront purchases
  withdrawalId?: string;          // for withdrawals
  metadata?: Record<string, unknown>;
}

const TX_PATH = path.join(process.cwd(), 'data', 'payments', 'mock-transactions.json');

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
export async function readAllTransactions(): Promise<TransactionRecord[]> {
  return readJsonSafe<TransactionRecord[]>(TX_PATH, []);
}

export async function writeAllTransactions(records: TransactionRecord[]): Promise<void> {
  await writeJson(TX_PATH, records);
}

export async function appendTransaction(record: TransactionRecord): Promise<void> {
  const items = await readAllTransactions();
  items.push(record);
  await writeAllTransactions(items);
}

export async function getTransactionById(transactionId: string): Promise<TransactionRecord | undefined> {
  const items = await readAllTransactions();
  return items.find(tx => tx.transactionId === String(transactionId));
}

export async function updateTransaction(transactionId: string, patch: Partial<TransactionRecord>): Promise<boolean> {
  const items = await readAllTransactions();
  const idx = items.findIndex(tx => tx.transactionId === String(transactionId));
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch };
  await writeAllTransactions(items);
  return true;
}

// ---------- Queries ----------
export async function listByInvoiceNumber(invoiceNumber: string): Promise<TransactionRecord[]> {
  const items = await readAllTransactions();
  return items.filter(tx => tx.invoiceNumber === String(invoiceNumber));
}

export async function listByProject(projectId: number | string): Promise<TransactionRecord[]> {
  const items = await readAllTransactions();
  const id = Number(projectId);
  return items.filter(tx => Number(tx.projectId) === id);
}

export async function listByUser(userId: number | string): Promise<TransactionRecord[]> {
  const items = await readAllTransactions();
  const id = Number(userId);
  return items.filter(tx => Number(tx.freelancerId) === id || Number(tx.commissionerId) === id);
}

export async function listByType(type: TxType): Promise<TransactionRecord[]> {
  const items = await readAllTransactions();
  return items.filter(tx => tx.type === type);
}

// ---------- Idempotency helpers ----------
export async function findByMetadataKey(key: string, value: string): Promise<TransactionRecord[]> {
  const items = await readAllTransactions();
  return items.filter(tx =>
    tx.metadata &&
    tx.metadata[key] !== undefined &&
    String(tx.metadata[key]) === String(value)
  );
}

export async function findByWithdrawalId(withdrawalId: string): Promise<TransactionRecord | undefined> {
  const items = await readAllTransactions();
  return items.find(tx => tx.withdrawalId === String(withdrawalId));
}

// ---------- Validation ----------
export function ensureTransactionShape(record: any): TransactionRecord {
  if (!record || typeof record !== 'object') throw new Error('Invalid transaction object');
  const required = ['transactionId','type','integration','status','amount','timestamp'];
  for (const k of required) {
    if (record[k] === undefined || record[k] === null) {
      throw new Error(`Missing required transaction field: ${k}`);
    }
  }
  return record as TransactionRecord;
}