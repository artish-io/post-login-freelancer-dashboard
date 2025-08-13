// src/lib/storage/root.ts

/**
 * Storage Root Utilities
 *
 * Provides centralized path resolution for hierarchical storage.
 * Handles DATA_ROOT environment variable for test sandboxing.
 */

import path from 'path';

/**
 * Get the data root directory
 * Uses DATA_ROOT environment variable if set, otherwise defaults to data/ in project root
 */
export const DATA_ROOT = process.env.DATA_ROOT 
  ? path.resolve(process.env.DATA_ROOT) 
  : path.join(process.cwd(), 'data');

/**
 * Generate a path relative to the data root
 * @param segments Path segments to join
 * @returns Absolute path within the data root
 */
export function dataPath(...segments: string[]): string {
  return path.join(DATA_ROOT, ...segments);
}
