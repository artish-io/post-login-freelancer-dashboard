/**
 * Unified Storage Service
 *
 * Single source of truth for all data operations with hierarchical storage.
 * Provides atomic writes, validation, mutex locking, and legacy compatibility.
 *
 * Features:
 * - Atomic file operations with temp file + rename
 * - Zod schema validation on all writes
 * - Per-file mutex for thread safety
 * - Hierarchical path generation from createdAt
 * - Index synchronization on all operations
 * - Read-only legacy fallback with warnings
 * - Structured error handling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { z } from 'zod';

// Throttle warnings to prevent spam
const warnedProjects = new Set<number>();

// Import schemas
import { ProjectSchema, ProjectTaskSchema, parseProject, parseTask } from './schemas';

// Import utilities
import { writeJsonAtomic, fileExists, ensureDir } from '../fs-json';
import { readProjectTasks } from '@/lib/project-tasks/hierarchical-storage';

// Logger utility
interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.DEBUG_STORAGE === '1') {
      console.log(`[UnifiedStorage] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[UnifiedStorage] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[UnifiedStorage] ${message}`, ...args);
  }
};

// Types
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectTask = z.infer<typeof ProjectTaskSchema>;

// Type aliases for backward compatibility
export type UnifiedProject = Project;
export type UnifiedTask = ProjectTask;

// File mutex for thread safety
const fileLocks = new Map<string, Promise<void>>();

// Legacy warning tracking removed - no more legacy fallbacks

/**
 * Core utility functions for path generation and file operations
 */

/**
 * Generate hierarchical path for a project
 */
export function getProjectPath(project: { id: string | number; createdAt: string }): string {
  const date = new Date(project.createdAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return path.join(
    process.cwd(),
    'data',
    'projects',
    year.toString(),
    month,
    day,
    project.id.toString(),
    'project.json'
  );
}

/**
 * Generate hierarchical path for a task
 */
export function getTaskPath(task: { id: string | number; projectId: string | number; createdAt: string }): string {
  const date = new Date(task.createdAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return path.join(
    process.cwd(),
    'data',
    'project-tasks',
    year.toString(),
    month,
    day,
    task.projectId.toString(),
    `${task.id}-task.json`
  );
}

/**
 * Atomic write with file locking
 */
async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  await withFileLock(filePath, async () => {
    await ensureDir(path.dirname(filePath));
    await writeJsonAtomic(filePath, data);
    logger.info(`Wrote file: ${filePath}`);
  });
}

/**
 * File locking mechanism to prevent concurrent writes
 */
async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const lockKey = path.resolve(filePath);

  // Wait for any existing lock
  while (fileLocks.has(lockKey)) {
    await fileLocks.get(lockKey);
  }

  // Create new lock
  const lockPromise = (async () => {
    try {
      return await fn();
    } finally {
      fileLocks.delete(lockKey);
    }
  })();

  fileLocks.set(lockKey, lockPromise.then(() => {}));
  return lockPromise;
}

/**
 * Ensure directories exist
 */
async function ensureDirs(dirPath: string): Promise<void> {
  await ensureDir(dirPath);
}

/**
 * Legacy compatibility functions (read-only with warnings)
 */

// Legacy read functions removed - no more fallback to flat files
// This ensures the system fails fast when data is missing from hierarchical storage

/**
 * Index management functions
 */

/**
 * Update project indexes atomically
 */
async function updateProjectIndexes(project: Project): Promise<void> {
  const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
  const metadataIndexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');

  await withFileLock(indexPath, async () => {
    // Update main index
    let index: Record<string, string> = {};
    if (await fileExists(indexPath)) {
      const data = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    }

    index[project.projectId.toString()] = project.createdAt;
    await atomicWrite(indexPath, index);

    // Update metadata index
    await ensureDir(path.dirname(metadataIndexPath));
    await atomicWrite(metadataIndexPath, index);

    logger.info(`Updated project indexes for project ${project.projectId}`);
  });
}

/**
 * Update task indexes atomically
 */
async function updateTaskIndexes(task: ProjectTask): Promise<void> {
  const indexPath = path.join(process.cwd(), 'data', 'project-tasks', 'metadata', 'tasks-index.json');

  await withFileLock(indexPath, async () => {
    let index: Record<string, { projectId: number; createdAt: string }> = {};

    if (await fileExists(indexPath)) {
      const data = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    }

    index[task.taskId.toString()] = {
      projectId: task.projectId,
      createdAt: task.createdDate
    };

    await ensureDir(path.dirname(indexPath));

    // Use writeJsonAtomic directly instead of atomicWrite to avoid nested locking
    await writeJsonAtomic(indexPath, index);

    logger.info(`Updated task indexes for task ${task.taskId}`);
  });
}

