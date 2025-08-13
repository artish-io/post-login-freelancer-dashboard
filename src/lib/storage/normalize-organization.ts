// src/lib/storage/normalize-organization.ts

/**
 * Canonical Organization Storage
 *
 * Provides read/write operations for hierarchical organization storage with fallback to legacy data.
 * 
 * Key features:
 * - Multiple commissioners can be associated with the same organization
 * - Indexing is synced with the account creation date of the first commissioner from that organization
 * - Maintains referential integrity between organizations and commissioners
 */

import { readJson, writeJsonAtomic, ensureDir } from '../fs-json';
import { dataPath } from './root';
import { resolveCanonicalOrganizationPath, getFullOrganizationProfilePath, deriveHierarchicalOrganizationPath } from './organization-paths';
import { saveOrganizationIndexEntry, addCommissionerToOrganization } from './organizations-index';
import path from 'path';

export interface OrganizationProfile {
  id: number;
  name: string;
  email?: string;
  logo?: string;
  address?: string;
  bio?: string;
  contactPersonId?: number; // Legacy field for backward compatibility
  firstCommissionerId: number; // ID of the first commissioner who signed up from this org
  associatedCommissioners: number[]; // All commissioners associated with this org
  createdAt: string; // Based on first commissioner's account creation date
  updatedAt?: string;
  [k: string]: unknown;
}

export class OrganizationStorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public organizationId?: number | string,
    public details?: any
  ) {
    super(message);
    this.name = 'OrganizationStorageError';
  }
}

/**
 * Read an organization profile from hierarchical storage with legacy fallback
 */
export async function readOrganization(organizationId: number | string): Promise<OrganizationProfile> {
  const resolution = await resolveCanonicalOrganizationPath(organizationId);
  
  if (!resolution) {
    throw new OrganizationStorageError(
      'ORGANIZATION_NOT_FOUND',
      `Organization ${organizationId} not found in any storage location`,
      organizationId
    );
  }
  
  // Handle legacy fallback
  if (resolution.source === 'legacy-fallback') {
    const legacyPath = dataPath('organizations.json');
    const organizations = await readJson<Array<any>>(legacyPath, []);
    const organization = organizations.find(o => o.id.toString() === organizationId.toString());
    
    if (!organization) {
      throw new OrganizationStorageError(
        'ORGANIZATION_NOT_FOUND',
        `Organization ${organizationId} not found in legacy storage`,
        organizationId
      );
    }
    
    // Convert legacy format to new format
    return {
      ...organization,
      firstCommissionerId: organization.contactPersonId || 0,
      associatedCommissioners: organization.contactPersonId ? [organization.contactPersonId] : [],
      createdAt: organization.createdAt || new Date().toISOString()
    };
  }
  
  // Read from hierarchical storage
  const profilePath = getFullOrganizationProfilePath(resolution.canonicalPath);
  
  try {
    const profile = await readJson<OrganizationProfile>(profilePath, null as any);
    
    if (!profile) {
      throw new OrganizationStorageError(
        'PROFILE_READ_ERROR',
        `Failed to read organization profile from ${profilePath}`,
        organizationId
      );
    }
    
    return profile;
  } catch (error) {
    throw new OrganizationStorageError(
      'PROFILE_READ_ERROR',
      `Error reading organization profile: ${error instanceof Error ? error.message : String(error)}`,
      organizationId,
      error
    );
  }
}

/**
 * Write an organization profile to hierarchical storage and update index
 */
