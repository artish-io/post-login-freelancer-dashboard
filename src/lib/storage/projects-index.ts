// src/lib/storage/projects-index.ts

/**
 * Projects Index Management
 *
 * Maintains a canonical index of project locations to avoid expensive
 * hierarchical scans. Index maps projectId → { path, lastUpdated }.
 */

import path from 'path';
import { readJson, writeJsonAtomic, fileExists } from '../fs-json';
import { isHierarchicalPath, isLegacyPath } from './project-paths';

export interface ProjectIndexEntry {
  path: string;       // e.g., "2025/07/29/302" or "302" (legacy)
  lastUpdated: string; // ISO timestamp
}

export type ProjectsIndex = Record<string, ProjectIndexEntry>;

// In-memory cache with TTL
interface CacheEntry {
  data: ProjectsIndex;
  timestamp: number;
}

let indexCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const INDEX_FILE_PATH = path.join(process.cwd(), 'data', 'projects-index.json');

/** Normalize + validate a canonical path before persisting to index */
function normalizeCanonicalPath(p: string): string {
  // Normalize slashes and trim
  const cleaned = p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!(isHierarchicalPath(cleaned) || isLegacyPath(cleaned))) {
    throw new Error(`Invalid canonical project path for index: "${p}"`);
  }
  return cleaned;
}

/**
 * Load projects index from disk with in-memory caching
 */
export async function loadProjectsIndex(): Promise<ProjectsIndex> {
  // Check cache first
  if (indexCache && (Date.now() - indexCache.timestamp) < CACHE_TTL_MS) {
    return indexCache.data;
  }

  try {
    if (await fileExists(INDEX_FILE_PATH)) {
      const data = await readJson<ProjectsIndex>(INDEX_FILE_PATH, {});
      // Update cache
      indexCache = { data, timestamp: Date.now() };
      return data;
    }
  } catch (error) {
    console.warn('Failed to load projects index, creating empty:', error);
  }

  // Return empty index if file doesn't exist or failed to load
  const emptyIndex: ProjectsIndex = {};
  indexCache = { data: emptyIndex, timestamp: Date.now() };
  return emptyIndex;
}

/**
 * Save projects index to disk and update cache
 */
export async function saveProjectsIndex(index: ProjectsIndex): Promise<void> {
  await writeJsonAtomic(INDEX_FILE_PATH, index);
  // Update cache coherently
  indexCache = { data: index, timestamp: Date.now() };
}

/**
 * Add or update a single project entry in the index
 * - Validates canonical path format
 * - Optionally verifies the on-disk project.json exists (opt-in)
 */
export async function saveIndexEntry(
  projectId: number,
  projectPath: string,
  opts?: { verifyOnDisk?: boolean }
): Promise<void> {
  const canonical = normalizeCanonicalPath(projectPath);

  if (opts?.verifyOnDisk) {
    const fullFile = path.join(process.cwd(), 'data', 'projects', canonical, 'project.json');
    if (!(await fileExists(fullFile))) {
      throw new Error(`Refusing to index non-existent project file: ${fullFile}`);
    }
  }

  const index = await loadProjectsIndex();
  index[String(projectId)] = {
    path: canonical,
    lastUpdated: new Date().toISOString()
  };
  await saveProjectsIndex(index);
}

/**
 * Remove a project entry from the index
 */
export async function removeIndexEntry(projectId: number): Promise<void> {
  const index = await loadProjectsIndex();
  if (index[String(projectId)]) {
    delete index[String(projectId)];
    await saveProjectsIndex(index);
  }
}

/**
 * Get a specific project entry from the index
 */
export async function getIndexEntry(projectId: number): Promise<ProjectIndexEntry | null> {
  const index = await loadProjectsIndex();
  return index[String(projectId)] || null;
}

/**
 * Return a shallow copy of the index (for diagnostics/tests)
 */
export async function listIndexEntries(): Promise<Array<{ projectId: number; path: string; lastUpdated: string }>> {
  const index = await loadProjectsIndex();
  return Object.entries(index).map(([id, v]) => ({
    projectId: Number(id),
    path: v.path,
    lastUpdated: v.lastUpdated
  }));
}

/**
 * Touch (update lastUpdated) for a project entry if present
 */
export async function touchIndexEntry(projectId: number): Promise<void> {
  const index = await loadProjectsIndex();
  const entry = index[String(projectId)];
  if (entry) {
    entry.lastUpdated = new Date().toISOString();
    await saveProjectsIndex(index);
  }
}

/**
 * Clear the in-memory cache (useful for testing)
 */
export function clearIndexCache(): void {
  indexCache = null;
}

/**
 * Invalidate cache timestamp (keep data) to force a reload next read
 */
export function invalidateIndexCache(): void {
  if (indexCache) indexCache.timestamp = 0;
}

/**
 * Get cache statistics for monitoring
 */
export function getIndexCacheStats(): { cached: boolean; age: number | null; entries: number } {
  if (!indexCache) return { cached: false, age: null, entries: 0 };
  return {
    cached: true,
    age: Date.now() - indexCache.timestamp,
    entries: Object.keys(indexCache.data).length
  };
}