/**
 * Hierarchical Gig Applications Storage Utilities
 * 
 * Manages gig applications in a hierarchical file structure:
 * data/gigs/gig-applications/[year]/[month]/[day]/[applicationId].json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';

export interface GigApplication {
  id: number;
  gigId: number;
  freelancerId: number;
  pitch: string;
  sampleLinks: string[];
  skills: string[];
  tools: string[];
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectedAt?: string;
  migratedAt?: string;
  originalSource?: string;
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Generate hierarchical path for gig application
 */
export function generateApplicationPath(submittedAt: string, applicationId: number): string {
  const date = new Date(submittedAt);
  const year = date.getFullYear();
  const month = format(date, 'MMMM'); // Full month name like "August"
  const day = String(date.getDate()).padStart(2, '0');
  
  return path.join(
    process.cwd(),
    'data',
    'gigs',
    'gig-applications',
    String(year),
    month,
    day,
    `${applicationId}.json`
  );
}

/**
 * Get gig applications index path
 */
export function getApplicationsIndexPath(): string {
  return path.join(process.cwd(), 'data', 'gigs', 'gig-applications-index.json');
}

/**
 * Write a gig application to hierarchical storage
 */
export async function writeGigApplication(application: GigApplication): Promise<void> {
  const filePath = generateApplicationPath(application.submittedAt, application.id);
  const dirPath = path.dirname(filePath);
  
  await ensureDirectoryExists(dirPath);
  
  const applicationWithTimestamp = {
    ...application,
    lastModified: new Date().toISOString()
  };
  
  await fs.writeFile(filePath, JSON.stringify(applicationWithTimestamp, null, 2));
  
  // Update index
  await updateApplicationsIndex(application.id, application.submittedAt);
}

/**
 * Update gig applications index
 */
async function updateApplicationsIndex(applicationId: number, submittedAt: string): Promise<void> {
  const indexPath = getApplicationsIndexPath();
  
  let index: Record<string, { path: string; submittedAt: string }> = {};
  
  try {
    const indexData = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(indexData);
  } catch (error) {
    // Index doesn't exist yet, start with empty object
  }
  
  const relativePath = path.relative(
    path.join(process.cwd(), 'data', 'gigs', 'gig-applications'),
    generateApplicationPath(submittedAt, applicationId)
  );
  
  index[applicationId.toString()] = {
    path: relativePath,
    submittedAt
  };
  
  await ensureDirectoryExists(path.dirname(indexPath));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Read a gig application from hierarchical storage
 */
export async function readGigApplication(applicationId: number): Promise<GigApplication | null> {
  try {
    // First, get the submitted date from the index
    const indexPath = getApplicationsIndexPath();
    
    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return await readLegacyGigApplication(applicationId);
    }
    
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    const applicationInfo = index[applicationId.toString()];
    if (!applicationInfo) {
      return await readLegacyGigApplication(applicationId);
    }
    
    // Read the application file
    const applicationPath = path.join(
      process.cwd(),
      'data',
      'gigs',
      'gig-applications',
      applicationInfo.path
    );
    
    if (!await fs.access(applicationPath).then(() => true).catch(() => false)) {
      console.warn(`Gig application file not found: ${applicationPath}`);
      return await readLegacyGigApplication(applicationId);
    }
    
    const content = await fs.readFile(applicationPath, 'utf-8');
    return JSON.parse(content) as GigApplication;
    
  } catch (error) {
    console.warn(`Error reading gig application ${applicationId}:`, error);
    return await readLegacyGigApplication(applicationId);
  }
}

/**
 * Read all gig applications from hierarchical storage
 */
export async function readAllGigApplications(): Promise<GigApplication[]> {
  const applications: GigApplication[] = [];
  const basePath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications');
  
  try {
    // Check if hierarchical structure exists
    await fs.access(basePath);
    
    const years = await fs.readdir(basePath);
    
    for (const year of years) {
      // Skip files, only process directories (years should be like "2025")
      if (!year.match(/^\d{4}$/)) continue;
      
      const yearPath = path.join(basePath, year);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;
      
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);
        if (!monthStat.isDirectory()) continue;
        
        const days = await fs.readdir(monthPath);
        
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const dayStat = await fs.stat(dayPath);
          if (!dayStat.isDirectory()) continue;
          
          const files = await fs.readdir(dayPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const filePath = path.join(dayPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const application = JSON.parse(content) as GigApplication;
                applications.push(application);
              } catch (error) {
                console.warn(`Error reading application file ${file}:`, error);
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.warn('Hierarchical gig applications not found, falling back to legacy file');
    return await readLegacyGigApplications();
  }
  
  return applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Read gig applications for a specific gig
 */
export async function readGigApplicationsByGig(gigId: number): Promise<GigApplication[]> {
  const allApplications = await readAllGigApplications();
  return allApplications.filter(app => app.gigId === gigId);
}

/**
 * Read gig applications by freelancer
 */
export async function readGigApplicationsByFreelancer(freelancerId: number): Promise<GigApplication[]> {
  const allApplications = await readAllGigApplications();
  return allApplications.filter(app => app.freelancerId === freelancerId);
}

/**
 * Legacy fallback: read from flat file (DEPRECATED - migration completed)
 */
async function readLegacyGigApplications(): Promise<GigApplication[]> {
  console.warn('⚠️ Legacy gig-applications.json file access attempted but file has been migrated to hierarchical storage.');
  return [];
}

/**
 * Legacy fallback: read single application from flat file (DEPRECATED - migration completed)
 */
async function readLegacyGigApplication(applicationId: number): Promise<GigApplication | null> {
  console.warn('⚠️ Legacy gig-applications.json file access attempted but file has been migrated to hierarchical storage.');
  return null;
}

/**
 * Update gig application status
 */
export async function updateGigApplicationStatus(
  applicationId: number, 
  status: 'pending' | 'accepted' | 'rejected'
): Promise<void> {
  const application = await readGigApplication(applicationId);
  if (!application) {
    throw new Error(`Gig application ${applicationId} not found`);
  }
  
  const updatedApplication = {
    ...application,
    status,
    lastModified: new Date().toISOString()
  };
  
  await writeGigApplication(updatedApplication);
}
