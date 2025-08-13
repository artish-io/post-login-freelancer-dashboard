// src/lib/storage/normalize-freelancer.ts

/**
 * Canonical Freelancer Storage
 *
 * Provides read/write operations for hierarchical freelancer storage with fallback to legacy data.
 * Maintains the duplication pattern for scalability - freelancer profiles are separate from user profiles
 * but reference users via userId for data consistency.
 */

import { readJson, writeJsonAtomic, ensureDir } from '../fs-json';
import { dataPath } from './root';
import { resolveCanonicalFreelancerPath, getFullFreelancerProfilePath, deriveHierarchicalFreelancerPath } from './freelancer-paths';
import { saveFreelancerIndexEntry } from './freelancers-index';
import path from 'path';

export interface FreelancerProfile {
  id: number;
  userId: number; // Reference to user profile
  category?: string;
  skillCategories?: string[];
  skills?: string[];
  tools?: string[];
  rate?: string;
  minRate?: number;
  maxRate?: number;
  location?: string;
  rating?: number;
  availability?: string;
  withdrawalMethod?: string;
  specializations?: string[];
  responsibilities?: string[];
  portfolioLinks?: Array<{ platform: string; url: string }>;
  createdAt: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export class FreelancerStorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public freelancerId?: number | string,
    public details?: any
  ) {
    super(message);
    this.name = 'FreelancerStorageError';
  }
}

/**
 * Read a freelancer profile from hierarchical storage with legacy fallback
 */
export async function readFreelancer(freelancerId: number | string): Promise<FreelancerProfile> {
  const resolution = await resolveCanonicalFreelancerPath(freelancerId);
  
  if (!resolution) {
    throw new FreelancerStorageError(
      'FREELANCER_NOT_FOUND',
      `Freelancer ${freelancerId} not found in any storage location`,
      freelancerId
    );
  }
  
  // Handle legacy fallback
  if (resolution.source === 'legacy-fallback') {
    const legacyPath = dataPath('freelancers.json');
    const freelancers = await readJson<Array<FreelancerProfile>>(legacyPath, []);
    const freelancer = freelancers.find(f => f.id.toString() === freelancerId.toString());
    
    if (!freelancer) {
      throw new FreelancerStorageError(
        'FREELANCER_NOT_FOUND',
        `Freelancer ${freelancerId} not found in legacy storage`,
        freelancerId
      );
    }
    
    return freelancer;
  }
  
  // Read from hierarchical storage
  const profilePath = getFullFreelancerProfilePath(resolution.canonicalPath);
  
  try {
    const profile = await readJson<FreelancerProfile>(profilePath, null as any);
    
    if (!profile) {
      throw new FreelancerStorageError(
        'PROFILE_READ_ERROR',
        `Failed to read freelancer profile from ${profilePath}`,
        freelancerId
      );
    }
    
    return profile;
  } catch (error) {
    throw new FreelancerStorageError(
      'PROFILE_READ_ERROR',
      `Error reading freelancer profile: ${error instanceof Error ? error.message : String(error)}`,
      freelancerId,
      error
    );
  }
}

/**
 * Write a freelancer profile to hierarchical storage and update index
 * 
 * This maintains the duplication pattern for scalability:
 * - Freelancer profiles are stored separately from user profiles
 * - They reference users via userId for data consistency
 * - This allows efficient querying of freelancer-specific data
 */
export async function writeFreelancer(freelancer: FreelancerProfile): Promise<void> {
  if (!freelancer.id) {
    throw new FreelancerStorageError(
      'INVALID_FREELANCER_DATA',
      'Freelancer profile must have an id field',
      undefined,
      freelancer
    );
  }
  
  if (!freelancer.userId) {
    throw new FreelancerStorageError(
      'INVALID_FREELANCER_DATA',
      'Freelancer profile must have a userId field',
      freelancer.id,
      freelancer
    );
  }
  
  if (!freelancer.createdAt) {
    throw new FreelancerStorageError(
      'INVALID_FREELANCER_DATA',
      'Freelancer profile must have a createdAt field',
      freelancer.id,
      freelancer
    );
  }
  
  // Validate createdAt is a valid ISO string
  const createdAtDate = new Date(freelancer.createdAt);
  if (isNaN(createdAtDate.getTime())) {
    throw new FreelancerStorageError(
      'INVALID_TIMESTAMP',
      `Invalid createdAt timestamp: ${freelancer.createdAt}`,
      freelancer.id,
      freelancer
    );
  }
  
  // Derive hierarchical path
  const canonicalPath = deriveHierarchicalFreelancerPath(freelancer.id, freelancer.createdAt);
  const profilePath = getFullFreelancerProfilePath(canonicalPath);
  
  try {
    // Ensure directory exists
    const dirPath = path.dirname(profilePath);
    await ensureDir(dirPath);
    
    // Add updatedAt if not present
    const profileData = {
      ...freelancer,
      updatedAt: freelancer.updatedAt || new Date().toISOString()
    };
    
    // Write profile atomically
    await writeJsonAtomic(profilePath, profileData);
    
    // Update index
    await saveFreelancerIndexEntry(freelancer.id, canonicalPath, freelancer.userId, { verifyOnDisk: true });
    
  } catch (error) {
    throw new FreelancerStorageError(
      'PROFILE_WRITE_ERROR',
      `Error writing freelancer profile: ${error instanceof Error ? error.message : String(error)}`,
      freelancer.id,
      error
    );
  }
}

/**
 * Check if a freelancer exists in any storage location
 */
export async function freelancerExists(freelancerId: number | string): Promise<boolean> {
  try {
    const resolution = await resolveCanonicalFreelancerPath(freelancerId);
    return resolution !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get freelancer by user ID
 */
export async function getFreelancerByUserId(userId: number): Promise<FreelancerProfile | null> {
  try {
    const { getFreelancerIndexEntryByUserId } = await import('./freelancers-index');
    const indexEntry = await getFreelancerIndexEntryByUserId(userId);
    
    if (indexEntry) {
      const profilePath = getFullFreelancerProfilePath(indexEntry.path);
      const profile = await readJson<FreelancerProfile>(profilePath, null as any);
      return profile;
    }
    
    // Fallback to legacy storage
    const legacyPath = dataPath('freelancers.json');
    const { fileExists } = await import('../fs-json');
    if (await fileExists(legacyPath)) {
      const freelancers = await readJson<Array<FreelancerProfile>>(legacyPath, []);
      return freelancers.find(f => f.userId === userId) || null;
    }
    
    return null;
  } catch (error) {
    console.warn(`Error getting freelancer by userId ${userId}:`, error);
    return null;
  }
}
