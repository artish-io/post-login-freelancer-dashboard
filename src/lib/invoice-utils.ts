import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
const usersPath = path.join(process.cwd(), 'data', 'users.json');
const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

// ✅ Generate unique invoice number: timestamp + UUID fragment
export function generateInvoiceNumber(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const uid = uuidv4().slice(0, 6).toUpperCase();
  return `INV-${timestamp}-${uid}`;
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
  const data = await readFile(tasksPath, 'utf-8');
  const taskData = JSON.parse(data);
  const entry = taskData.find((p: any) => p.projectId === projectId);
  return entry ? entry.tasks : [];
}

// ✅ Get invoice by ID
export async function getInvoiceById(invoiceId: number) {
  const data = await readFile(invoicesPath, 'utf-8');
  const invoices = JSON.parse(data);
  return invoices.find((inv: any) => inv.id === invoiceId) || null;
}

// ✅ Save invoice with optional version history (for audit trail)
export async function saveInvoice(newInvoice: any) {
  const data = await readFile(invoicesPath, 'utf-8');
  const invoices = JSON.parse(data);

  const existingIndex = invoices.findIndex((inv: any) => inv.id === newInvoice.id);
  if (existingIndex !== -1) {
    const existing = invoices[existingIndex];
    const history = existing.versions || [];
    history.push({ ...existing, updatedAt: new Date().toISOString() });

    invoices[existingIndex] = { ...newInvoice, versions: history };
  } else {
    invoices.push({ ...newInvoice, versions: [] });
  }

  await writeFile(invoicesPath, JSON.stringify(invoices, null, 2));
}