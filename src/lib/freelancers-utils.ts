/**
 * Freelancers Utilities
 * 
 * Provides controlled access to freelancer data while maintaining compatibility
 * with existing APIs during the migration to hierarchical storage.
 * 
 * This module serves as a bridge between legacy flat file access and the
 * future hierarchical storage system for freelancer profiles.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Types
export interface Freelancer {
  id: number;
  userId: number;
  category: string;
  skills: string[];
  skillCategories?: string[]; // Alternative skill format
  tools?: string[]; // Tools used by freelancer
  rate: string;
  minRate: number;
  maxRate: number;
  location: string;
  rating: number;
  availability: string;
  withdrawalMethod?: string;
  specializations?: string[];
  about?: string;
  responsibilities?: string[];
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
}

// Cache for freelancers data
let freelancersCache: Freelancer[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the freelancers file path
 */
function getFreelancersPath(): string {
  return path.join(process.cwd(), 'data', 'freelancers.json');
}

/**
 * Read all freelancers with caching
 */
export async function readAllFreelancers(): Promise<Freelancer[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (freelancersCache && (now - cacheTimestamp) < CACHE_TTL) {
    return freelancersCache;
  }
  
  try {
    console.log('📖 Reading freelancers from controlled legacy access:', getFreelancersPath());
    const data = await fs.readFile(getFreelancersPath(), 'utf-8');
    const freelancers = JSON.parse(data) as Freelancer[];
    
    // Update cache
    freelancersCache = freelancers;
    cacheTimestamp = now;
    
    return freelancers;
  } catch (error) {
    console.error('❌ Error reading freelancers data:', error);
    throw new Error(`Failed to read freelancers data: ${error}`);
  }
}

/**
 * Get freelancer by ID
 */
export async function getFreelancerById(id: number): Promise<Freelancer | null> {
  const freelancers = await readAllFreelancers();
  return freelancers.find(f => f.id === id) || null;
}

/**
 * Get freelancer by user ID
 */
export async function getFreelancerByUserId(userId: number): Promise<Freelancer | null> {
  const freelancers = await readAllFreelancers();
  return freelancers.find(f => f.userId === userId) || null;
}

/**
 * Get freelancers by category
 */
export async function getFreelancersByCategory(category: string): Promise<Freelancer[]> {
  const freelancers = await readAllFreelancers();
  return freelancers.filter(f => f.category === category);
}

/**
 * Get freelancers by skill
 */
export async function getFreelancersBySkill(skill: string): Promise<Freelancer[]> {
  const freelancers = await readAllFreelancers();
  return freelancers.filter(f => 
    f.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
  );
}

/**
 * Get freelancers by availability
 */
export async function getAvailableFreelancers(): Promise<Freelancer[]> {
  const freelancers = await readAllFreelancers();
  return freelancers.filter(f => f.availability === 'Available');
}

/**
 * Get freelancers by rating range
 */
export async function getFreelancersByRating(minRating: number): Promise<Freelancer[]> {
  const freelancers = await readAllFreelancers();
  return freelancers.filter(f => f.rating >= minRating);
}

/**
 * Get freelancers by rate range
 */
export async function getFreelancersByRateRange(minRate: number, maxRate: number): Promise<Freelancer[]> {
  const freelancers = await readAllFreelancers();
  return freelancers.filter(f => 
    f.minRate <= maxRate && f.maxRate >= minRate
  );
}

/**
 * Update freelancer data
 * Note: This writes directly to the file for now, but should be migrated
 * to hierarchical storage in the future
 */
export async function updateFreelancer(id: number, updates: Partial<Freelancer>): Promise<void> {
  const freelancers = await readAllFreelancers();
  const index = freelancers.findIndex(f => f.id === id);
  
  if (index === -1) {
    throw new Error(`Freelancer with ID ${id} not found`);
  }
  
  // Update the freelancer
  freelancers[index] = { ...freelancers[index], ...updates };
  
  // Write back to file
  await fs.writeFile(getFreelancersPath(), JSON.stringify(freelancers, null, 2));
  
  // Clear cache to force reload
  freelancersCache = null;
  
  console.log(`✅ Updated freelancer ${id}`);
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearFreelancersCache(): void {
  freelancersCache = null;
  cacheTimestamp = 0;
}

/**
 * Get cache statistics
 */
export function getFreelancersCacheStats() {
  return {
    isCached: freelancersCache !== null,
    cacheAge: freelancersCache ? Date.now() - cacheTimestamp : 0,
    cacheSize: freelancersCache ? freelancersCache.length : 0,
    ttl: CACHE_TTL
  };
}
