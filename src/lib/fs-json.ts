import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Utility functions for safe JSON file operations with atomic writes
 */

/**
 * Safely read a JSON file, returning default value if file doesn't exist
 */
export async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Safely read a JSON file, throwing if file doesn't exist
 */
export async function readJsonRequired<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Atomically write JSON data to a file using temp file + rename
 */
export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  const dirPath = path.dirname(filePath);
  
  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });
  
  try {
    // Write to temp file first
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Atomically rename temp file to final file
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
