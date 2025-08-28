/**
 * Projects Repository - Compatibility Wrapper
 * 
 * This file provides backward compatibility for the deprecated repository pattern.
 * It wraps the new unified storage system to maintain API compatibility.
 * 
 * @deprecated Use UnifiedStorageService directly for new code
 */

import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import type { Project } from '@/lib/storage/schemas';

// Legacy project record interface for backward compatibility
export interface ProjectRecord {
  projectId: number | string;
  title: string;
  description?: string;
  organizationId?: number;
  typeTags?: string[];
  commissionerId: number;
  freelancerId: number;
  status: string;
  dueDate?: string;
  totalTasks?: number;
  invoicingMethod?: string;
  totalBudget?: number;
  upfrontCommitment?: number;
  paidToDate?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  manager?: {
    name: string;
    title: string;
    avatar: string;
    email: string;
  };
}

/**
 * Read all projects from hierarchical storage
 * @deprecated Use UnifiedStorageService.listProjects() instead
 */
export async function readAllProjects(): Promise<ProjectRecord[]> {
  try {
    console.warn('⚠️ Using deprecated readAllProjects from projects-repo. Consider migrating to UnifiedStorageService.');
    const projects = await UnifiedStorageService.listProjects();

    // Convert to legacy format for backward compatibility
    return projects.map((project: Project) => ({
      projectId: project.projectId,
      title: project.title,
      description: project.description,
      organizationId: project.organizationId,
      typeTags: project.typeTags || [],
      commissionerId: project.commissionerId || 0, // Provide default value
      freelancerId: project.freelancerId,
      status: project.status,
      dueDate: project.dueDate,
      totalTasks: project.totalTasks,
      invoicingMethod: project.invoicingMethod,
      totalBudget: project.totalBudget,
      upfrontCommitment: project.upfrontCommitment,
      paidToDate: project.paidToDate || 0,
      currency: project.currency || 'USD',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt || project.createdAt,
      manager: project.manager
    }));
  } catch (error) {
    console.error('Error reading projects from storage:', error);
    throw error;
  }
}

/**
 * Get project by ID from hierarchical storage
 * @deprecated Use UnifiedStorageService.readProject() instead
 */
export async function getProjectById(projectId: string | number): Promise<ProjectRecord | null> {
  try {
    console.warn('⚠️ Using deprecated getProjectById from projects-repo. Consider migrating to UnifiedStorageService.');
    const project = await UnifiedStorageService.readProject(projectId);

    if (!project) {
      return null;
    }

    // Convert to legacy format for backward compatibility
    return {
      projectId: project.projectId,
      title: project.title,
      description: project.description,
      organizationId: project.organizationId,
      typeTags: project.typeTags || [],
      commissionerId: project.commissionerId || 0, // Provide default value
      freelancerId: project.freelancerId,
      status: project.status,
      dueDate: project.dueDate,
      totalTasks: project.totalTasks,
      invoicingMethod: project.invoicingMethod,
      totalBudget: project.totalBudget,
      upfrontCommitment: project.upfrontCommitment,
      paidToDate: project.paidToDate || 0,
      currency: project.currency || 'USD',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt || project.createdAt,
      manager: project.manager
    };
  } catch (error) {
    console.error(`Error reading project ${projectId}:`, error);
    return null;
  }
}

/**
 * Create a new project
 * @deprecated Use UnifiedStorageService.writeProject() instead
 */
export async function createProject(project: Omit<ProjectRecord, 'createdAt' | 'updatedAt'>): Promise<ProjectRecord> {
  try {
    console.warn('⚠️ Using deprecated createProject from projects-repo. Consider migrating to UnifiedStorageService.');

    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      projectId: String(project.projectId), // Ensure projectId is string
      createdAt: now,
      updatedAt: now,
      status: project.status as any || 'proposed',
      invoicingMethod: project.invoicingMethod as any || 'completion'
    };

    await UnifiedStorageService.writeProject(newProject);

    // Return in legacy format
    return {
      ...project,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Update an existing project
 * @deprecated Use UnifiedStorageService.writeProject() instead
 */
export async function updateProject(projectId: string | number, updates: Partial<ProjectRecord>): Promise<ProjectRecord | null> {
  try {
    console.warn('⚠️ Using deprecated updateProject from projects-repo. Consider migrating to UnifiedStorageService.');

    const existingProject = await getProjectById(projectId);
    if (!existingProject) {
      return null;
    }

    const updatedProject: Project = {
      ...existingProject,
      ...updates,
      projectId: String(existingProject.projectId), // Ensure projectId is string
      updatedAt: new Date().toISOString(),
      status: (updates.status as any) || existingProject.status as any,
      invoicingMethod: (updates.invoicingMethod as any) || existingProject.invoicingMethod as any
    };

    await UnifiedStorageService.writeProject(updatedProject);

    // Return in legacy format
    return {
      ...existingProject,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Delete a project
 * @deprecated Use UnifiedStorageService for deletion instead
 */
export async function deleteProjectById(projectId: string | number): Promise<boolean> {
  try {
    console.warn('⚠️ Using deprecated deleteProjectById from projects-repo. Consider migrating to UnifiedStorageService.');
    // Note: UnifiedStorageService doesn't have delete yet, so we'll implement a basic version
    console.warn('Project deletion not fully implemented in UnifiedStorageService yet');
    return false;
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    return false;
  }
}
