// src/lib/storage/user-paths.ts

/**
 * User Path Utilities
 *
 * Provides utilities for generating and resolving hierarchical storage paths for users.
 */

import { fileExists } from '../fs-json';
import { dataPath } from './root';
import { getUserIndexEntry } from './users-index';
import path from 'path';
import { promises as fs } from 'fs';

export interface UserPathResolution {
  canonicalPath: string;
  source: 'index' | 'scan' | 'legacy-fallback';
}

/**
 * Derive hierarchical path for a user based on creation date
 * @param userId User ID (number or string)
 * @param createdAt ISO timestamp
 * @returns Hierarchical path like "YYYY/MM/DD/<userId>"
 */
export function deriveHierarchicalUserPath(userId: number | string, createdAt: string): string {
  const date = new Date(createdAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return path.join(year.toString(), month, day, userId.toString());
}

/**
 * Get the full path to a user's profile.json file
 * @param canonicalPath Hierarchical path like "YYYY/MM/DD/<userId>"
 * @returns Full path to profile.json
 */
export function getFullUserProfilePath(canonicalPath: string): string {
  return dataPath('users', canonicalPath, 'profile.json');
}

/**
 * Scan for user profile files in hierarchical storage
 * @param userId User ID to search for
 * @returns Canonical path if found, null otherwise
 */
async function scanForUserProfile(userId: number | string): Promise<string | null> {
  const userIdStr = userId.toString();
  const usersDir = dataPath('users');
  
  try {
    // Check if users directory exists
    if (!(await fileExists(usersDir))) {
      return null;
    }
    
    // Scan year directories
    const yearDirs = await fs.readdir(usersDir, { withFileTypes: true });
    
    for (const yearDir of yearDirs) {
      if (!yearDir.isDirectory() || !/^\d{4}$/.test(yearDir.name)) {
        continue;
      }
      
      const yearPath = path.join(usersDir, yearDir.name);
      const monthDirs = await fs.readdir(yearPath, { withFileTypes: true });
      
      for (const monthDir of monthDirs) {
        if (!monthDir.isDirectory() || !/^\d{2}$/.test(monthDir.name)) {
          continue;
        }
        
        const monthPath = path.join(yearPath, monthDir.name);
        const dayDirs = await fs.readdir(monthPath, { withFileTypes: true });
        
        for (const dayDir of dayDirs) {
          if (!dayDir.isDirectory() || !/^\d{2}$/.test(dayDir.name)) {
            continue;
          }
          
          const dayPath = path.join(monthPath, dayDir.name);
          const userDirs = await fs.readdir(dayPath, { withFileTypes: true });
          
          for (const userDir of userDirs) {
            if (!userDir.isDirectory() || userDir.name !== userIdStr) {
              continue;
            }
            
            const profilePath = path.join(dayPath, userDir.name, 'profile.json');
            if (await fileExists(profilePath)) {
              // Return the canonical path (relative to users directory)
              return path.join(yearDir.name, monthDir.name, dayDir.name, userDir.name);
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error scanning for user ${userId}:`, error);
    return null;
  }
}

/**
 * Resolve the canonical path for a user
 * Resolution order: index → scan → legacy-fallback
 * @param userId User ID to resolve
 * @returns Path resolution result or null if not found
 */
export async function resolveCanonicalUserPath(userId: number | string): Promise<UserPathResolution | null> {
  // 1. Try index lookup first
  const indexEntry = await getUserIndexEntry(userId);
  if (indexEntry) {
    const fullPath = getFullUserProfilePath(indexEntry.path);
    if (await fileExists(fullPath)) {
      return {
        canonicalPath: indexEntry.path,
        source: 'index'
      };
    }
  }
  
  // 2. Try scanning hierarchical storage
  const scannedPath = await scanForUserProfile(userId);
  if (scannedPath) {
    return {
      canonicalPath: scannedPath,
      source: 'scan'
    };
  }
  
  // 3. Check legacy fallback (data/users.json)
  const legacyPath = dataPath('users.json');
  if (await fileExists(legacyPath)) {
    try {
      const { readJson } = await import('../fs-json');
      const users = await readJson<Array<{ id: number | string }>>(legacyPath, []);
      const user = users.find(u => u.id.toString() === userId.toString());
      
      if (user) {
        return {
          canonicalPath: 'legacy', // Special marker for legacy fallback
          source: 'legacy-fallback'
        };
      }
    } catch (error) {
      console.warn(`Error reading legacy users file:`, error);
    }
  }
  
  return null;
}
