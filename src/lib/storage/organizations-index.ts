// src/lib/storage/organizations-index.ts

/**
 * Organizations Index Management
 *
 * Manages the organizations index for hierarchical storage lookup.
 * Maps organization IDs to their hierarchical storage paths.
 * 
 * Key requirement: Multiple commissioners can be associated with the same organization,
 * but the indexing is synced with the account creation date of the first commissioner
 * from that organization who signed up on Artish.
 */

import { readJson, writeJsonAtomic } from '../fs-json';
import { dataPath } from './root';

export interface OrganizationIndexEntry {
  path: string;
  lastUpdated: string;
  firstCommissionerId: number; // ID of the first commissioner who signed up from this org
  firstCommissionerCreatedAt: string; // Creation date used for hierarchical path
  associatedCommissioners: number[]; // All commissioners associated with this org
}

export type OrganizationsIndex = Record<string, OrganizationIndexEntry>;

// In-memory cache with TTL
interface CacheEntry {
  data: OrganizationsIndex;
  timestamp: number;
}

let indexCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get the path to the organizations index file
 */
function getOrganizationsIndexPath(): string {
  return dataPath('organizations-index.json');
}

/**
 * Clear the organizations index cache (useful for tests)
 */
export function clearOrganizationsIndexCache(): void {
  indexCache = null;
}

/**
 * Load the organizations index from disk with caching
 */
export async function loadOrganizationsIndex(): Promise<OrganizationsIndex> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (indexCache && (now - indexCache.timestamp) < CACHE_TTL_MS) {
    return indexCache.data;
  }
  
  // Load from disk
  const indexPath = getOrganizationsIndexPath();
  const index = await readJson<OrganizationsIndex>(indexPath, {});
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: now
  };
  
  return index;
}

/**
 * Save the organizations index to disk atomically
 */
export async function saveOrganizationsIndex(index: OrganizationsIndex): Promise<void> {
  const indexPath = getOrganizationsIndexPath();
  await writeJsonAtomic(indexPath, index);
  
  // Update cache
  indexCache = {
    data: index,
    timestamp: Date.now()
  };
}

/**
 * Save a single organization index entry
 */
export async function saveOrganizationIndexEntry(
  organizationId: number | string, 
  canonicalPath: string,
  firstCommissionerId: number,
  firstCommissionerCreatedAt: string,
  associatedCommissioners: number[] = [],
  opts?: { verifyOnDisk?: boolean }
): Promise<void> {
  const index = await loadOrganizationsIndex();
  const organizationIdStr = organizationId.toString();
  
  // Optionally verify the file exists on disk
  if (opts?.verifyOnDisk) {
    const { fileExists } = await import('../fs-json');
    const fullPath = dataPath('organizations', canonicalPath, 'profile.json');
    if (!(await fileExists(fullPath))) {
      throw new Error(`Organization profile file does not exist: ${fullPath}`);
    }
  }
  
  index[organizationIdStr] = {
    path: canonicalPath,
    firstCommissionerId,
    firstCommissionerCreatedAt,
    associatedCommissioners: [...new Set(associatedCommissioners)], // Remove duplicates
    lastUpdated: new Date().toISOString()
  };
  
  await saveOrganizationsIndex(index);
}

/**
 * Get an organization index entry by ID
 */
export async function getOrganizationIndexEntry(organizationId: number | string): Promise<OrganizationIndexEntry | null> {
  const index = await loadOrganizationsIndex();
  const organizationIdStr = organizationId.toString();
  return index[organizationIdStr] || null;
}

/**
 * Get organization index entry by commissioner ID
 */
export async function getOrganizationIndexEntryByCommissionerId(commissionerId: number): Promise<OrganizationIndexEntry | null> {
  const index = await loadOrganizationsIndex();
  const entry = Object.values(index).find(entry => 
    entry.firstCommissionerId === commissionerId || 
    entry.associatedCommissioners.includes(commissionerId)
  );
  return entry || null;
}

/**
 * Add a commissioner to an organization's associated commissioners list
 */
export async function addCommissionerToOrganization(organizationId: number | string, commissionerId: number): Promise<void> {
  const index = await loadOrganizationsIndex();
  const organizationIdStr = organizationId.toString();
  
  if (organizationIdStr in index) {
    const entry = index[organizationIdStr];
    if (!entry.associatedCommissioners.includes(commissionerId)) {
      entry.associatedCommissioners.push(commissionerId);
      entry.lastUpdated = new Date().toISOString();
      await saveOrganizationsIndex(index);
    }
  }
}

/**
 * Remove an organization index entry
 */
export async function removeOrganizationIndexEntry(organizationId: number | string): Promise<void> {
  const index = await loadOrganizationsIndex();
  const organizationIdStr = organizationId.toString();
  
  if (organizationIdStr in index) {
    delete index[organizationIdStr];
    await saveOrganizationsIndex(index);
  }
}
