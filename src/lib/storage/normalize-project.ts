// src/lib/storage/normalize-project.ts

/**
 * Project Normalization and Reading Utilities
 * 
 * Provides canonical project reading functionality that works with both
 * hierarchical and legacy storage formats.
 */

import { readJson, writeJsonAtomic, ensureDir } from '../fs-json';
import { readProject as readProjectFromUtils } from '../projects-utils';

/**
 * Read a project using canonical resolution
 * Delegates to the existing implementation in projects-utils.ts
 */
export async function readProject(projectId: number) {
  return await readProjectFromUtils(projectId);
}
