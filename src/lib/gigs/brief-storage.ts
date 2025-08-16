import { promises as fs } from 'fs';
import path from 'path';

/**
 * Hierarchical Project Brief Storage Utilities
 * 
 * Structure: data/gigs/project-briefs/[year]/[month]/[day]/[gigId]/[filename]
 */

export interface BriefFileInfo {
  name: string;
  size: number;
  type: string;
  path: string;
  uploadedAt: string;
}

/**
 * Get the hierarchical path for a project brief file
 */
function getBriefPath(gigId: number, postedDate: string, filename: string): string {
  // Parse date to avoid timezone issues
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
    'project-briefs',
    year.toString(),
    month,
    day,
    gigId.toString(),
    filename
  );
}

/**
 * Get the directory path for a gig's brief files
 */
function getBriefDirectory(gigId: number, postedDate: string): string {
  const dateParts = postedDate.split('-');
  const year = parseInt(dateParts[0]);
  const monthNum = parseInt(dateParts[1]);
  const dayNum = parseInt(dateParts[2]);

  const date = new Date(year, monthNum - 1, dayNum);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = dayNum.toString().padStart(2, '0');
  
  return path.join(
    process.cwd(),
    'data',
    'gigs',
    'project-briefs',
    year.toString(),
    month,
    day,
    gigId.toString()
  );
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create directory:', error);
    throw error;
  }
}

/**
 * Save a project brief file to hierarchical storage
 */
export async function saveBriefFile(
  gigId: number,
  postedDate: string,
  filename: string,
  fileBuffer: Buffer
): Promise<BriefFileInfo> {
  const filePath = getBriefPath(gigId, postedDate, filename);
  const directory = path.dirname(filePath);
  
  // Ensure directory exists
  await ensureDirectoryExists(directory);
  
  // Save the file
  await fs.writeFile(filePath, fileBuffer);
  
  // Get file stats
  const stats = await fs.stat(filePath);
  
  // Return file info
  const briefInfo: BriefFileInfo = {
    name: filename,
    size: stats.size,
    type: getFileType(filename),
    path: getRelativePath(filePath),
    uploadedAt: new Date().toISOString()
  };
  
  return briefInfo;
}

/**
 * Read a project brief file from hierarchical storage
 */
export async function readBriefFile(gigId: number, postedDate: string, filename: string): Promise<Buffer | null> {
  try {
    const filePath = getBriefPath(gigId, postedDate, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Read and return the file
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('Error reading brief file:', error);
    return null;
  }
}

/**
 * Check if a brief file exists
 */
export async function briefFileExists(gigId: number, postedDate: string, filename: string): Promise<boolean> {
  try {
    const filePath = getBriefPath(gigId, postedDate, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a project brief file
 */
export async function deleteBriefFile(gigId: number, postedDate: string, filename: string): Promise<boolean> {
  try {
    const filePath = getBriefPath(gigId, postedDate, filename);
    await fs.unlink(filePath);
    
    // Try to remove empty directories (optional cleanup)
    try {
      const directory = path.dirname(filePath);
      const files = await fs.readdir(directory);
      if (files.length === 0) {
        await fs.rmdir(directory);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting brief file:', error);
    return false;
  }
}

/**
 * List all brief files for a gig
 */
export async function listBriefFiles(gigId: number, postedDate: string): Promise<BriefFileInfo[]> {
  try {
    const directory = getBriefDirectory(gigId, postedDate);
    
    // Check if directory exists
    await fs.access(directory);
    
    const files = await fs.readdir(directory);
    const briefFiles: BriefFileInfo[] = [];
    
    for (const filename of files) {
      const filePath = path.join(directory, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        briefFiles.push({
          name: filename,
          size: stats.size,
          type: getFileType(filename),
          path: getRelativePath(filePath),
          uploadedAt: stats.birthtime.toISOString()
        });
      }
    }
    
    return briefFiles;
  } catch (error) {
    console.error('Error listing brief files:', error);
    return [];
  }
}

/**
 * Get file type based on extension
 */
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get relative path from absolute path
 */
function getRelativePath(absolutePath: string): string {
  const projectRoot = process.cwd();
  return path.relative(projectRoot, absolutePath);
}

/**
 * Get absolute path from relative path
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}
