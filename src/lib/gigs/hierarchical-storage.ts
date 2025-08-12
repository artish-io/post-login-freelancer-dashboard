import { promises as fs } from 'fs';
import path from 'path';
import { writeJsonAtomic } from '../fs-json';
import { loadGigsIndex, type GigsIndex } from '../storage/gigs-index';

/**
 * Generate a simple sequential gig ID
 * This will be handled by getNextGigId() function
 */

export interface Gig {
  id: number;
  title: string;
  organizationId: number;
  commissionerId?: number;
  category: string;
  subcategory?: string;
  tags: string[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  description: string;
  deliveryTimeWeeks: number;
  estimatedHours: number;
  status: 'Available' | 'Unavailable' | 'Closed';
  toolsRequired: string[];
  executionMethod?: 'completion' | 'milestone';
  invoicingMethod?: 'completion' | 'milestone';
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>;
  startType?: 'Immediately' | 'Custom';
  endDate?: string;
  lowerBudget?: number;
  upperBudget?: number;
  postedDate: string;
  notes?: string;
  isPublic?: boolean;
  isTargetedRequest?: boolean;
}

/**
 * Get the hierarchical path for a gig based on its hierarchical path from index
 */
function getGigPath(hierarchicalPath: string): string {
  return path.join(
    process.cwd(),
    'data',
    'gigs',
    hierarchicalPath,
    'gig.json'
  );
}

/**
 * Legacy function: Get the hierarchical path for a gig based on its posted date
 * This is kept for backward compatibility but should be phased out
 */
function getLegacyGigPath(gigId: number, postedDate: string): string {
  // Parse date more reliably to avoid timezone issues
  const dateParts = postedDate.split('-');
  const year = parseInt(dateParts[0]);
  const monthNum = parseInt(dateParts[1]);
  const dayNum = parseInt(dateParts[2]);

  const date = new Date(year, monthNum - 1, dayNum); // Month is 0-indexed
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = dayNum.toString().padStart(2, '0');

  return path.join(
    process.cwd(),
    'data',
    'gigs',
    year.toString(),
    month,
    day,
    gigId.toString(),
    'gig.json'
  );
}

/**
 * Get the metadata index path for gigs (new unified system)
 */
function getGigMetadataPath(): string {
  return path.join(process.cwd(), 'data', 'gigs-index.json');
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Save a gig to hierarchical storage
 */
export async function saveGig(gig: Gig): Promise<void> {
  const gigPath = getLegacyGigPath(gig.id, gig.postedDate);
  const gigDir = path.dirname(gigPath);
  
  // Ensure directory exists
  await ensureDirectoryExists(gigDir);
  
  // Save the gig using atomic write
  await writeJsonAtomic(gigPath, gig);
  
  // Update metadata index
  await updateGigIndex(gig.id, gig.postedDate);
}

/**
 * Read a gig from hierarchical storage
 */
export async function readGig(gigId: number): Promise<Gig | null> {
  try {
    // Use the new unified index system
    const index = await loadGigsIndex();

    const gigEntry = index[gigId.toString()];
    if (!gigEntry) {
      console.warn(`Gig ${gigId} not found in index`);
      return null;
    }

    // Read the gig file using the hierarchical path from index
    const gigPath = getGigPath(gigEntry.path);

    // Check if file exists before attempting to read
    if (!await fs.access(gigPath).then(() => true).catch(() => false)) {
      console.warn(`Gig file not found: ${gigPath}`);

      // Fallback: try legacy path format for backward compatibility
      try {
        const legacyPath = getLegacyGigPath(gigId, gigEntry.createdAt.split('T')[0]);
        if (await fs.access(legacyPath).then(() => true).catch(() => false)) {
          console.log(`Found gig at legacy path: ${legacyPath}`);
          const gigData = await fs.readFile(legacyPath, 'utf-8');
          return JSON.parse(gigData);
        }
      } catch (legacyError) {
        console.warn(`Legacy path also failed for gig ${gigId}`);
      }

      return null;
    }

    try {
      const gigData = await fs.readFile(gigPath, 'utf-8');
      return JSON.parse(gigData);
    } catch (parseError) {
      console.error(`Error parsing gig file ${gigPath}:`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`Error reading gig ${gigId}:`, error);
    return null;
  }
}

/**
 * Update the gig metadata index (legacy function - now delegates to new system)
 */
async function updateGigIndex(gigId: number, postedDate: string): Promise<void> {
  // This function is kept for backward compatibility but now delegates to the new system
  // The new system should be used directly via updateGigInIndex from gigs-index.ts
  console.warn('updateGigIndex is deprecated, use updateGigInIndex from gigs-index.ts instead');

  // For now, we'll update the old index format to maintain compatibility
  const indexPath = path.join(process.cwd(), 'data', 'gigs', 'gigs-index.json');
  const indexDir = path.dirname(indexPath);

  await ensureDirectoryExists(indexDir);

  let index: Record<string, string> = {};

  try {
    if (await fs.access(indexPath).then(() => true).catch(() => false)) {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexData);
    }
  } catch (error) {
    // Index doesn't exist or is corrupted, start fresh
    index = {};
  }

  index[gigId.toString()] = postedDate;
  await writeJsonAtomic(indexPath, index);
}

/**
 * Read all gigs from hierarchical storage
 */
export async function readAllGigs(): Promise<Gig[]> {
  const gigs: Gig[] = [];

  try {
    // Use the new unified index system
    const index = await loadGigsIndex();

    // Read each gig
    for (const [gigIdStr, gigEntry] of Object.entries(index)) {
      const gigId = parseInt(gigIdStr);
      const gig = await readGig(gigId);

      if (gig) {
        gigs.push(gig);
      }
    }

    // Sort gigs by created date (newest first)
    return gigs.sort((a, b) => {
      const dateA = new Date(a.postedDate || '1970-01-01').getTime();
      const dateB = new Date(b.postedDate || '1970-01-01').getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error reading all gigs:', error);
    return [];
  }
}

/**
 * Update a gig in hierarchical storage
 */
export async function updateGig(gigId: number, updates: Partial<Gig>): Promise<void> {
  const existingGig = await readGig(gigId);

  if (!existingGig) {
    throw new Error(`Gig ${gigId} not found`);
  }

  const updatedGig = { ...existingGig, ...updates };

  // Get the gig entry from index to determine the correct path
  const index = await loadGigsIndex();
  const gigEntry = index[gigId.toString()];

  if (!gigEntry) {
    throw new Error(`Gig ${gigId} not found in index`);
  }

  // Write to the same path where the gig was read from (indexed path)
  const gigPath = getGigPath(gigEntry.path);
  const gigDir = path.dirname(gigPath);

  // Ensure directory exists
  await ensureDirectoryExists(gigDir);

  // Write the updated gig
  await fs.writeFile(gigPath, JSON.stringify(updatedGig, null, 2));

  console.log(`✅ Updated gig ${gigId} at ${gigPath}`);
}

/**
 * Delete a gig from hierarchical storage
 */
export async function deleteGig(gigId: number): Promise<void> {
  try {
    // Use the new unified index system
    const index = await loadGigsIndex();

    const gigEntry = index[gigId.toString()];
    if (!gigEntry) {
      console.warn(`Gig ${gigId} not found in index for deletion`);
      return;
    }

    // Delete the gig file
    const gigPath = getGigPath(gigEntry.path);

    try {
      await fs.unlink(gigPath);
    } catch (unlinkError) {
      console.warn(`Could not delete gig file ${gigPath}:`, unlinkError);
    }

    // Remove from new index (delegate to gigs-index.ts)
    const { removeGigFromIndex } = await import('../storage/gigs-index');
    await removeGigFromIndex(gigId);

    // Try to clean up empty directories
    const gigDir = path.dirname(gigPath);
    try {
      await fs.rmdir(gigDir);
    } catch {
      // Directory not empty, ignore
    }
  } catch (error) {
    console.error(`Error deleting gig ${gigId}:`, error);
  }
}

/**
 * Get gigs by organization ID
 */
export async function getGigsByOrganization(organizationId: number): Promise<Gig[]> {
  const allGigs = await readAllGigs();
  return allGigs.filter(gig => gig.organizationId === organizationId);
}

/**
 * Get gigs by commissioner ID
 */
export async function getGigsByCommissioner(commissionerId: number): Promise<Gig[]> {
  const allGigs = await readAllGigs();
  return allGigs.filter(gig => gig.commissionerId === commissionerId);
}

/**
 * Get gigs by status
 */
export async function getGigsByStatus(status: Gig['status']): Promise<Gig[]> {
  const allGigs = await readAllGigs();
  return allGigs.filter(gig => gig.status === status);
}

/**
 * Get gigs by category
 */
export async function getGigsByCategory(category: string): Promise<Gig[]> {
  const allGigs = await readAllGigs();
  return allGigs.filter(gig => gig.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get public gigs (for explore page)
 * Only returns gigs that are available for applications
 */
export async function getPublicGigs(): Promise<Gig[]> {
  const allGigs = await readAllGigs();
  return allGigs.filter(gig =>
    gig.isPublic !== false &&
    !gig.isTargetedRequest &&
    gig.status === 'Available'
  );
}

/**
 * Get next available gig ID
 */
export async function getNextGigId(): Promise<number> {
  // Use the new index system for better performance
  const { getNextGigIdFromIndex } = await import('../storage/gigs-index');
  return await getNextGigIdFromIndex();
}

/**
 * Convert legacy gigs array to hierarchical storage
 * This function is used for migration from the old flat JSON structure
 */
export async function migrateLegacyGigs(legacyGigs: Gig[]): Promise<void> {
  console.log(`Migrating ${legacyGigs.length} gigs to hierarchical storage...`);

  for (const gig of legacyGigs) {
    try {
      await saveGig(gig);
      console.log(`Migrated gig ${gig.id}`);
    } catch (error) {
      console.error(`Failed to migrate gig ${gig.id}:`, error);
    }
  }

  console.log('Gig migration completed');
}
