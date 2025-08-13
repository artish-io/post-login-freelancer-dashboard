// src/lib/storage/freelancer-paths.ts

/**
 * Freelancer Path Utilities
 *
 * Provides utilities for generating and resolving hierarchical storage paths for freelancers.
 */

import { fileExists } from '../fs-json';
import { dataPath } from './root';
import { getFreelancerIndexEntry } from './freelancers-index';
import path from 'path';
import { promises as fs } from 'fs';

export interface FreelancerPathResolution {
  canonicalPath: string;
  source: 'index' | 'scan' | 'legacy-fallback';
}

/**
 * Derive hierarchical path for a freelancer based on creation date
 * @param freelancerId Freelancer ID (number or string)
 * @param createdAt ISO timestamp
 * @returns Hierarchical path like "YYYY/MM/DD/<freelancerId>"
 */
export function deriveHierarchicalFreelancerPath(freelancerId: number | string, createdAt: string): string {
  const date = new Date(createdAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return path.join(year.toString(), month, day, freelancerId.toString());
}

/**
 * Get the full path to a freelancer's profile.json file
 * @param canonicalPath Hierarchical path like "YYYY/MM/DD/<freelancerId>"
 * @returns Full path to profile.json
 */
export function getFullFreelancerProfilePath(canonicalPath: string): string {
  return dataPath('freelancers', canonicalPath, 'profile.json');
}

/**
 * Scan for freelancer profile files in hierarchical storage
 * @param freelancerId Freelancer ID to search for
 * @returns Canonical path if found, null otherwise
 */
async function scanForFreelancerProfile(freelancerId: number | string): Promise<string | null> {
  const freelancerIdStr = freelancerId.toString();
  const freelancersDir = dataPath('freelancers');
  
  try {
    // Check if freelancers directory exists
    if (!(await fileExists(freelancersDir))) {
      return null;
    }
    
    // Scan year directories
    const yearDirs = await fs.readdir(freelancersDir, { withFileTypes: true });
    
    for (const yearDir of yearDirs) {
      if (!yearDir.isDirectory() || !/^\d{4}$/.test(yearDir.name)) {
        continue;
      }
      
      const yearPath = path.join(freelancersDir, yearDir.name);
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
          const freelancerDirs = await fs.readdir(dayPath, { withFileTypes: true });
          
          for (const freelancerDir of freelancerDirs) {
            if (!freelancerDir.isDirectory() || freelancerDir.name !== freelancerIdStr) {
              continue;
            }
            
            const profilePath = path.join(dayPath, freelancerDir.name, 'profile.json');
            if (await fileExists(profilePath)) {
              // Return the canonical path (relative to freelancers directory)
              return path.join(yearDir.name, monthDir.name, dayDir.name, freelancerDir.name);
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error scanning for freelancer ${freelancerId}:`, error);
    return null;
  }
}

/**
 * Resolve the canonical path for a freelancer
 * Resolution order: index → scan → legacy-fallback
 * @param freelancerId Freelancer ID to resolve
 * @returns Path resolution result or null if not found
 */
export async function resolveCanonicalFreelancerPath(freelancerId: number | string): Promise<FreelancerPathResolution | null> {
  // 1. Try index lookup first
  const indexEntry = await getFreelancerIndexEntry(freelancerId);
  if (indexEntry) {
    const fullPath = getFullFreelancerProfilePath(indexEntry.path);
    if (await fileExists(fullPath)) {
      return {
        canonicalPath: indexEntry.path,
        source: 'index'
      };
    }
  }
  
  // 2. Try scanning hierarchical storage
  const scannedPath = await scanForFreelancerProfile(freelancerId);
  if (scannedPath) {
    return {
      canonicalPath: scannedPath,
      source: 'scan'
    };
  }
  
  // 3. Check legacy fallback (data/freelancers.json)
  const legacyPath = dataPath('freelancers.json');
  if (await fileExists(legacyPath)) {
    try {
      const { readJson } = await import('../fs-json');
      const freelancers = await readJson<Array<{ id: number | string }>>(legacyPath, []);
      const freelancer = freelancers.find(f => f.id.toString() === freelancerId.toString());
      
      if (freelancer) {
        return {
          canonicalPath: 'legacy', // Special marker for legacy fallback
          source: 'legacy-fallback'
        };
      }
    } catch (error) {
      console.warn(`Error reading legacy freelancers file:`, error);
    }
  }
  
  return null;
}
