// src/lib/storage/projects-index.ts

/**
 * Projects Index Management
 *
 * Manages the projects index for hierarchical storage lookup.
 * Maps project IDs to their hierarchical storage paths.
 */

import { readJson, writeJsonAtomic, fileExists } from '../fs-json';
import { updateProjectsIndex } from '../projects-utils';

/**
 * Save an entry to the projects index
 * Delegates to the existing implementation in projects-utils.ts
 */
export async function saveIndexEntry(projectId: number, hierarchicalPath: string): Promise<void> {
  // Extract the creation date from the hierarchical path
  // Path format: "2025/07/29/302" -> createdAt should be "2025-07-29"
  const pathParts = hierarchicalPath.split('/');
  if (pathParts.length >= 3) {
    const [year, month, day] = pathParts;
    const createdAt = `${year}-${month}-${day}T00:00:00.000Z`;
    await updateProjectsIndex(projectId, createdAt);
  }
}