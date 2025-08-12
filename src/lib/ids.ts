/**
 * ID Generation Utilities
 * Centralized ID generation for different entity types
 */

import { getNextGigIdFromIndex } from './storage/gigs-index';

/**
 * Get the next available ID for a specific entity type
 */
export async function getNextId(entityType: 'gig' | 'project' | 'task' | 'invoice'): Promise<number> {
  switch (entityType) {
    case 'gig':
      return await getNextGigIdFromIndex();
    
    case 'project':
      // For now, use timestamp-based generation for projects
      // This can be enhanced later with proper index management
      return Date.now() % 1000000; // Keep it reasonable
    
    case 'task':
      // For now, use timestamp-based generation for tasks
      return Date.now() % 1000000;
    
    case 'invoice':
      // For now, use timestamp-based generation for invoices
      return Date.now() % 1000000;
    
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Validate that an ID is within safe bounds
 */
export function validateId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= Number.MAX_SAFE_INTEGER;
}
