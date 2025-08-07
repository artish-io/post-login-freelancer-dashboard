import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export interface GigRequest {
  id: number;
  freelancerId: number;
  commissionerId: number;
  gigId?: number;
  organizationId?: number;
  title: string;
  skills: string[];
  tools: string[];
  notes: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  deliveryTimeWeeks?: number;
  status: string;
  createdAt: string;
  responses: any[];
  acceptedAt?: string;
  projectId?: number;
}

const GIG_REQUESTS_BASE_PATH = path.join(process.cwd(), 'data/gigs/gig-requests');
const LEGACY_REQUESTS_PATH = path.join(process.cwd(), 'data/gigs/gig-requests.json');

/**
 * Read all gig requests from hierarchical structure
 */
export async function readAllGigRequests(): Promise<GigRequest[]> {
  const allRequests: GigRequest[] = [];
  
  try {
    // First, try to read from legacy file for backward compatibility
    try {
      const legacyData = await readFile(LEGACY_REQUESTS_PATH, 'utf-8');
      const legacyRequests = JSON.parse(legacyData);
      allRequests.push(...legacyRequests);
    } catch (error) {
      // Legacy file doesn't exist or is empty, continue with hierarchical structure
    }
    
    // Read from hierarchical structure
    const hierarchicalRequests = await readHierarchicalGigRequests();
    allRequests.push(...hierarchicalRequests);
    
    return allRequests;
  } catch (error) {
    console.error('Error reading gig requests:', error);
    return [];
  }
}

/**
 * Read gig requests from hierarchical structure only
 */
async function readHierarchicalGigRequests(): Promise<GigRequest[]> {
  const allRequests: GigRequest[] = [];
  
  try {
    // Check if base directory exists
    const baseStats = await stat(GIG_REQUESTS_BASE_PATH);
    if (!baseStats.isDirectory()) {
      return [];
    }
    
    // Read years
    const years = await readdir(GIG_REQUESTS_BASE_PATH);
    
    for (const year of years) {
      const yearPath = path.join(GIG_REQUESTS_BASE_PATH, year);
      const yearStats = await stat(yearPath);
      
      if (!yearStats.isDirectory()) continue;
      
      // Read months
      const months = await readdir(yearPath);
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStats = await stat(monthPath);
        
        if (!monthStats.isDirectory()) continue;
        
        // Read days
        const days = await readdir(monthPath);
        
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const dayStats = await stat(dayPath);
          
          if (!dayStats.isDirectory()) continue;
          
          // Read freelancer files
          const files = await readdir(dayPath);
          
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(dayPath, file);
            
            try {
              const fileData = await readFile(filePath, 'utf-8');
              const requests = JSON.parse(fileData);
              
              if (Array.isArray(requests)) {
                allRequests.push(...requests);
              } else {
                allRequests.push(requests);
              }
            } catch (error) {
              console.error(`Error reading file ${filePath}:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading hierarchical gig requests:', error);
  }
  
  return allRequests;
}

/**
 * Read gig requests for a specific freelancer
 */
export async function readGigRequestsForFreelancer(freelancerId: number): Promise<GigRequest[]> {
  const allRequests = await readAllGigRequests();
  return allRequests.filter(request => request.freelancerId === freelancerId);
}

/**
 * Read gig requests for a specific commissioner
 */
export async function readGigRequestsForCommissioner(commissionerId: number): Promise<GigRequest[]> {
  const allRequests = await readAllGigRequests();
  return allRequests.filter(request => request.commissionerId === commissionerId);
}

/**
 * Filter gig requests by status
 */
export function filterGigRequestsByStatus(requests: GigRequest[], status?: string): GigRequest[] {
  if (!status || status === 'all') {
    return requests;
  }
  
  return requests.filter(request => 
    request.status?.toLowerCase() === status.toLowerCase()
  );
}
