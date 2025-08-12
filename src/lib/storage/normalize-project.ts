// src/lib/storage/normalize-project.ts

/**
 * Normalized Project Read/Write Operations
 *
 * Provides canonical project operations that handle hierarchical vs legacy storage.
 * All writes go to hierarchical paths; reads use fallback resolution.
 */

import path from 'path';
import { readJson, writeJsonAtomic, ensureDir } from '../fs-json';
import {
  resolveCanonicalProjectPath,
  deriveHierarchicalPath,
  getFullProjectPath,
  isLegacyPath
} from './project-paths';
import { saveIndexEntry } from './projects-index';

// Standard error codes for API responses
export class ProjectStorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public projectId?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProjectStorageError';
  }
}

export interface Project {
  projectId: number;
  title: string;
  status: string;
  invoicingMethod: 'milestone' | 'completion' | 'storefront';
  budget?: number;
  upfrontPercentage?: number;
  freelancerId: number;
  commissionerId: number;
  createdAt: string;
  updatedAt?: string;
  activatedAt?: string;
  completedAt?: string;
  // Allow additional properties (keep, some code may add extra fields)
  [key: string]: unknown;
}

export interface ProjectWithId extends Project {
  id: number;
}

/**
 * Read project using canonical path resolution
 */
export async function readProject(projectId: number): Promise<Project> {
  const resolution = await resolveCanonicalProjectPath(projectId);

  if (!resolution) {
    throw new ProjectStorageError(
      'PROJECT_NOT_FOUND',
      `Project ${projectId} not found`,
      projectId,
      { attemptedPaths: ['index', 'hierarchical-scan', 'legacy-fallback'] }
    );
  }

  const { canonicalPath, source } = resolution;
  const projectFile = getFullProjectPath(canonicalPath);

  try {
    // allow null default; we throw below if not found
    const project = await readJson<Project | null>(projectFile, null);

    if (!project) {
      throw new ProjectStorageError(
        'PROJECT_NOT_FOUND',
        `Project file exists but is empty: ${projectFile}`,
        projectId,
        { canonicalPath, source, projectFile }
      );
    }

    // Log resolution for monitoring
    console.log(`Project ${projectId} read from ${source}: ${canonicalPath}`);

    return project;
  } catch (error) {
    if (error instanceof ProjectStorageError) {
      throw error;
    }

    throw new ProjectStorageError(
      'STORAGE_IO_ERROR',
      `Failed to read project ${projectId}: ${error}`,
      projectId,
      { canonicalPath, source, projectFile, originalError: String(error) }
    );
  }
}

/**
 * Write project to hierarchical path only
 */
export async function writeProject(project: ProjectWithId | Project): Promise<void> {
  // make inference explicit to avoid TS edge cases with index signatures
  const projectId: number =
    'id' in project
      ? (project as ProjectWithId).id
      : (project as Project).projectId;

  if (!project.createdAt) {
    throw new ProjectStorageError(
      'INVALID_PROJECT_DATA',
      'Project must have createdAt field for hierarchical storage',
      projectId,
      { project: { projectId, title: (project as Project).title } }
    );
  }

  // Check if trying to write to legacy-only project
  const existingResolution = await resolveCanonicalProjectPath(projectId);
  if (existingResolution?.source === 'legacy-fallback') {
    throw new ProjectStorageError(
      'MIGRATION_REQUIRED',
      `Cannot write to legacy-only project ${projectId}. Migration required.`,
      projectId,
      {
        legacyPath: existingResolution.canonicalPath,
        message: 'Run migration script to move project to hierarchical storage'
      }
    );
  }

  // Derive hierarchical path from creation date
  const hierarchicalPath = deriveHierarchicalPath(projectId, (project as Project).createdAt);
  const projectFile = getFullProjectPath(hierarchicalPath);

  try {
    // Ensure directory exists
    await ensureDir(path.dirname(projectFile));

    // Prepare project data with updated timestamp
    const projectData = {
      ...project,
      projectId,
      updatedAt: new Date().toISOString()
    };

    // Write to hierarchical location
    await writeJsonAtomic(projectFile, projectData);

    // Update index
    await saveIndexEntry(projectId, hierarchicalPath);

    console.log(`Project ${projectId} written to hierarchical path: ${hierarchicalPath}`);
  } catch (error) {
    throw new ProjectStorageError(
      'STORAGE_IO_ERROR',
      `Failed to write project ${projectId}: ${error}`,
      projectId,
      { hierarchicalPath, projectFile, originalError: String(error) }
    );
  }
}

/**
 * Check if project exists
 */
export async function projectExists(projectId: number): Promise<boolean> {
  try {
    const resolution = await resolveCanonicalProjectPath(projectId);
    return resolution !== null;
  } catch {
    return false;
  }
}

/**
 * Get project storage info for debugging
 */
export async function getProjectStorageInfo(projectId: number): Promise<{
  exists: boolean;
  resolution: { canonicalPath: string; source: string } | null;
  isLegacy: boolean;
  requiresMigration: boolean;
}> {
  const resolution = await resolveCanonicalProjectPath(projectId);

  if (!resolution) {
    return {
      exists: false,
      resolution: null,
      isLegacy: false,
      requiresMigration: false
    };
  }

  const legacy = isLegacyPath(resolution.canonicalPath);

  return {
    exists: true,
    resolution,
    isLegacy: legacy,
    requiresMigration: legacy
  };
}

/**
 * Validate project data before write operations
 */
export function validateProjectData(project: Partial<Project>): void {
  // Narrow a safe projectId for error reporting to avoid `unknown` complaints
  const pid: number | undefined =
    typeof (project as any)?.projectId === 'number'
      ? ((project as any).projectId as number)
      : undefined;

  const required = [
    'projectId',
    'title',
    'status',
    'invoicingMethod',
    'freelancerId',
    'commissionerId',
    'createdAt'
  ];

  for (const field of required) {
    if (!(field in project) || project[field as keyof Project] === undefined) {
      throw new ProjectStorageError(
        'INVALID_PROJECT_DATA',
        `Missing required field: ${field}`,
        pid,
        { missingField: field, providedFields: Object.keys(project as Record<string, unknown>) }
      );
    }
  }

  // Validate invoicing method
  if (!['milestone', 'completion', 'storefront'].includes(project.invoicingMethod as string)) {
    throw new ProjectStorageError(
      'INVALID_PROJECT_DATA',
      `Invalid invoicing method: ${String(project.invoicingMethod)}`,
      pid,
      { invoicingMethod: project.invoicingMethod }
    );
  }

  // Validate completion invoicing requirements
  if (project.invoicingMethod === 'completion') {
    if (typeof project.budget !== 'number' || project.budget <= 0) {
      throw new ProjectStorageError(
        'INVALID_PROJECT_DATA',
        'Completion invoicing projects must have a positive budget',
        pid,
        { budget: project.budget }
      );
    }

    if (
      typeof project.upfrontPercentage !== 'number' ||
      project.upfrontPercentage < 0 ||
      project.upfrontPercentage > 100
    ) {
      throw new ProjectStorageError(
        'INVALID_PROJECT_DATA',
        'Completion invoicing projects must have upfrontPercentage between 0-100',
        pid,
        { upfrontPercentage: project.upfrontPercentage }
      );
    }
  }
}