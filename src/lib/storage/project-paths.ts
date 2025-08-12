// src/lib/storage/project-paths.ts

/**
 * Project Path Resolution
 *
 * Resolves project locations using index → hierarchical scan → legacy fallback.
 * Prefers hierarchical storage as canonical format.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { fileExists, readJson } from '../fs-json';
import { /* loadProjectsIndex, */ saveIndexEntry, getIndexEntry } from './projects-index';

export interface ProjectPathResolution {
  canonicalPath: string; // e.g., "2025/07/29/302" or "302" (legacy)
  source: 'index' | 'scan' | 'legacy-fallback';
}

const DATA_PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

/**
 * Get hierarchical project path if it exists in the expected location
 */
export async function getHierarchicalProjectPath(projectId: number): Promise<string | null> {
  // First check index
  const indexEntry = await getIndexEntry(projectId);
  if (indexEntry) {
    const projectFile = path.join(DATA_PROJECTS_DIR, indexEntry.path, 'project.json');
    if (await fileExists(projectFile)) {
      return indexEntry.path;
    }
    // Index entry exists but file is missing - index is stale
    console.warn(`Index entry for project ${projectId} points to missing file: ${projectFile}`);
    // Note: if you add a deleteIndexEntry(projectId) helper, call it here to clean stale entries.
  }

  // Scan hierarchical structure: data/projects/YYYY/MM/DD/*/project.json
  return await scanHierarchyForProject(projectId);
}

/**
 * Get legacy project path if it exists
 */
export async function getLegacyProjectPath(projectId: number): Promise<string | null> {
  const legacyPath = path.join(DATA_PROJECTS_DIR, String(projectId), 'project.json');
  if (await fileExists(legacyPath)) {
    return String(projectId);
  }
  return null;
}

/**
 * Resolve canonical project path using the fallback hierarchy
 */
export async function resolveCanonicalProjectPath(projectId: number): Promise<ProjectPathResolution | null> {
  // 1) Try index first
  const indexEntry = await getIndexEntry(projectId);
  if (indexEntry) {
    const projectFile = path.join(DATA_PROJECTS_DIR, indexEntry.path, 'project.json');
    if (await fileExists(projectFile)) {
      return { canonicalPath: indexEntry.path, source: 'index' };
    }
    // Optional: clean stale entry here if you expose a deleteIndexEntry
  }

  // 2) Try hierarchical scan
  const hierarchicalPath = await scanHierarchyForProject(projectId);
  if (hierarchicalPath) {
    // Update index with found path
    await saveIndexEntry(projectId, hierarchicalPath);
    return { canonicalPath: hierarchicalPath, source: 'scan' };
  }

  // 3) Try legacy fallback
  const legacyPath = await getLegacyProjectPath(projectId);
  if (legacyPath) {
    return { canonicalPath: legacyPath, source: 'legacy-fallback' };
  }

  // Not found
  return null;
}

/**
 * Scan hierarchical directory structure for a project
 */
async function scanHierarchyForProject(projectId: number): Promise<string | null> {
  try {
    // Fast-exit if root doesn't exist (avoids ENOENT on fresh installs)
    const rootExists = await fileExists(DATA_PROJECTS_DIR);
    if (!rootExists) return null;

    const years = await fs.readdir(DATA_PROJECTS_DIR, { withFileTypes: true });

    for (const y of years) {
      if (!y.isDirectory() || !/^\d{4}$/.test(y.name)) continue;

      const yearPath = path.join(DATA_PROJECTS_DIR, y.name);
      const months = await fs.readdir(yearPath, { withFileTypes: true });

      for (const m of months) {
        if (!m.isDirectory() || !/^\d{2}$/.test(m.name)) continue;

        const monthPath = path.join(yearPath, m.name);
        const days = await fs.readdir(monthPath, { withFileTypes: true });

        for (const d of days) {
          if (!d.isDirectory() || !/^\d{2}$/.test(d.name)) continue;

          const dayPath = path.join(monthPath, d.name);
          const projects = await fs.readdir(dayPath, { withFileTypes: true });

          for (const p of projects) {
            if (!p.isDirectory() || !/^\d+$/.test(p.name)) continue;

            const projectPath = path.join(dayPath, p.name, 'project.json');
            try {
              if (await fileExists(projectPath)) {
                const projectData = await readJson<{ projectId?: number; id?: number }>(projectPath, {});
                const foundProjectId = projectData.projectId ?? projectData.id ?? null;

                // Compare as numbers to avoid "302" vs 302 mismatches
                if (typeof foundProjectId === 'number' && foundProjectId === projectId) {
                  return `${y.name}/${m.name}/${d.name}/${p.name}`;
                }
              }
            } catch {
              // Skip invalid/corrupt files and keep scanning
              continue;
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to scan hierarchy for project ${projectId}:`, error);
  }
  return null;
}

/**
 * Derive hierarchical path from project creation date
 */
export function deriveHierarchicalPath(projectId: number, createdAt: string): string {
  const date = new Date(createdAt);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}/${projectId}`;
}

/**
 * Get full file system path for a canonical path
 */
export function getFullProjectPath(canonicalPath: string): string {
  return path.join(DATA_PROJECTS_DIR, canonicalPath, 'project.json');
}

/**
 * Validate that a path follows hierarchical format
 */
export function isHierarchicalPath(canonicalPath: string): boolean {
  return /^\d{4}\/\d{2}\/\d{2}\/\d+$/.test(canonicalPath);
}

/**
 * Validate that a path follows legacy format
 */
export function isLegacyPath(canonicalPath: string): boolean {
  return /^\d+$/.test(canonicalPath);
}