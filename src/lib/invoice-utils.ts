// src/lib/invoice-utils.ts
import { readFile } from 'fs/promises';
import path from 'path';
import { getAllInvoices, getInvoiceByNumber, saveInvoice, type Invoice } from './invoice-storage';
import { readAllTasks } from '@/app/api/payments/repos/tasks-repo';

const usersPath = path.join(process.cwd(), 'data', 'users.json');
const projectsPath = path.join(process.cwd(), 'data', 'projects.json');

// ✅ Generate shortened invoice number like "MF-5447A0"
export function generateInvoiceNumber(fullName: string): string {
  const initials = fullName
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2); // Max 2 letters

  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char alphanumeric
  return `${initials}-${suffix}`;
}

// ✅ Find user by ID
export async function findUserById(userId: number) {
  const data = await readFile(usersPath, 'utf-8');
  const users = JSON.parse(data);
  return users.find((u: any) => u.id === userId) || null;
}

// ✅ Find project by ID
export async function findProjectById(projectId: number) {
  const data = await readFile(projectsPath, 'utf-8');
  const projects = JSON.parse(data);
  return projects.find((p: any) => p.projectId === projectId) || null;
}

// ✅ Get tasks by project ID
export async function getTasksByProjectId(projectId: number) {
  // Read all tasks from tasks repo
  const allTasks = await readAllTasks();

  // Filter tasks by project ID
  return allTasks.filter((task: any) => task.projectId === projectId);
}

// ✅ Get invoice by ID
export async function getInvoiceById(invoiceId: number): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  return invoices.find((inv: Invoice) => inv.id === invoiceId) || null;
}

// ✅ Save invoice with optional version history (for audit trail)
export async function saveInvoiceWithHistory(newInvoice: Invoice): Promise<void> {
  const existingInvoice = newInvoice.id ? await getInvoiceById(newInvoice.id) : null;

  if (existingInvoice) {
    const history = existingInvoice.versions || [];
    history.push({ ...existingInvoice, updatedAt: new Date().toISOString() });
    newInvoice.versions = history;
  } else {
    newInvoice.versions = [];
  }

  await saveInvoice(newInvoice);
}