/**
 * Unified Storage Service Class
 * Provides all CRUD operations for projects and tasks
 */
export class UnifiedStorageService {

  // ==================== PROJECT OPERATIONS ====================

  /**
   * Read a project by ID
   */
  static async readProject(projectId: string | number): Promise<Project | null> {
    try {
      // First try to find in hierarchical storage using index
      const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
      if (await fileExists(indexPath)) {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexData);
        const createdAt = index[projectId.toString()];

        if (createdAt) {
          const projectPath = getProjectPath({ id: projectId, createdAt });
          if (await fileExists(projectPath)) {
            const data = await fs.readFile(projectPath, 'utf-8');
            return parseProject(JSON.parse(data));
          }
        }
      }

      // Graceful degradation - project not found but don't spam logs
      // This is normal in production when users delete/archive projects
      if (!warnedProjects.has(projectId)) {
        logger.info(`[UnifiedStorage] Project ${projectId} not found (may have been deleted/archived)`);
        warnedProjects.add(projectId);
        // Clear the warning after 5 minutes to allow retry
        setTimeout(() => warnedProjects.delete(projectId), 5 * 60 * 1000);
      }
      return null;
    } catch (error) {
      logger.error(`Error reading project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Write a project with validation and index updates
   */
  static async writeProject(project: Project): Promise<void> {
    try {
      // Validate project data
      const validatedProject = parseProject(project);

      // Ensure createdAt is set
      if (!validatedProject.createdAt) {
        validatedProject.createdAt = new Date().toISOString();
      }

      // Set updatedAt
      validatedProject.updatedAt = new Date().toISOString();

      // Write to hierarchical storage
      const projectPath = getProjectPath({
        id: validatedProject.projectId,
        createdAt: validatedProject.createdAt
      });
      await atomicWrite(projectPath, validatedProject);

      // Update indexes
      await updateProjectIndexes(validatedProject);

      logger.info(`Wrote project ${validatedProject.projectId}`);
    } catch (error) {
      logger.error(`Error writing project ${project.projectId}:`, error);
      throw error;
    }
  }

  /**
   * Read a task by project and task ID
   */
  static async readTask(projectId: string | number, taskId: string | number): Promise<ProjectTask | null> {
    try {
      // First try to find in hierarchical storage using task index
      const indexPath = path.join(process.cwd(), 'data', 'project-tasks', 'metadata', 'tasks-index.json');
      if (await fileExists(indexPath)) {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexData);
        const taskInfo = index[taskId.toString()];

        if (taskInfo && taskInfo.projectId === Number(projectId)) {
          const taskPath = getTaskPath({
            id: taskId,
            projectId: projectId,
            createdAt: taskInfo.createdAt
          });
          if (await fileExists(taskPath)) {
            const data = await fs.readFile(taskPath, 'utf-8');
            return parseTask(JSON.parse(data));
          }
        }
      }

      // No legacy fallback - fail fast if task not found in hierarchical storage
      logger.warn(`Task ${taskId} not found in hierarchical storage for project ${projectId}`);
      return null;
    } catch (error) {
      logger.error(`Error reading task ${taskId} from project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Write a task with validation and index updates
   */
  static async writeTask(task: ProjectTask): Promise<void> {
    try {
      // Validate task data
      const validatedTask = parseTask(task);

      // Ensure createdDate is set
      if (!validatedTask.createdDate) {
        validatedTask.createdDate = new Date().toISOString();
      }

      // Set lastModified
      validatedTask.lastModified = new Date().toISOString();

      // Write to hierarchical storage
      const taskPath = getTaskPath({
        id: validatedTask.taskId,
        projectId: validatedTask.projectId,
        createdAt: validatedTask.createdDate
      });

      await atomicWrite(taskPath, validatedTask);

      // Update indexes
      await updateTaskIndexes(validatedTask);

      logger.info(`Wrote task ${validatedTask.taskId} for project ${validatedTask.projectId}`);
    } catch (error) {
      logger.error(`Error writing task ${task.taskId}:`, error);
      throw error;
    }
  }

  /**
   * Save a task (alias for writeTask for backward compatibility)
   */
  static async saveTask(task: ProjectTask): Promise<void> {
    return await UnifiedStorageService.writeTask(task);
  }

  /**
   * Get a task by composite ID (projectId, taskId) - PREFERRED METHOD
   */
  static async getTaskByCompositeId(projectId: number, taskId: number): Promise<ProjectTask | null> {
    try {
      // Import tasks-paths utilities dynamically to avoid circular dependency
      const { readProjectTasks } = await import('./tasks-paths');
      const tasks = await readProjectTasks(projectId);
      const task = tasks.find(t => (t.id ?? t.taskId) === taskId);

      if (!task) {
        logger.warn(`Task ${taskId} not found in project ${projectId}`);
        return null;
      }

      // Convert to ProjectTask format if needed
      return parseTask(task);
    } catch (error) {
      logger.error(`Error getting task ${taskId} from project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get a task by ID (searches across all projects) - LEGACY COMPATIBILITY
   * @deprecated Use getTaskByCompositeId(projectId, taskId) instead
   */
  static async getTaskById(taskId: number | string): Promise<ProjectTask | null> {
    try {
      // Try to find in hierarchical storage using task index
      const indexPath = path.join(process.cwd(), 'data', 'project-tasks', 'metadata', 'tasks-index.json');
      if (await fileExists(indexPath)) {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexData);
        const taskInfo = index[taskId.toString()];

        if (taskInfo && taskInfo.projectId) {
          // Use composite lookup for better reliability
          return await UnifiedStorageService.getTaskByCompositeId(taskInfo.projectId, Number(taskId));
        }
      }

      // No fallback search - if not in index, task doesn't exist
      logger.warn(`Task ${taskId} not found in task index`);
      return null;
    } catch (error) {
      logger.error(`Error getting task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Get a project by ID (alias for readProject)
   */
  static async getProjectById(projectId: number | string): Promise<Project | null> {
    return await UnifiedStorageService.readProject(projectId);
  }

  /**
   * Get all tasks for a project (alias for listTasks with projectId filter)
   */
  static async getTasksByProject(projectId: number | string): Promise<ProjectTask[]> {
    return await UnifiedStorageService.listTasks(projectId);
  }

  /**
   * List projects with optional filtering
   */
  static async listProjects(filters?: {
    status?: string;
    freelancerId?: number;
    commissionerId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      const projects: Project[] = [];

      // Read from index to avoid full directory scans
      const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
      if (await fileExists(indexPath)) {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexData);

        const projectIds = Object.keys(index);
        let filteredIds = projectIds;

        // Apply pagination early if no other filters
        if (filters?.offset || filters?.limit) {
          const offset = filters.offset || 0;
          const limit = filters.limit || 100;
          filteredIds = projectIds.slice(offset, offset + limit);
        }

        // Read projects
        for (const projectId of filteredIds) {
          const project = await UnifiedStorageService.readProject(projectId);
          if (project) {
            // Apply filters
            if (filters?.status && project.status !== filters.status) continue;
            if (filters?.freelancerId && project.freelancerId !== filters.freelancerId) continue;
            if (filters?.commissionerId && project.commissionerId !== filters.commissionerId) continue;

            projects.push(project);
          }
        }
      }

      // Sort by creation date (newest first)
      return projects.sort((a, b) => {
        const dateA = new Date(a.createdAt || '').getTime();
        const dateB = new Date(b.createdAt || '').getTime();
        return dateB - dateA;
      });
    } catch (error) {
      logger.error('Error listing projects:', error);
      return [];
    }
  }

  /**
   * List tasks for a project with optional filtering
   */
  static async listTasks(projectId: string | number, filters?: {
    status?: string;
    completed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProjectTask[]> {
    try {
      // Use the new hierarchical storage approach
      const { readProjectTasks } = await import('./tasks-paths');
      let tasks = await readProjectTasks(Number(projectId));

      // Convert to ProjectTask format and apply filters
      let filteredTasks = tasks
        .map(task => parseTask(task))
        .filter(task => {
          if (filters?.status && task.status !== filters.status) return false;
          if (filters?.completed !== undefined && task.completed !== filters.completed) return false;
          return true;
        });

      // Apply pagination
      if (filters?.offset || filters?.limit) {
        const offset = filters.offset || 0;
        const limit = filters.limit || 100;
        filteredTasks = filteredTasks.slice(offset, offset + limit);
      }

      // Sort by order, then creation date
      return filteredTasks.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        const dateA = new Date(a.createdDate || '').getTime();
        const dateB = new Date(b.createdDate || '').getTime();
        return dateA - dateB;
      });
    } catch (error) {
      logger.error(`Error listing tasks for project ${projectId}:`, error);
      return [];
    }
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Get all users from hierarchical storage
   */
  static async getAllUsers(): Promise<any[]> {
    try {
      const { loadUsersIndex } = await import('./users-index');
      const { readUser } = await import('./normalize-user');

      const usersIndex = await loadUsersIndex();
      const users: any[] = [];

      for (const userId of Object.keys(usersIndex)) {
        try {
          const user = await readUser(parseInt(userId));
          users.push(user);
        } catch (error) {
          logger.warn(`Failed to read user ${userId}:`, error);
        }
      }

      return users;
    } catch (error) {
      logger.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * Get user by ID from hierarchical storage
   */
  static async getUserById(userId: number | string): Promise<any | null> {
    try {
      const { readUser } = await import('./normalize-user');
      return await readUser(userId);
    } catch (error) {
      logger.warn(`User ${userId} not found:`, error);
      return null;
    }
  }

  /**
   * Get user by email from hierarchical storage
   */
  static async getUserByEmail(email: string): Promise<any | null> {
    try {
      const users = await UnifiedStorageService.getAllUsers();
      return users.find(user => user.email?.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      logger.warn(`User with email ${email} not found:`, error);
      return null;
    }
  }

  /**
   * Authenticate user by username and password
   */
  static async authenticateUser(username: string, password: string): Promise<any | null> {
    try {
      const users = await UnifiedStorageService.getAllUsers();
      const user = users.find(u =>
        (u.username?.toLowerCase() === username.toLowerCase() ||
         u.email?.toLowerCase() === username.toLowerCase()) &&
        u.password === password
      );

      if (user) {
        // Remove password from returned user object for security
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      return null;
    } catch (error) {
      logger.error('Error during authentication:', error);
      return null;
    }
  }

  // ==================== FREELANCER OPERATIONS ====================

  /**
   * Get all freelancers from hierarchical storage
   */
  static async getAllFreelancers(): Promise<any[]> {
    try {
      const { loadFreelancersIndex } = await import('./freelancers-index');
      const { readFreelancer } = await import('./normalize-freelancer');

      const freelancersIndex = await loadFreelancersIndex();
      const freelancers: any[] = [];

      for (const freelancerId of Object.keys(freelancersIndex)) {
        try {
          const freelancer = await readFreelancer(parseInt(freelancerId));
          freelancers.push(freelancer);
        } catch (error) {
          logger.warn(`Failed to read freelancer ${freelancerId}:`, error);
        }
      }

      return freelancers;
    } catch (error) {
      logger.error('Error getting all freelancers:', error);
      return [];
    }
  }

  /**
   * Get freelancer by ID from hierarchical storage
   */
  static async getFreelancerById(freelancerId: number | string): Promise<any | null> {
    try {
      const { readFreelancer } = await import('./normalize-freelancer');
      return await readFreelancer(freelancerId);
    } catch (error) {
      logger.warn(`Freelancer ${freelancerId} not found:`, error);
      return null;
    }
  }

  /**
   * Get freelancer by user ID from hierarchical storage
   */
  static async getFreelancerByUserId(userId: number): Promise<any | null> {
    try {
      const { getFreelancerByUserId } = await import('./normalize-freelancer');
      return await getFreelancerByUserId(userId);
    } catch (error) {
      logger.warn(`Freelancer with userId ${userId} not found:`, error);
      return null;
    }
  }

  /**
   * Write freelancer to hierarchical storage
   */
  static async writeFreelancer(freelancer: any): Promise<void> {
    try {
      const { writeFreelancer } = await import('./normalize-freelancer');
      await writeFreelancer(freelancer);
    } catch (error) {
      logger.error(`Error writing freelancer ${freelancer.id}:`, error);
      throw error;
    }
  }

  // ==================== ORGANIZATION OPERATIONS ====================

  /**
   * Get all organizations from hierarchical storage
   */
  static async getAllOrganizations(): Promise<any[]> {
    try {
      const { loadOrganizationsIndex } = await import('./organizations-index');
      const { readOrganization } = await import('./normalize-organization');

      const organizationsIndex = await loadOrganizationsIndex();
      const organizations: any[] = [];

      for (const organizationId of Object.keys(organizationsIndex)) {
        try {
          const organization = await readOrganization(parseInt(organizationId));
          organizations.push(organization);
        } catch (error) {
          logger.warn(`Failed to read organization ${organizationId}:`, error);
        }
      }

      return organizations;
    } catch (error) {
      logger.error('Error getting all organizations:', error);
      return [];
    }
  }

  /**
   * Get organization by ID from hierarchical storage
   */
  static async getOrganizationById(organizationId: number | string): Promise<any | null> {
    try {
      const { readOrganization } = await import('./normalize-organization');
      return await readOrganization(organizationId);
    } catch (error) {
      logger.warn(`Organization ${organizationId} not found:`, error);
      return null;
    }
  }

  /**
   * Get organization by commissioner ID from hierarchical storage
   */
  static async getOrganizationByCommissionerId(commissionerId: number): Promise<any | null> {
    try {
      const { getOrganizationByCommissionerId } = await import('./normalize-organization');
      return await getOrganizationByCommissionerId(commissionerId);
    } catch (error) {
      logger.warn(`Organization with commissionerId ${commissionerId} not found:`, error);
      return null;
    }
  }

  /**
   * Write organization to hierarchical storage
   */
  static async writeOrganization(organization: any): Promise<void> {
    try {
      const { writeOrganization } = await import('./normalize-organization');
      await writeOrganization(organization);
    } catch (error) {
      logger.error(`Error writing organization ${organization.id}:`, error);
      throw error;
    }
  }

  /**
   * Associate a commissioner with an organization
   */
  static async associateCommissionerWithOrganization(organizationId: number | string, commissionerId: number): Promise<void> {
    try {
      const { associateCommissionerWithOrganization } = await import('./normalize-organization');
      await associateCommissionerWithOrganization(organizationId, commissionerId);
    } catch (error) {
      logger.error(`Error associating commissioner ${commissionerId} with organization ${organizationId}:`, error);
      throw error;
    }
  }

}

// Export convenience functions for backward compatibility
// Note: We need to bind these to maintain the 'this' context
export const readProject = UnifiedStorageService.readProject.bind(UnifiedStorageService);
export const writeProject = UnifiedStorageService.writeProject.bind(UnifiedStorageService);
export const listProjects = UnifiedStorageService.listProjects.bind(UnifiedStorageService);
export const readTask = UnifiedStorageService.readTask.bind(UnifiedStorageService);
export const writeTask = UnifiedStorageService.writeTask.bind(UnifiedStorageService);
export const saveTask = UnifiedStorageService.saveTask.bind(UnifiedStorageService);
export const getTaskById = UnifiedStorageService.getTaskById.bind(UnifiedStorageService);
export const getTaskByCompositeId = UnifiedStorageService.getTaskByCompositeId.bind(UnifiedStorageService);
export const getProjectById = UnifiedStorageService.getProjectById.bind(UnifiedStorageService);
export const getTasksByProject = UnifiedStorageService.getTasksByProject.bind(UnifiedStorageService);
export const listTasks = UnifiedStorageService.listTasks.bind(UnifiedStorageService);
export const getAllUsers = UnifiedStorageService.getAllUsers.bind(UnifiedStorageService);
export const getUserById = UnifiedStorageService.getUserById.bind(UnifiedStorageService);
export const getUserByEmail = UnifiedStorageService.getUserByEmail.bind(UnifiedStorageService);
export const authenticateUser = UnifiedStorageService.authenticateUser.bind(UnifiedStorageService);
export const getAllFreelancers = UnifiedStorageService.getAllFreelancers.bind(UnifiedStorageService);
export const getFreelancerById = UnifiedStorageService.getFreelancerById.bind(UnifiedStorageService);
export const getFreelancerByUserId = UnifiedStorageService.getFreelancerByUserId.bind(UnifiedStorageService);
export const writeFreelancer = UnifiedStorageService.writeFreelancer.bind(UnifiedStorageService);
export const getAllOrganizations = UnifiedStorageService.getAllOrganizations.bind(UnifiedStorageService);
export const getOrganizationById = UnifiedStorageService.getOrganizationById.bind(UnifiedStorageService);
export const getOrganizationByCommissionerId = UnifiedStorageService.getOrganizationByCommissionerId.bind(UnifiedStorageService);
export const writeOrganization = UnifiedStorageService.writeOrganization.bind(UnifiedStorageService);
export const associateCommissionerWithOrganization = UnifiedStorageService.associateCommissionerWithOrganization.bind(UnifiedStorageService);


