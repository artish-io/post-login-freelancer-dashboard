// src/lib/storage/organization-paths.ts

/**
 * Organization Path Utilities
 *
 * Provides utilities for generating and resolving hierarchical storage paths for organizations.
 * Organizations are indexed by the creation date of the first commissioner from that organization.
 */

import { fileExists } from '../fs-json';
import { dataPath } from './root';
import { getOrganizationIndexEntry } from './organizations-index';
import path from 'path';
import { promises as fs } from 'fs';

export interface OrganizationPathResolution {
  canonicalPath: string;
  source: 'index' | 'scan' | 'legacy-fallback';
}

/**
 * Derive hierarchical path for an organization based on first commissioner's creation date
 * @param organizationId Organization ID (number or string)
 * @param firstCommissionerCreatedAt ISO timestamp of the first commissioner's account creation
 * @returns Hierarchical path like "YYYY/MM/DD/<organizationId>"
 */
export function deriveHierarchicalOrganizationPath(organizationId: number | string, firstCommissionerCreatedAt: string): string {
  const date = new Date(firstCommissionerCreatedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return path.join(year.toString(), month, day, organizationId.toString());
}

/**
 * Get the full path to an organization's profile.json file
 * @param canonicalPath Hierarchical path like "YYYY/MM/DD/<organizationId>"
 * @returns Full path to profile.json
 */
export function getFullOrganizationProfilePath(canonicalPath: string): string {
  return dataPath('organizations', canonicalPath, 'profile.json');
}

/**
 * Scan for organization profile files in hierarchical storage
 * @param organizationId Organization ID to search for
 * @returns Canonical path if found, null otherwise
 */
async function scanForOrganizationProfile(organizationId: number | string): Promise<string | null> {
  const organizationIdStr = organizationId.toString();
  const organizationsDir = dataPath('organizations');
  
  try {
    // Check if organizations directory exists
    if (!(await fileExists(organizationsDir))) {
      return null;
    }
    
    // Scan year directories
    const yearDirs = await fs.readdir(organizationsDir, { withFileTypes: true });
    
    for (const yearDir of yearDirs) {
      if (!yearDir.isDirectory() || !/^\d{4}$/.test(yearDir.name)) {
        continue;
      }
      
      const yearPath = path.join(organizationsDir, yearDir.name);
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
          const organizationDirs = await fs.readdir(dayPath, { withFileTypes: true });
          
          for (const organizationDir of organizationDirs) {
            if (!organizationDir.isDirectory() || organizationDir.name !== organizationIdStr) {
              continue;
            }
            
            const profilePath = path.join(dayPath, organizationDir.name, 'profile.json');
            if (await fileExists(profilePath)) {
              // Return the canonical path (relative to organizations directory)
              return path.join(yearDir.name, monthDir.name, dayDir.name, organizationDir.name);
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error scanning for organization ${organizationId}:`, error);
    return null;
  }
}

/**
 * Resolve the canonical path for an organization
 * Resolution order: index → scan → legacy-fallback
 * @param organizationId Organization ID to resolve
 * @returns Path resolution result or null if not found
 */
export async function resolveCanonicalOrganizationPath(organizationId: number | string): Promise<OrganizationPathResolution | null> {
  // 1. Try index lookup first
  const indexEntry = await getOrganizationIndexEntry(organizationId);
  if (indexEntry) {
    const fullPath = getFullOrganizationProfilePath(indexEntry.path);
    if (await fileExists(fullPath)) {
      return {
        canonicalPath: indexEntry.path,
        source: 'index'
      };
    }
  }
  
  // 2. Try scanning hierarchical storage
  const scannedPath = await scanForOrganizationProfile(organizationId);
  if (scannedPath) {
    return {
      canonicalPath: scannedPath,
      source: 'scan'
    };
  }
  
  // 3. Check legacy fallback (data/organizations.json)
  const legacyPath = dataPath('organizations.json');
  if (await fileExists(legacyPath)) {
    try {
      const { readJson } = await import('../fs-json');
      const organizations = await readJson<Array<{ id: number | string }>>(legacyPath, []);
      const organization = organizations.find(o => o.id.toString() === organizationId.toString());
      
      if (organization) {
        return {
          canonicalPath: 'legacy', // Special marker for legacy fallback
          source: 'legacy-fallback'
        };
      }
    } catch (error) {
      console.warn(`Error reading legacy organizations file:`, error);
    }
  }
  
  return null;
}
