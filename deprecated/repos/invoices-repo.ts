

// src/app/api/payments/repos/invoices-repo.ts
// JSON-backed repository for invoices. All file I/O centralized here.

import path from 'path';
import fs from 'fs/promises';

export type InvoiceStatus = 'draft' | 'sent' | 'processing' | 'paid' | 'void';

export interface InvoiceRecord {
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  currency?: string;
  status: InvoiceStatus;
  issueDate?: string; // ISO
  dueDate?: string;   // ISO
  paidDate?: string;  // ISO
  milestoneNumber?: number; // used by completion/milestone logic
  method?: 'completion' | 'milestone';
  // arbitrary expansion for UI/metadata
  [key: string]: any;
}

const INVOICES_PATH = path.join(process.cwd(), 'data', 'invoices', 'invoices.json');

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
export async function readAllInvoices(): Promise<InvoiceRecord[]> {
  return readJsonSafe<InvoiceRecord[]>(INVOICES_PATH, []);
}

export async function writeAllInvoices(records: InvoiceRecord[]): Promise<void> {
  await writeJson(INVOICES_PATH, records);
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceRecord | undefined> {
  const items = await readAllInvoices();
  return items.find(inv => inv.invoiceNumber === String(invoiceNumber));
}

export async function upsertInvoice(record: InvoiceRecord): Promise<InvoiceRecord> {
  const items = await readAllInvoices();
  const idx = items.findIndex(inv => inv.invoiceNumber === record.invoiceNumber);
  if (idx === -1) {
    items.push(record);
  } else {
    items[idx] = { ...items[idx], ...record };
  }
  await writeAllInvoices(items);
  return record;
}

export async function updateInvoice(invoiceNumber: string, patch: Partial<InvoiceRecord>): Promise<boolean> {
  const items = await readAllInvoices();
  const idx = items.findIndex(inv => inv.invoiceNumber === String(invoiceNumber));
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch };
  await writeAllInvoices(items);
  return true;
}

export async function deleteInvoice(invoiceNumber: string): Promise<boolean> {
  const items = await readAllInvoices();
  const next = items.filter(inv => inv.invoiceNumber !== String(invoiceNumber));
  if (next.length === items.length) return false;
  await writeAllInvoices(next);
  return true;
}

// ---------- Queries ----------
export async function listInvoicesByFreelancer(freelancerId: number | string): Promise<InvoiceRecord[]> {
  const items = await readAllInvoices();
  const id = Number(freelancerId);
  return items.filter(inv => Number(inv.freelancerId) === id);
}

export async function listInvoicesByCommissioner(commissionerId: number | string): Promise<InvoiceRecord[]> {
  const items = await readAllInvoices();
  const id = Number(commissionerId);
  return items.filter(inv => Number(inv.commissionerId) === id);
}

export async function listInvoicesByProject(projectId: number | string): Promise<InvoiceRecord[]> {
  const items = await readAllInvoices();
  const id = Number(projectId);
  return items.filter(inv => Number(inv.projectId) === id);
}

// ---------- Helpers ----------
export function ensureInvoiceShape(record: any): InvoiceRecord {
  if (!record || typeof record !== 'object') throw new Error('Invalid invoice object');
  const required = ['invoiceNumber','projectId','freelancerId','commissionerId','totalAmount','status'];
  for (const k of required) {
    if (record[k] === undefined || record[k] === null) {
      throw new Error(`Missing required invoice field: ${k}`);
    }
  }
  return record as InvoiceRecord;
}