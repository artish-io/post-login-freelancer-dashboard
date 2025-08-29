import { promises as fs } from 'fs';
import path from 'path';

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
  customStartDate?: string;
  endDate?: string;
  lowerBudget?: number;
  upperBudget?: number;
  postedDate: string;
  notes?: string;
  isPublic?: boolean;
  isTargetedRequest?: boolean;
  briefFile?: {
    name: string;
    size: number;
    type: string;
    path?: string; // File path for server storage
  };
}

/**
 * Get the hierarchical path for a gig based on its posted date
 */
function getGigPath(gigId: number, postedDate: string): string {
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
 * Get the metadata index path for gigs
 */
function getGigMetadataPath(): string {
  return path.join(process.cwd(), 'data', 'gigs', 'gigs-index.json');
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
  const gigPath = getGigPath(gig.id, gig.postedDate);
  const gigDir = path.dirname(gigPath);
  
  // Ensure directory exists
  await ensureDirectoryExists(gigDir);
  
  // Save the gig
  await fs.writeFile(gigPath, JSON.stringify(gig, null, 2));
  
  // Update metadata index
  await updateGigIndex(gig.id, gig.postedDate);
}

/**
 * Read a gig from hierarchical storage
 */
export async function readGig(gigId: number | null): Promise<Gig | null> {
  try {
    // Handle null gigId case
    if (gigId === null || gigId === undefined) {
      console.warn('readGig called with null/undefined gigId');
      return null;
    }

    // First, get the posted date from the index
    const indexPath = getGigMetadataPath();

    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return null;
    }

    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);

    const postedDate = index[gigId.toString()];
    if (!postedDate) {
      return null;
    }
    
    // Read the gig file
    const gigPath = getGigPath(gigId, postedDate);

    // Check if file exists before attempting to read
    if (!await fs.access(gigPath).then(() => true).catch(() => false)) {
      console.warn(`Gig file not found: ${gigPath}`);
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
 * Update the gig metadata index
 */
async function updateGigIndex(gigId: number, postedDate: string): Promise<void> {
  const indexPath = getGigMetadataPath();
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
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Read all gigs from hierarchical storage
 */
export async function readAllGigs(): Promise<Gig[]> {
  const gigs: Gig[] = [];
  
  try {
    // Read the gigs index to get all gig locations
    const indexPath = getGigMetadataPath();
    
    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return [];
    }
    
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    // Read each gig
    for (const [gigIdStr, postedDate] of Object.entries(index)) {
      const gigId = parseInt(gigIdStr);
      const gig = await readGig(gigId);
      
      if (gig) {
        gigs.push(gig);
      }
    }
    
    // Sort gigs by posted date (newest first)
    return gigs.sort((a, b) => {
      const dateA = new Date(a.postedDate).getTime();
      const dateB = new Date(b.postedDate).getTime();
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
  await saveGig(updatedGig);
}

/**
 * Delete a gig from hierarchical storage
 */
export async function deleteGig(gigId: number): Promise<void> {
  try {
    // Get the posted date from the index
    const indexPath = getGigMetadataPath();

    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return;
    }

    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);

    const postedDate = index[gigId.toString()];
    if (!postedDate) {
      return;
    }

    // Delete the gig file
    const gigPath = getGigPath(gigId, postedDate);
    await fs.unlink(gigPath);

    // Remove from index
    delete index[gigId.toString()];
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

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
  const allGigs = await readAllGigs();
  const maxId = Math.max(...allGigs.map(gig => gig.id), 0);
  return maxId + 1;
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
