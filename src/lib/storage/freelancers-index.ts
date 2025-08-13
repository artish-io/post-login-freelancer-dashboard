// src/lib/storage/freelancers-index.ts

/**
 * Freelancers Index Management
 *
 * Manages the freelancers index for hierarchical storage lookup.
 * Maps freelancer IDs to their hierarchical storage paths.
 */

import { readJson, writeJsonAtomic } from '../fs-json';
import { dataPath } from './root';

export interface FreelancerIndexEntry {
  path: string;
  lastUpdated: string;
  userId: number; // Reference to user for quick lookups
}

export type FreelancersIndex = Record<string, FreelancerIndexEntry>;

// In-memory cache with TTL
interface CacheEntry {
  data: FreelancersIndex;
  timestamp: number;
}

let indexCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get the path to the freelancers index file
 */
function getFreelancersIndexPath(): string {
  return dataPath('freelancers-index.json');
}

/**
 * Clear the freelancers index cache (useful for tests)
 */
export function clearFreelancersIndexCache(): void {
  indexCache = null;
}

/**
 * Load the freelancers index from disk with caching
 */
export async function loadFreelancersIndex(): Promise<FreelancersIndex> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (indexCache && (now - indexCache.timestamp) < CACHE_TTL_MS) {
    return indexCache.data;
  }
  
  // Load from disk
  const indexPath = getFreelancersIndexPath();
  const index = await readJson<FreelancersIndex>(indexPath, {});
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: now
  };
  
  return index;
}

/**
 * Save the freelancers index to disk atomically
 */
export async function saveFreelancersIndex(index: FreelancersIndex): Promise<void> {
  const indexPath = getFreelancersIndexPath();
  await writeJsonAtomic(indexPath, index);
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: Date.now()
  };
}

/**
 * Save a single freelancer index entry
 */
export async function saveFreelancerIndexEntry(
  freelancerId: number | string, 
  canonicalPath: string,
  userId: number,
  opts?: { verifyOnDisk?: boolean }
): Promise<void> {
  const index = await loadFreelancersIndex();
  const freelancerIdStr = freelancerId.toString();
  
  // Optionally verify the file exists on disk
  if (opts?.verifyOnDisk) {
    const { fileExists } = await import('../fs-json');
    const fullPath = dataPath('freelancers', canonicalPath, 'profile.json');
    if (!(await fileExists(fullPath))) {
      throw new Error(`Freelancer profile file does not exist: ${fullPath}`);
    }
  }
  
  index[freelancerIdStr] = {
    path: canonicalPath,
    userId,
    lastUpdated: new Date().toISOString()
  };
  
  await saveFreelancersIndex(index);
}

/**
 * Get a freelancer index entry by ID
 */
export async function getFreelancerIndexEntry(freelancerId: number | string): Promise<FreelancerIndexEntry | null> {
  const index = await loadFreelancersIndex();
  const freelancerIdStr = freelancerId.toString();
  return index[freelancerIdStr] || null;
}

/**
 * Get freelancer index entry by user ID
 */
export async function getFreelancerIndexEntryByUserId(userId: number): Promise<FreelancerIndexEntry | null> {
  const index = await loadFreelancersIndex();
  const entry = Object.values(index).find(entry => entry.userId === userId);
  return entry || null;
}

/**
 * Remove a freelancer index entry
 */
export async function removeFreelancerIndexEntry(freelancerId: number | string): Promise<void> {
  const index = await loadFreelancersIndex();
  const freelancerIdStr = freelancerId.toString();
  
  if (freelancerIdStr in index) {
    delete index[freelancerIdStr];
    await saveFreelancersIndex(index);
  }
}
