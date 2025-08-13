// src/lib/id-generator.ts

/**
 * ID Generation Utilities
 * 
 * Provides atomic ID generation for projects, gigs, invoices, etc.
 * Uses timestamp-based IDs for uniqueness and ordering.
 */

import { writeJsonAtomic, readJson, fileExists } from './fs-json';
import path from 'path';

interface IdCounters {
  project: number;
  gig: number;
  invoice: number;
  task: number;
  lastUpdated: string;
}

const ID_COUNTERS_PATH = path.join(process.cwd(), 'data', 'id-counters.json');

/**
 * Load ID counters from disk
 */
async function loadIdCounters(): Promise<IdCounters> {
  try {
    if (await fileExists(ID_COUNTERS_PATH)) {
      return await readJson<IdCounters>(ID_COUNTERS_PATH, getDefaultCounters());
    }
  } catch (error) {
    console.warn('Failed to load ID counters, using defaults:', error);
  }
  
  return getDefaultCounters();
}

/**
 * Save ID counters to disk
 */
async function saveIdCounters(counters: IdCounters): Promise<void> {
  counters.lastUpdated = new Date().toISOString();
  await writeJsonAtomic(ID_COUNTERS_PATH, counters);
}

/**
 * Get default ID counters
 */
function getDefaultCounters(): IdCounters {
  return {
    project: 1000,
    gig: 1000,
    invoice: 1000,
    task: 1000,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Generate next ID for a given type
 */
export async function getNextId(type: keyof Omit<IdCounters, 'lastUpdated'>): Promise<number> {
  const counters = await loadIdCounters();
  
  // Use timestamp-based ID for better uniqueness
  const timestamp = Date.now();
  const baseId = Math.max(counters[type] + 1, timestamp);
  
  // Update counter
  counters[type] = baseId;
  await saveIdCounters(counters);
  
  return baseId;
}

/**
 * Get current counter value without incrementing
 */
export async function getCurrentId(type: keyof Omit<IdCounters, 'lastUpdated'>): Promise<number> {
  const counters = await loadIdCounters();
  return counters[type];
}

/**
 * Set counter to a specific value (useful for migrations)
 */
export async function setIdCounter(type: keyof Omit<IdCounters, 'lastUpdated'>, value: number): Promise<void> {
  const counters = await loadIdCounters();
  counters[type] = value;
  await saveIdCounters(counters);
}

/**
 * Reset all counters to defaults
 */
export async function resetIdCounters(): Promise<void> {
  await saveIdCounters(getDefaultCounters());
}

/**
 * Get all current counter values
 */
export async function getAllCounters(): Promise<IdCounters> {
  return await loadIdCounters();
}
