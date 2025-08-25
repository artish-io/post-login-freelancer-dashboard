// src/lib/projects-utils.ts
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Throttle warnings to prevent spam
const warnedProjects = new Set<string>();

export interface Project {
  projectId: string;
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
  createdAt?: string;

  // 🛡️ DURATION GUARD: Date separation and duration persistence types
  gigId?: number;
  gigPostedDate?: string;
  projectActivatedAt?: string;
  originalDuration?: {
    deliveryTimeWeeks?: number;
    estimatedHours?: number;
    originalStartDate?: string;
    originalEndDate?: string;
  };
  // Legacy fields for backward compatibility
  deliveryTimeWeeks?: number;
  estimatedHours?: number;
}

export interface ProjectLocation {
  year: string;
  month: string;
  day: string;
  projectId: string;
}

/**
 * Parse date and return date components using UTC to match storage format
 */
export function parseProjectDate(dateString: string): { year: string; month: string; day: string } {
  const date = new Date(dateString);
  return {
    year: date.getUTCFullYear().toString(),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0')
  };
}

/**
 * Generate project file path based on creation date and project ID
 */
export function getProjectFilePath(createdAt: string, projectId: string | number): string {
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
export async function updateProjectsIndex(projectId: string | number, createdAt: string): Promise<void> {
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
export async function readProject(projectId: string | number): Promise<Project | null> {
  try {
    // First, get the creation date from the index
    const indexPath = getProjectMetadataPath();

    if (!fs.existsSync(indexPath)) {
      console.warn(`[readProject] Index file not found: ${indexPath}`);
      return null;
    }

    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    const createdAt = index[projectId.toString()];

    if (!createdAt) {
      // Fallback: Try to find project by scanning filesystem
      console.log(`[readProject] Project ${projectId} not in index, scanning filesystem...`);
      const scannedProject = await scanForProject(projectId);

      if (scannedProject) {
        // Auto-repair: Add found project back to index
        await addProjectToIndex(projectId, scannedProject.createdAt);
        console.log(`[readProject] Auto-repaired index for project ${projectId}`);
        return scannedProject;
      }

      // Use throttled warning only if project truly doesn't exist
      const projectIdStr = projectId.toString();
      if (!warnedProjects.has(projectIdStr)) {
        console.warn(`[readProject] Project ${projectId} not found anywhere. Available projects: ${Object.keys(index).slice(0, 10).join(', ')}${Object.keys(index).length > 10 ? '...' : ''}`);
        warnedProjects.add(projectIdStr);
        setTimeout(() => warnedProjects.delete(projectIdStr), 5 * 60 * 1000);
      }
      return null;
    }

    const filePath = getProjectFilePath(createdAt, projectId);

    if (!fs.existsSync(filePath)) {
      // Auto-heal: Remove stale entry from index
      console.warn(`[readProject] Project ${projectId} file not found, removing from index: ${filePath}`);
      await removeProjectFromIndex(projectId);
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
export async function updateProject(projectId: string | number, updates: Partial<Project>): Promise<void> {
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

/**
 * Remove a project from the index (auto-healing)
 */
export async function removeProjectFromIndex(projectId: string | number): Promise<void> {
  try {
    const indexPath = getProjectMetadataPath();

    if (!fs.existsSync(indexPath)) {
      return;
    }

    const indexData = await fsPromises.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);

    delete index[projectId.toString()];

    await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`[removeProjectFromIndex] Auto-removed stale project ${projectId} from index`);
  } catch (error) {
    console.error(`Error removing project ${projectId} from index:`, error);
  }
}

/**
 * Add a project to the index (auto-repair)
 */
export async function addProjectToIndex(projectId: number, createdAt: string): Promise<void> {
  try {
    const indexPath = getProjectMetadataPath();

    // Ensure metadata directory exists
    const metadataDir = path.dirname(indexPath);
    if (!fs.existsSync(metadataDir)) {
      await fsPromises.mkdir(metadataDir, { recursive: true });
    }

    let index = {};
    if (fs.existsSync(indexPath)) {
      const indexData = await fsPromises.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexData);
    }

    index[projectId.toString()] = createdAt;

    await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`[addProjectToIndex] Auto-added project ${projectId} to index`);
  } catch (error) {
    console.error(`Error adding project ${projectId} to index:`, error);
  }
}

/**
 * Scan filesystem for a project (resilient fallback)
 * This is the fallback when index lookup fails
 */
export async function scanForProject(projectId: number): Promise<Project | null> {
  try {
    const projectsBasePath = path.join(process.cwd(), 'data', 'projects');

    // Scan recent years first (most likely locations)
    const currentYear = new Date().getFullYear();
    const yearsToScan = [currentYear, currentYear - 1, currentYear - 2];

    for (const year of yearsToScan) {
      const yearPath = path.join(projectsBasePath, year.toString());
      if (!fs.existsSync(yearPath)) continue;

      try {
        const months = await fsPromises.readdir(yearPath);
        for (const month of months) {
          if (month === 'metadata') continue; // Skip metadata directory

          const monthPath = path.join(yearPath, month);
          const monthStat = await fsPromises.stat(monthPath);
          if (!monthStat.isDirectory()) continue;

          const days = await fsPromises.readdir(monthPath);
          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dayStat = await fsPromises.stat(dayPath);
            if (!dayStat.isDirectory()) continue;

            const projectPath = path.join(dayPath, projectId.toString(), 'project.json');
            if (fs.existsSync(projectPath)) {
              const data = await fsPromises.readFile(projectPath, 'utf-8');
              const project = JSON.parse(data);
              console.log(`[scanForProject] Found orphaned project ${projectId} at ${projectPath}`);
              return project;
            }
          }
        }
      } catch (error) {
        console.warn(`[scanForProject] Error scanning year ${year}:`, error.message);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`[scanForProject] Filesystem scan failed for project ${projectId}:`, error);
    return null;
  }
}

// Migration functions removed - no longer needed since migration is complete
