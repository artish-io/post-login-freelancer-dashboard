// src/lib/storage/project-paths.ts

/**
 * Project Path Utilities
 *
 * Provides utilities for generating hierarchical storage paths for projects.
 */

import { fileExists, readJson } from '../fs-json';
import path from 'path';

/**
 * Derive hierarchical path for a project based on creation date
 */
export function deriveHierarchicalPath(projectId: number, createdAt: string): string {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return path.join(year.toString(), month, day, projectId.toString());
}