/**
 * Gigs Index Management
 * Handles the centralized index for hierarchical gig storage
 */

import path from 'path';
import { readJson, writeJsonAtomic } from '../fs-json';

export interface GigIndexEntry {
  path: string;
  title: string;
  commissionerId: number;
  createdAt: string;
  lastUpdated: string;
}

export type GigsIndex = Record<string, GigIndexEntry>;

const GIGS_INDEX_PATH = path.join(process.cwd(), 'data', 'gigs-index.json');

/**
 * Load the gigs index, returning empty object if file doesn't exist
 */
export async function loadGigsIndex(): Promise<GigsIndex> {
  try {
    // Try to read the new format first
    const newIndex = await readJson<GigsIndex>(GIGS_INDEX_PATH, {});
    
    // Check if this is the old format (string values instead of objects)
    const firstKey = Object.keys(newIndex)[0];
    if (firstKey && typeof newIndex[firstKey] === 'string') {
      // This is the old format, convert it
      console.log('Converting old gigs index format to new format...');
      const convertedIndex: GigsIndex = {};
      
      for (const [gigId, postedDate] of Object.entries(newIndex)) {
        const dateParts = (postedDate as string).split('-');
        const year = dateParts[0];
        const month = new Date(parseInt(year), parseInt(dateParts[1]) - 1).toLocaleString('en-US', { month: 'long' });
        const day = dateParts[2].padStart(2, '0');
        
        convertedIndex[gigId] = {
          path: `${year}/${month}/${day}/${gigId}`,
          title: `Gig ${gigId}`, // Default title, will be updated when gig is read
          commissionerId: 0, // Default, will be updated when gig is read
          createdAt: `${postedDate}T00:00:00.000Z`,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Save the converted index
      await saveGigsIndex(convertedIndex);
      return convertedIndex;
    }
    
    return newIndex;
  } catch (error) {
    console.warn('Failed to load gigs index, starting with empty index:', error);
    return {};
  }
}

/**
 * Save the gigs index atomically
 */
export async function saveGigsIndex(index: GigsIndex): Promise<void> {
  await writeJsonAtomic(GIGS_INDEX_PATH, index);
}

/**
 * Find a recent duplicate gig within the specified time window
 * Returns the existing gigId if found, null otherwise
 */
export function findRecentDuplicate(
  commissionerId: number,
  title: string,
  createdAtISO: string,
  index: GigsIndex,
  windowSeconds: number = 60
): number | null {
  const createdTime = new Date(createdAtISO).getTime();
  
  for (const [gigIdStr, entry] of Object.entries(index)) {
    if (entry.commissionerId === commissionerId && entry.title === title) {
      const entryTime = new Date(entry.createdAt).getTime();
      const timeDiff = Math.abs(createdTime - entryTime);
      
      if (timeDiff <= windowSeconds * 1000) {
        return parseInt(gigIdStr);
      }
    }
  }
  
  return null;
}

/**
 * Add or update a gig in the index
 */
export async function updateGigInIndex(
  gigId: number,
  title: string,
  commissionerId: number,
  createdAt: string,
  hierarchicalPath: string
): Promise<void> {
  const index = await loadGigsIndex();
  
  index[gigId.toString()] = {
    path: hierarchicalPath,
    title,
    commissionerId,
    createdAt,
    lastUpdated: new Date().toISOString()
  };
  
  await saveGigsIndex(index);
}

/**
 * Remove a gig from the index
 */
export async function removeGigFromIndex(gigId: number): Promise<void> {
  const index = await loadGigsIndex();
  delete index[gigId.toString()];
  await saveGigsIndex(index);
}

/**
 * Get the next available gig ID from the index
 */
export async function getNextGigIdFromIndex(): Promise<number> {
  const index = await loadGigsIndex();
  const existingIds = Object.keys(index).map(id => parseInt(id));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return maxId + 1;
}
