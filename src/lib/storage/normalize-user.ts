// src/lib/storage/normalize-user.ts

/**
 * Canonical User Storage
 *
 * Provides read/write operations for hierarchical user storage with fallback to legacy data.
 */

import { readJson, writeJsonAtomic, ensureDir } from '../fs-json';
import { dataPath } from './root';
import { resolveCanonicalUserPath, getFullUserProfilePath, deriveHierarchicalUserPath } from './user-paths';
import { saveUserIndexEntry } from './users-index';
import path from 'path';

export interface UserProfile {
  id: number;
  type: 'freelancer' | 'commissioner' | string;
  name?: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export class UserStorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public userId?: number | string,
    public details?: any
  ) {
    super(message);
    this.name = 'UserStorageError';
  }
}

/**
 * Read a user profile from hierarchical storage with legacy fallback
 */
export async function readUser(userId: number | string): Promise<UserProfile> {
  const resolution = await resolveCanonicalUserPath(userId);
  
  if (!resolution) {
    throw new UserStorageError(
      'USER_NOT_FOUND',
      `User ${userId} not found in any storage location`,
      userId
    );
  }
  
  // Handle legacy fallback
  if (resolution.source === 'legacy-fallback') {
    const legacyPath = dataPath('users.json');
    const users = await readJson<Array<UserProfile>>(legacyPath, []);
    const user = users.find(u => u.id.toString() === userId.toString());
    
    if (!user) {
      throw new UserStorageError(
        'USER_NOT_FOUND',
        `User ${userId} not found in legacy storage`,
        userId
      );
    }
    
    return user;
  }
  
  // Read from hierarchical storage
  const profilePath = getFullUserProfilePath(resolution.canonicalPath);
  
  try {
    const profile = await readJson<UserProfile>(profilePath, null as any);
    
    if (!profile) {
      throw new UserStorageError(
        'PROFILE_READ_ERROR',
        `Failed to read user profile from ${profilePath}`,
        userId
      );
    }
    
    return profile;
  } catch (error) {
    throw new UserStorageError(
      'PROFILE_READ_ERROR',
      `Error reading user profile: ${error instanceof Error ? error.message : String(error)}`,
      userId,
      error
    );
  }
}

/**
 * Write a user profile to hierarchical storage and update index
 */
export async function writeUser(user: UserProfile): Promise<void> {
  if (!user.id) {
    throw new UserStorageError(
      'INVALID_USER_DATA',
      'User profile must have an id field',
      undefined,
      user
    );
  }
  
  if (!user.createdAt) {
    throw new UserStorageError(
      'INVALID_USER_DATA',
      'User profile must have a createdAt field',
      user.id,
      user
    );
  }
  
  // Validate createdAt is a valid ISO string
  const createdAtDate = new Date(user.createdAt);
  if (isNaN(createdAtDate.getTime())) {
    throw new UserStorageError(
      'INVALID_TIMESTAMP',
      `Invalid createdAt timestamp: ${user.createdAt}`,
      user.id,
      user
    );
  }
  
  // Derive hierarchical path
  const canonicalPath = deriveHierarchicalUserPath(user.id, user.createdAt);
  const profilePath = getFullUserProfilePath(canonicalPath);
  
  try {
    // Ensure directory exists
    const dirPath = path.dirname(profilePath);
    await ensureDir(dirPath);
    
    // Add updatedAt if not present
    const profileData = {
      ...user,
      updatedAt: user.updatedAt || new Date().toISOString()
    };
    
    // Write profile atomically
    await writeJsonAtomic(profilePath, profileData);
    
    // Update index
    await saveUserIndexEntry(user.id, canonicalPath, { verifyOnDisk: true });
    
  } catch (error) {
    throw new UserStorageError(
      'PROFILE_WRITE_ERROR',
      `Error writing user profile: ${error instanceof Error ? error.message : String(error)}`,
      user.id,
      error
    );
  }
}

/**
 * Check if a user exists in any storage location
 */
export async function userExists(userId: number | string): Promise<boolean> {
  try {
    const resolution = await resolveCanonicalUserPath(userId);
    return resolution !== null;
  } catch (error) {
    return false;
  }
}
