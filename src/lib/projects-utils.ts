// src/lib/projects-utils.ts
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

export interface Project {
  projectId: number;
  title: string;
  description: string;
  organizationId: number;
  typeTags: string[];
  commissionerId: number;
  freelancerId: number;
  status: string;
  dueDate: string;
  totalTasks: number;
  invoicingMethod: string;
  totalBudget?: number;
  upfrontCommitment?: number;
  manager?: {
    name: string;
    title: string;
    avatar: string;
    email: string;
  };
  createdAt?: string; // We'll add this during migration
}

export interface ProjectLocation {
  year: string;
  month: string;
  day: string;
  projectId: string;
}

/**
 * Parse date and return date components
 */
export function parseProjectDate(dateString: string): { year: string; month: string; day: string } {
  const date = new Date(dateString);
  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0')
  };
}

/**
 * Generate project file path based on creation date and project ID
 */
export function getProjectFilePath(createdAt: string, projectId: number): string {
  const { year, month, day } = parseProjectDate(createdAt);
  return path.join(
    process.cwd(),
    'data',
    'projects',
    year,
    month,
    day,
    projectId.toString(),
    'project.json'
  );
}

/**
 * Generate project metadata file path
 */
export function getProjectMetadataPath(): string {
  return path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
}

/**
 * Ensure directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Save a single project to hierarchical structure
 */
export async function saveProject(project: Project): Promise<void> {
  const createdAt = project.createdAt || new Date().toISOString();
  const filePath = getProjectFilePath(createdAt, project.projectId);
  const dirPath = path.dirname(filePath);
  
  await ensureDirectoryExists(dirPath);
  
  const projectData = {
    ...project,
    createdAt
  };
  
  await fsPromises.writeFile(filePath, JSON.stringify(projectData, null, 2));
  
  // Update projects index
  await updateProjectsIndex(project.projectId, createdAt);
}

/**
 * Update projects index with project location
 */
export async function updateProjectsIndex(projectId: number, createdAt: string): Promise<void> {
  const indexPath = getProjectMetadataPath();
  const indexDir = path.dirname(indexPath);
  
  await ensureDirectoryExists(indexDir);
  
  let index: Record<string, string> = {};
  
  try {
    if (fs.existsSync(indexPath)) {
      const data = await fsPromises.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading projects index:', error);
  }
  
  index[projectId.toString()] = createdAt;
  
  await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Read a single project from hierarchical structure
 */
export async function readProject(projectId: number): Promise<Project | null> {
  try {
    // First, get the creation date from the index
    const indexPath = getProjectMetadataPath();
    
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    const createdAt = index[projectId.toString()];
    
    if (!createdAt) {
      return null;
    }
    
    const filePath = getProjectFilePath(createdAt, projectId);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = await fsPromises.readFile(filePath, 'utf-8');
    const project = JSON.parse(data);
    
    return project;
  } catch (error) {
    console.error(`Error reading project ${projectId}:`, error);
    return null;
  }
}

/**
 * Read all projects from hierarchical structure
 * @deprecated Use UnifiedStorageService.listProjects() instead of readAllProjects
 */
export async function readAllProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  
  try {
    // Read the projects index to get all project locations
    const indexPath = getProjectMetadataPath();
    
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    // Read each project
    for (const [projectIdStr, createdAt] of Object.entries(index)) {
      const projectId = parseInt(projectIdStr);
      const project = await readProject(projectId);
      
      if (project) {
        projects.push(project);
      }
    }
    
    // Sort projects by creation date (newest first)
    return projects.sort((a, b) => {
      const dateA = new Date(a.createdAt || '').getTime();
      const dateB = new Date(b.createdAt || '').getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error reading all projects:', error);
    return [];
  }
}

/**
 * Update project data
 */
export async function updateProject(projectId: number, updates: Partial<Project>): Promise<void> {
  const existingProject = await readProject(projectId);
  
  if (!existingProject) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  const updatedProject = {
    ...existingProject,
    ...updates,
    projectId // Ensure projectId doesn't get overwritten
  };
  
  await saveProject(updatedProject);
}

/**
 * Delete a project from hierarchical structure
 */
export async function deleteProject(projectId: number): Promise<void> {
  try {
    // Get the creation date from the index
    const indexPath = getProjectMetadataPath();
    
    if (!fs.existsSync(indexPath)) {
      return;
    }
    
    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    const createdAt = index[projectId.toString()];
    
    if (!createdAt) {
      return;
    }
    
    // Remove the project file
    const filePath = getProjectFilePath(createdAt, projectId);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      
      // Try to remove empty directories
      const projectDir = path.dirname(filePath);
      try {
        await fsPromises.rmdir(projectDir);
      } catch (error) {
        // Directory not empty, ignore
      }
    }
    
    // Remove from index
    delete index[projectId.toString()];
    await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get projects by status
 */
export async function getProjectsByStatus(status: string): Promise<Project[]> {
  const allProjects = await readAllProjects();
  return allProjects.filter(project => project.status.toLowerCase() === status.toLowerCase());
}

/**
 * Get projects by freelancer ID
 */
export async function getProjectsByFreelancer(freelancerId: number): Promise<Project[]> {
  const allProjects = await readAllProjects();
  return allProjects.filter(project => project.freelancerId === freelancerId);
}

/**
 * Get projects by commissioner ID
 */
export async function getProjectsByCommissioner(commissionerId: number): Promise<Project[]> {
  const allProjects = await readAllProjects();
  return allProjects.filter(project => project.commissionerId === commissionerId);
}

// Migration functions removed - no longer needed since migration is complete
