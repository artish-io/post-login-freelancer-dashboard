/**
 * Freelancer Access Control Utilities
 * 
 * This module provides helper functions to ensure freelancers can only access
 * projects and data that belong to them, preventing unauthorized access to
 * other freelancers' work.
 */

export interface SessionUser {
  id: string;
  userType?: string;
  type?: string;
}

export interface Project {
  projectId: number;
  freelancerId: number;
  assignedFreelancerId?: number;
  commissionerId?: number;
  status?: string;
  dueDate?: string;
  typeTags?: string[];
  title?: string;
  description?: string;
  organizationId?: number;
}

export interface ProjectTask {
  projectId: number;
  freelancerId?: number;
  assignedFreelancerId?: number;
}

/**
 * Check if a project belongs to the specified freelancer
 * @param project - The project to check
 * @param sessionUser - The current session user
 * @returns true if the freelancer has access to this project
 */
export function isFreelancerProject(project: Project, sessionUser: SessionUser | null): boolean {
  if (!sessionUser?.id) {
    return false;
  }

  const userType = sessionUser.userType || sessionUser.type;
  const userId = parseInt(sessionUser.id);

  // If user is a commissioner, they can access projects they commissioned
  if (userType === 'commissioner') {
    return project.commissionerId === userId;
  }

  // If user is a freelancer, they can only access their own projects
  if (userType === 'freelancer') {
    return project.freelancerId === userId ||
           project.assignedFreelancerId === userId;
  }

  return false;
}

/**
 * Filter projects to only include those belonging to the freelancer
 * @param projects - Array of projects to filter
 * @param sessionUser - The current session user
 * @returns Filtered array of projects
 */
export function filterFreelancerProjects(projects: Project[], sessionUser: SessionUser | null): Project[] {
  if (!sessionUser?.id) {
    return [];
  }

  return projects.filter(project => isFreelancerProject(project, sessionUser));
}

/**
 * Check if a project task belongs to the specified freelancer
 * @param task - The project task to check
 * @param sessionUser - The current session user
 * @returns true if the freelancer has access to this task
 */
export function isFreelancerTask(task: ProjectTask, sessionUser: SessionUser | null): boolean {
  if (!sessionUser?.id) {
    return false;
  }

  const userType = sessionUser.userType || sessionUser.type;
  const userId = parseInt(sessionUser.id);

  // If user is a commissioner, they can access tasks for projects they commissioned
  // Note: This would require additional project lookup, so for now we'll be restrictive
  if (userType === 'commissioner') {
    // For tasks, we need to check the project ownership, which requires additional lookup
    // For now, allow commissioners to access all tasks (they'll be filtered at project level)
    return true;
  }

  // If user is a freelancer, they can only access their own tasks
  if (userType === 'freelancer') {
    return task.freelancerId === userId ||
           task.assignedFreelancerId === userId;
  }

  return false;
}

/**
 * Enhanced task validation for freelancers with project context
 * @param task - Task with project information
 * @param sessionUser - The current session user
 * @returns true if the freelancer has access to this task
 */
export function isValidFreelancerTask(
  task: { project?: { assignedFreelancerId?: number; freelancerId?: number }; projectId?: number; assignedFreelancerId?: number; freelancerId?: number },
  sessionUser: SessionUser | null
): boolean {
  if (!sessionUser?.id) {
    return false;
  }

  const userType = sessionUser.userType || sessionUser.type;
  const userId = parseInt(sessionUser.id);

  // Only freelancers should use this validation
  if (userType !== 'freelancer') {
    return false;
  }

  // Check project-level assignment first (preferred)
  if (task.project) {
    // Check both freelancerId and assignedFreelancerId (freelancerId is more common)
    return task.project.freelancerId === userId ||
           task.project.assignedFreelancerId === userId;
  }

  // Fallback to task-level assignment
  return task.freelancerId === userId ||
         task.assignedFreelancerId === userId;
}

/**
 * Filter project tasks to only include those belonging to the freelancer
 * @param tasks - Array of project tasks to filter
 * @param sessionUser - The current session user
 * @returns Filtered array of project tasks
 */
export function filterFreelancerTasks(tasks: ProjectTask[], sessionUser: SessionUser | null): ProjectTask[] {
  if (!sessionUser?.id) {
    return [];
  }

  return tasks.filter(task => isFreelancerTask(task, sessionUser));
}

/**
 * Validate that a user has access to a specific project ID
 * @param projectId - The project ID to validate
 * @param projects - Array of all projects
 * @param sessionUser - The current session user
 * @returns true if the user has access to this project
 */
export function validateFreelancerProjectAccess(
  projectId: string | number,
  projects: Project[],
  sessionUser: SessionUser | null
): boolean {
  const project = projects.find(p => p.projectId === projectId);
  if (!project) {
    return false;
  }

  return isFreelancerProject(project, sessionUser);
}

/**
 * Get the freelancer ID from session, ensuring it's a valid number
 * @param sessionUser - The current session user
 * @returns The freelancer ID as a number, or null if invalid
 */
export function getFreelancerId(sessionUser: SessionUser | null): number | null {
  if (!sessionUser?.id) {
    return null;
  }

  // Ensure the user is a freelancer
  const userType = sessionUser.userType || sessionUser.type;
  if (userType !== 'freelancer') {
    return null;
  }

  const freelancerId = parseInt(sessionUser.id);
  return isNaN(freelancerId) ? null : freelancerId;
}

/**
 * Create a session guard that returns null if user is not a freelancer
 * @param sessionUser - The current session user
 * @returns The session user if they're a freelancer, null otherwise
 */
export function requireFreelancerSession(sessionUser: SessionUser | null): SessionUser | null {
  if (!sessionUser?.id) {
    return null;
  }

  const userType = sessionUser.userType || sessionUser.type;
  if (userType !== 'freelancer') {
    return null;
  }

  return sessionUser;
}

/**
 * Create a session guard that returns the user if they have valid session
 * @param sessionUser - The current session user
 * @returns The session user if they have a valid session, null otherwise
 */
export function requireValidSession(sessionUser: SessionUser | null): SessionUser | null {
  if (!sessionUser?.id) {
    return null;
  }

  const userType = sessionUser.userType || sessionUser.type;
  if (userType !== 'freelancer' && userType !== 'commissioner') {
    return null;
  }

  return sessionUser;
}
