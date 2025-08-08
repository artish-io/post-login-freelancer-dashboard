

// src/app/api/payments/repos/projects-repo.ts
// JSON-backed repository for projects. Centralizes all I/O for project records.

import path from 'path';
import fs from 'fs/promises';

export type ProjectStatus = 'proposed' | 'ongoing' | 'paused' | 'completed' | 'archived';
export type InvoicingMethod = 'completion' | 'milestone';
export type Currency = string; // ISO 4217 code, e.g., 'USD', 'EUR', 'NGN'

export interface ProjectRecord {
  projectId: number;
  title?: string;
  status: ProjectStatus;              // proposed | ongoing | paused | completed | archived
  invoicingMethod: InvoicingMethod;   // completion | milestone
  currency?: Currency;                // optional currency at project level
  commissionerId?: number;            // owner/buyer
  freelancerId?: number;              // assignee/seller
  totalBudget?: number;               // optional
  paidToDate?: number;                // derived/rolled up value (for convenience)
  createdAt?: string;                 // ISO
  updatedAt?: string;                 // ISO
  // Allow arbitrary metadata without breaking the repo
  [key: string]: any;
}

const PROJECTS_PATH = path.join(process.cwd(), 'data', 'projects', 'projects.json');

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
export async function readAllProjects(): Promise<ProjectRecord[]> {
  // Import the hierarchical projects utils
  const { readAllProjects: readHierarchicalProjects } = await import('@/lib/projects-utils');
  const hierarchicalProjects = await readHierarchicalProjects();

  // Convert to ProjectRecord format
  return hierarchicalProjects.map(project => {
    // Normalize status to match ProjectStatus type
    let status: ProjectStatus = 'proposed';
    if (project.status) {
      const normalizedStatus = project.status.toLowerCase();
      if (['proposed', 'ongoing', 'paused', 'completed', 'archived'].includes(normalizedStatus)) {
        status = normalizedStatus as ProjectStatus;
      }
    }

    // Normalize invoicing method
    let invoicingMethod: InvoicingMethod = 'milestone';
    if (project.invoicingMethod) {
      const normalizedMethod = project.invoicingMethod.toLowerCase();
      if (['completion', 'milestone'].includes(normalizedMethod)) {
        invoicingMethod = normalizedMethod as InvoicingMethod;
      }
    }

    return {
      ...project, // Include all original fields first
      projectId: project.projectId,
      title: project.title || '',
      status,
      invoicingMethod,
      currency: (project as any).currency || 'USD',
      commissionerId: project.commissionerId,
      freelancerId: project.freelancerId,
      paidToDate: Number((project as any).paidToDate || 0),
      createdAt: project.createdAt,
      updatedAt: (project as any).updatedAt || project.createdAt,
    } as ProjectRecord;
  });
}

export async function writeAllProjects(records: ProjectRecord[]): Promise<void> {
  await writeJson(PROJECTS_PATH, records);
}

export async function getProjectById(projectId: number | string): Promise<ProjectRecord | undefined> {
  const items = await readAllProjects();
  const id = Number(projectId);
  return items.find(p => Number(p.projectId) === id);
}

export async function upsertProject(record: ProjectRecord): Promise<ProjectRecord> {
  const items = await readAllProjects();
  const idx = items.findIndex(p => Number(p.projectId) === Number(record.projectId));
  const now = new Date().toISOString();
  if (idx === -1) {
    const next: ProjectRecord = {
      ...record,
      status: record.status ?? 'proposed',
      invoicingMethod: record.invoicingMethod ?? 'milestone',
      paidToDate: Number(record.paidToDate ?? 0),
      createdAt: record.createdAt ?? now,
      updatedAt: now,
    };
    items.push(next);
    await writeAllProjects(items);
    return next;
  } else {
    items[idx] = { ...items[idx], ...record, updatedAt: now };
    await writeAllProjects(items);
    return items[idx];
  }
}

export async function updateProject(projectId: number | string, patch: Partial<ProjectRecord>): Promise<boolean> {
  const items = await readAllProjects();
  const id = Number(projectId);
  const idx = items.findIndex(p => Number(p.projectId) === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeAllProjects(items);
  return true;
}

export async function deleteProject(projectId: number | string): Promise<boolean> {
  const items = await readAllProjects();
  const id = Number(projectId);
  const next = items.filter(p => Number(p.projectId) !== id);
  if (next.length === items.length) return false;
  await writeAllProjects(next);
  return true;
}

// ---------- Queries ----------
export async function listProjectsByCommissioner(commissionerId: number | string): Promise<ProjectRecord[]> {
  const items = await readAllProjects();
  const id = Number(commissionerId);
  return items.filter(p => Number(p.commissionerId) === id);
}

export async function listProjectsByFreelancer(freelancerId: number | string): Promise<ProjectRecord[]> {
  const items = await readAllProjects();
  const id = Number(freelancerId);
  return items.filter(p => Number(p.freelancerId) === id);
}

export async function listProjectsByStatus(status: ProjectStatus): Promise<ProjectRecord[]> {
  const items = await readAllProjects();
  return items.filter(p => p.status === status);
}

// ---------- Helpers ----------
export function ensureProjectShape(record: any): ProjectRecord {
  if (!record || typeof record !== 'object') throw new Error('Invalid project object');
  const required: (keyof ProjectRecord)[] = ['projectId', 'status', 'invoicingMethod'];
  for (const k of required) {
    if ((record as any)[k] === undefined || (record as any)[k] === null) {
      throw new Error(`Missing required project field: ${String(k)}`);
    }
  }
  return record as ProjectRecord;
}

/**
 * Increment a project's paidToDate convenience field. Use only after successful payments.
 */
export async function bumpPaidToDate(projectId: number | string, amount: number): Promise<boolean> {
  const items = await readAllProjects();
  const id = Number(projectId);
  const idx = items.findIndex(p => Number(p.projectId) === id);
  if (idx === -1) return false;
  const current = Number(items[idx].paidToDate || 0);
  items[idx].paidToDate = current + Number(amount);
  items[idx].updatedAt = new Date().toISOString();
  await writeAllProjects(items);
  return true;
}