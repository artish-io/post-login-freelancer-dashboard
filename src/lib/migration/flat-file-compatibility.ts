/**
 * Flat File Compatibility Layer
 * 
 * Provides backward-compatible functions that mimic flat file access
 * but use hierarchical storage underneath. This allows gradual migration
 * without breaking existing functionality.
 */

import { 
  getAllUsers as getHierarchicalUsers,
  getUserById as getHierarchicalUserById,
  getUserByEmail as getHierarchicalUserByEmail,
  getAllFreelancers as getHierarchicalFreelancers,
  getFreelancerById as getHierarchicalFreelancerById,
  getAllOrganizations as getHierarchicalOrganizations,
  getOrganizationById as getHierarchicalOrganizationById
} from '../storage/unified-storage-service';

// Track usage for migration monitoring
const usageTracker = new Map<string, number>();

function trackUsage(functionName: string) {
  const count = usageTracker.get(functionName) || 0;
  usageTracker.set(functionName, count + 1);
  
  // Log usage for monitoring (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🔄 [MIGRATION] Using compatibility layer: ${functionName} (usage: ${count + 1})`);
  }
}

/**
 * Get usage statistics for migration monitoring
 */
export function getMigrationUsageStats() {
  return Object.fromEntries(usageTracker.entries());
}

// ==================== USER COMPATIBILITY FUNCTIONS ====================

/**
 * Compatibility function: Get all users (mimics reading data/users.json)
 * @deprecated Use getAllUsers from unified-storage-service directly
 */
export async function readUsersJson(): Promise<any[]> {
  trackUsage('readUsersJson');
  
  try {
    const users = await getHierarchicalUsers();
    return users || [];
  } catch (error) {
    console.error('[MIGRATION] Error reading users from hierarchical storage:', error);
    return [];
  }
}

/**
 * Compatibility function: Get user by ID (mimics flat file lookup)
 * @deprecated Use getUserById from unified-storage-service directly
 */
export async function findUserInJson(userId: number | string): Promise<any | null> {
  trackUsage('findUserInJson');
  
  try {
    return await getHierarchicalUserById(userId);
  } catch (error) {
    console.error(`[MIGRATION] Error finding user ${userId}:`, error);
    return null;
  }
}

/**
 * Compatibility function: Get user by email (mimics flat file search)
 * @deprecated Use getUserByEmail from unified-storage-service directly
 */
export async function findUserByEmailInJson(email: string): Promise<any | null> {
  trackUsage('findUserByEmailInJson');
  
  try {
    return await getHierarchicalUserByEmail(email);
  } catch (error) {
    console.error(`[MIGRATION] Error finding user by email ${email}:`, error);
    return null;
  }
}

// ==================== FREELANCER COMPATIBILITY FUNCTIONS ====================

/**
 * Compatibility function: Get all freelancers (mimics reading data/freelancers.json)
 * @deprecated Use getAllFreelancers from unified-storage-service directly
 */
export async function readFreelancersJson(): Promise<any[]> {
  trackUsage('readFreelancersJson');
  
  try {
    const freelancers = await getHierarchicalFreelancers();
    return freelancers || [];
  } catch (error) {
    console.error('[MIGRATION] Error reading freelancers from hierarchical storage:', error);
    return [];
  }
}

/**
 * Compatibility function: Get freelancer by ID (mimics flat file lookup)
 * @deprecated Use getFreelancerById from unified-storage-service directly
 */
export async function findFreelancerInJson(freelancerId: number | string): Promise<any | null> {
  trackUsage('findFreelancerInJson');
  
  try {
    return await getHierarchicalFreelancerById(freelancerId);
  } catch (error) {
    console.error(`[MIGRATION] Error finding freelancer ${freelancerId}:`, error);
    return null;
  }
}

// ==================== ORGANIZATION COMPATIBILITY FUNCTIONS ====================

