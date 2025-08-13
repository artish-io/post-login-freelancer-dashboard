// src/lib/storage/users-index.ts

/**
 * Users Index Management
 *
 * Manages the users index for hierarchical storage lookup.
 * Maps user IDs to their hierarchical storage paths.
 */

import { readJson, writeJsonAtomic } from '../fs-json';
import { dataPath } from './root';

export interface UserIndexEntry {
  path: string;
  lastUpdated: string;
}

export type UsersIndex = Record<string, UserIndexEntry>;

// In-memory cache with TTL
interface CacheEntry {
  data: UsersIndex;
  timestamp: number;
}

let indexCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get the path to the users index file
 */
function getUsersIndexPath(): string {
  return dataPath('users-index.json');
}

/**
 * Clear the users index cache (useful for tests)
 */
export function clearUsersIndexCache(): void {
  indexCache = null;
}

/**
 * Load the users index from disk with caching
 */
export async function loadUsersIndex(): Promise<UsersIndex> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (indexCache && (now - indexCache.timestamp) < CACHE_TTL_MS) {
    return indexCache.data;
  }
  
  // Load from disk
  const indexPath = getUsersIndexPath();
  const index = await readJson<UsersIndex>(indexPath, {});
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: now
  };
  
  return index;
}

/**
 * Save the users index to disk atomically
 */
export async function saveUsersIndex(index: UsersIndex): Promise<void> {
  const indexPath = getUsersIndexPath();
  await writeJsonAtomic(indexPath, index);
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: Date.now()
  };
}

/**
 * Save a single user index entry
 */
export async function saveUserIndexEntry(
  userId: number | string, 
  canonicalPath: string, 
  opts?: { verifyOnDisk?: boolean }
): Promise<void> {
  const index = await loadUsersIndex();
  const userIdStr = userId.toString();
  
  // Optionally verify the file exists on disk
  if (opts?.verifyOnDisk) {
    const { fileExists } = await import('../fs-json');
    const fullPath = dataPath('users', canonicalPath, 'profile.json');
    if (!(await fileExists(fullPath))) {
      throw new Error(`User profile file does not exist: ${fullPath}`);
    }
  }
  
  index[userIdStr] = {
    path: canonicalPath,
    lastUpdated: new Date().toISOString()
  };
  
  await saveUsersIndex(index);
}

/**
 * Get a user index entry by ID
 */
export async function getUserIndexEntry(userId: number | string): Promise<UserIndexEntry | null> {
  const index = await loadUsersIndex();
  const userIdStr = userId.toString();
  return index[userIdStr] || null;
}

/**
 * Remove a user index entry
 */
export async function removeUserIndexEntry(userId: number | string): Promise<void> {
  const index = await loadUsersIndex();
  const userIdStr = userId.toString();
  
  if (userIdStr in index) {
    delete index[userIdStr];
    await saveUsersIndex(index);
  }
}