export async function writeOrganization(organization: OrganizationProfile): Promise<void> {
  if (!organization.id) {
    throw new OrganizationStorageError(
      'INVALID_ORGANIZATION_DATA',
      'Organization profile must have an id field',
      undefined,
      organization
    );
  }
  
  if (!organization.firstCommissionerId) {
    throw new OrganizationStorageError(
      'INVALID_ORGANIZATION_DATA',
      'Organization profile must have a firstCommissionerId field',
      organization.id,
      organization
    );
  }
  
  if (!organization.createdAt) {
    throw new OrganizationStorageError(
      'INVALID_ORGANIZATION_DATA',
      'Organization profile must have a createdAt field',
      organization.id,
      organization
    );
  }
  
  // Validate createdAt is a valid ISO string
  const createdAtDate = new Date(organization.createdAt);
  if (isNaN(createdAtDate.getTime())) {
    throw new OrganizationStorageError(
      'INVALID_TIMESTAMP',
      `Invalid createdAt timestamp: ${organization.createdAt}`,
      organization.id,
      organization
    );
  }
  
  // Derive hierarchical path based on first commissioner's creation date
  const canonicalPath = deriveHierarchicalOrganizationPath(organization.id, organization.createdAt);
  const profilePath = getFullOrganizationProfilePath(canonicalPath);
  
  try {
    // Ensure directory exists
    const dirPath = path.dirname(profilePath);
    await ensureDir(dirPath);
    
    // Add updatedAt if not present
    const profileData = {
      ...organization,
      updatedAt: organization.updatedAt || new Date().toISOString()
    };
    
    // Write profile atomically
    await writeJsonAtomic(profilePath, profileData);
    
    // Update index
    await saveOrganizationIndexEntry(
      organization.id, 
      canonicalPath, 
      organization.firstCommissionerId,
      organization.createdAt,
      organization.associatedCommissioners || [],
      { verifyOnDisk: true }
    );
    
  } catch (error) {
    throw new OrganizationStorageError(
      'PROFILE_WRITE_ERROR',
      `Error writing organization profile: ${error instanceof Error ? error.message : String(error)}`,
      organization.id,
      error
    );
  }
}

/**
 * Check if an organization exists in any storage location
 */
export async function organizationExists(organizationId: number | string): Promise<boolean> {
  try {
    const resolution = await resolveCanonicalOrganizationPath(organizationId);
    return resolution !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get organization by commissioner ID
 */
export async function getOrganizationByCommissionerId(commissionerId: number): Promise<OrganizationProfile | null> {
  try {
    const { getOrganizationIndexEntryByCommissionerId } = await import('./organizations-index');
    const indexEntry = await getOrganizationIndexEntryByCommissionerId(commissionerId);
    
    if (indexEntry) {
      const profilePath = getFullOrganizationProfilePath(indexEntry.path);
      const profile = await readJson<OrganizationProfile>(profilePath, null as any);
      return profile;
    }
    
    // Fallback to legacy storage
    const legacyPath = dataPath('organizations.json');
    const { fileExists } = await import('../fs-json');
    if (await fileExists(legacyPath)) {
      const organizations = await readJson<Array<any>>(legacyPath, []);
      const organization = organizations.find(o => o.contactPersonId === commissionerId);
      
      if (organization) {
        // Convert legacy format to new format
        return {
          ...organization,
          firstCommissionerId: organization.contactPersonId || 0,
          associatedCommissioners: organization.contactPersonId ? [organization.contactPersonId] : [],
          createdAt: organization.createdAt || new Date().toISOString()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error getting organization by commissionerId ${commissionerId}:`, error);
    return null;
  }
}

/**
 * Associate a commissioner with an organization
 */
export async function associateCommissionerWithOrganization(organizationId: number | string, commissionerId: number): Promise<void> {
  try {
    // Update the index
    await addCommissionerToOrganization(organizationId, commissionerId);
    
    // Update the organization profile
    const organization = await readOrganization(organizationId);
    if (!organization.associatedCommissioners.includes(commissionerId)) {
      organization.associatedCommissioners.push(commissionerId);
      await writeOrganization(organization);
    }
  } catch (error) {
    throw new OrganizationStorageError(
      'ASSOCIATION_ERROR',
      `Error associating commissioner ${commissionerId} with organization ${organizationId}: ${error instanceof Error ? error.message : String(error)}`,
      organizationId,
      error
    );
  }
}