/**
 * Compatibility function: Get all organizations (mimics reading data/organizations.json)
 * @deprecated Use getAllOrganizations from unified-storage-service directly
 */
export async function readOrganizationsJson(): Promise<any[]> {
  trackUsage('readOrganizationsJson');
  
  try {
    const organizations = await getHierarchicalOrganizations();
    return organizations || [];
  } catch (error) {
    console.error('[MIGRATION] Error reading organizations from hierarchical storage:', error);
    return [];
  }
}

/**
 * Compatibility function: Get organization by ID (mimics flat file lookup)
 * @deprecated Use getOrganizationById from unified-storage-service directly
 */
export async function findOrganizationInJson(organizationId: number | string): Promise<any | null> {
  trackUsage('findOrganizationInJson');
  
  try {
    return await getHierarchicalOrganizationById(organizationId);
  } catch (error) {
    console.error(`[MIGRATION] Error finding organization ${organizationId}:`, error);
    return null;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Compatibility function: Parse JSON data (mimics JSON.parse on file content)
 * This is used when code expects to parse JSON from file reads
 */
export function parseJsonData(data: any[]): any[] {
  trackUsage('parseJsonData');
  
  // If data is already parsed (from hierarchical storage), return as-is
  if (Array.isArray(data)) {
    return data;
  }
  
  // If data is a string (from file read), parse it
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('[MIGRATION] Error parsing JSON data:', error);
      return [];
    }
  }
  
  return [];
}

/**
 * Compatibility function: Filter users by type (mimics flat file filtering)
 */
export async function getUsersByType(userType: string): Promise<any[]> {
  trackUsage('getUsersByType');
  
  try {
    const users = await readUsersJson();
    return users.filter(user => user.userType === userType || user.type === userType);
  } catch (error) {
    console.error(`[MIGRATION] Error filtering users by type ${userType}:`, error);
    return [];
  }
}

/**
 * Compatibility function: Get freelancer users (mimics filtering users.json for freelancers)
 */
export async function getFreelancerUsers(): Promise<any[]> {
  trackUsage('getFreelancerUsers');
  return await getUsersByType('freelancer');
}

/**
 * Compatibility function: Get commissioner users (mimics filtering users.json for commissioners)
 */
export async function getCommissionerUsers(): Promise<any[]> {
  trackUsage('getCommissionerUsers');
  return await getUsersByType('commissioner');
}

// ==================== MIGRATION HELPERS ====================

/**
 * Check if hierarchical storage is available and working
 */
export async function checkHierarchicalStorageHealth(): Promise<boolean> {
  try {
    // Try to read a small amount of data from hierarchical storage
    const users = await getHierarchicalUsers();
    const freelancers = await getHierarchicalFreelancers();
    
    return Array.isArray(users) && Array.isArray(freelancers);
  } catch (error) {
    console.error('[MIGRATION] Hierarchical storage health check failed:', error);
    return false;
  }
}

/**
 * Generate migration report
 */
export function generateMigrationReport(): {
  usageStats: Record<string, number>;
  totalCalls: number;
  healthCheck: Promise<boolean>;
} {
  const stats = getMigrationUsageStats();
  const totalCalls = Object.values(stats).reduce((sum, count) => sum + count, 0);
  
  return {
    usageStats: stats,
    totalCalls,
    healthCheck: checkHierarchicalStorageHealth()
  };
}

// ==================== EXPORTS ====================

// Export all compatibility functions
export {
  // User functions
  readUsersJson,
  findUserInJson,
  findUserByEmailInJson,
  getUsersByType,
  getFreelancerUsers,
  getCommissionerUsers,
  
  // Freelancer functions
  readFreelancersJson,
  findFreelancerInJson,
  
  // Organization functions
  readOrganizationsJson,
  findOrganizationInJson,
  
  // Utility functions
  parseJsonData,
  checkHierarchicalStorageHealth,
  generateMigrationReport
};
