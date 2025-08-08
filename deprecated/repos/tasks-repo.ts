

// src/app/api/payments/repos/tasks-repo.ts
// JSON-backed repository for project tasks. Centralizes all I/O for task records.

import path from 'path';
import fs from 'fs/promises';

// Keep statuses aligned with domain/types.ts and your JSON: 'In review' casing matters.
export type TaskStatus = 'incomplete' | 'In review' | 'complete' | 'approved' | 'rejected';

export interface TaskRecord {
  id: number | string;      // unique task id
  projectId: number;        // owning project
  title?: string;           // optional display title
  status: TaskStatus;       // status enum
  completed?: boolean;      // some UIs set this alongside status
  assigneeId?: number;      // optional
  dueDate?: string;         // ISO date
  createdAt?: string;       // ISO date
  updatedAt?: string;       // ISO date
  // free-form metadata without breaking the repo
  [key: string]: any;
}

const TASKS_PATH = path.join(process.cwd(), 'data', 'project-tasks', 'tasks.json');

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
export async function readAllTasks(): Promise<TaskRecord[]> {
  return readJsonSafe<TaskRecord[]>(TASKS_PATH, []);
}

export async function writeAllTasks(records: TaskRecord[]): Promise<void> {
  await writeJson(TASKS_PATH, records);
}

export async function getTaskById(id: number | string): Promise<TaskRecord | undefined> {
  const items = await readAllTasks();
  const key = String(id);
  return items.find(t => String(t.id) === key);
}

export async function listTasksByProject(projectId: number | string): Promise<TaskRecord[]> {
  const items = await readAllTasks();
  const pid = Number(projectId);
  return items.filter(t => Number(t.projectId) === pid);
}

export async function addTask(record: TaskRecord): Promise<TaskRecord> {
  const items = await readAllTasks();
  const now = new Date().toISOString();
  const next: TaskRecord = {
    ...record,
    status: record.status ?? 'incomplete',
    completed: record.completed ?? false,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  } as TaskRecord;
  items.push(next);
  await writeAllTasks(items);
  return next;
}

export async function upsertTask(record: TaskRecord): Promise<TaskRecord> {
  const items = await readAllTasks();
  const idx = items.findIndex(t => String(t.id) === String(record.id));
  const now = new Date().toISOString();
  if (idx === -1) {
    const next: TaskRecord = {
      ...record,
      status: record.status ?? 'incomplete',
      completed: record.completed ?? false,
      createdAt: record.createdAt ?? now,
      updatedAt: now,
    } as TaskRecord;
    items.push(next);
    await writeAllTasks(items);
    return next;
  } else {
    items[idx] = { ...items[idx], ...record, updatedAt: now };
    await writeAllTasks(items);
    return items[idx];
  }
}

export async function updateTask(id: number | string, patch: Partial<TaskRecord>): Promise<boolean> {
  const items = await readAllTasks();
  const key = String(id);
  const idx = items.findIndex(t => String(t.id) === key);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeAllTasks(items);
  return true;
}

export async function deleteTask(id: number | string): Promise<boolean> {
  const items = await readAllTasks();
  const key = String(id);
  const next = items.filter(t => String(t.id) !== key);
  if (next.length === items.length) return false;
  await writeAllTasks(next);
  return true;
}

// ---------- Queries ----------
export async function listTasksByStatus(status: TaskStatus): Promise<TaskRecord[]> {
  const items = await readAllTasks();
  return items.filter(t => t.status === status);
}

export async function listTasksAwaitingFinal(projectId: number | string): Promise<TaskRecord[]> {
  // Helper for completion-method final eligibility: everything not complete/approved
  const items = await listTasksByProject(projectId);
  return items.filter(t => t.status !== 'complete' && t.status !== 'approved' && t.completed !== true);
}

// ---------- Helpers ----------
export function ensureTaskShape(record: any): TaskRecord {
  if (!record || typeof record !== 'object') throw new Error('Invalid task object');
  const required: (keyof TaskRecord)[] = ['id', 'projectId', 'status'];
  for (const k of required) {
    if ((record as any)[k] === undefined || (record as any)[k] === null) {
      throw new Error(`Missing required task field: ${String(k)}`);
    }
  }
  return record as TaskRecord;
}

/**
 * Approve a task: sets status to 'approved' and completed=true
 */
export async function approveTask(id: number | string): Promise<boolean> {
  const items = await readAllTasks();
  const key = String(id);
  const idx = items.findIndex(t => String(t.id) === key);
  if (idx === -1) return false;
  items[idx].status = 'approved';
  items[idx].completed = true;
  items[idx].updatedAt = new Date().toISOString();
  await writeAllTasks(items);
  return true;
}