// src/lib/fs-json.ts

/**
 * File System JSON Utilities
 * 
 * Provides atomic JSON file operations with error handling and directory creation.
 * Used throughout the application for reading and writing JSON data files.
 */

import { promises as fs } from 'fs';
import path from 'path';

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
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Read JSON file with fallback value
 */
export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    if (await fileExists(filePath)) {
      const raw = await fs.readFile(filePath, 'utf-8');
      if (!raw.trim()) return fallback;
      return JSON.parse(raw) as T;
    }
    return fallback;
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error);
    return fallback;
  }
}

/**
 * Write JSON file atomically with directory creation
 */
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const dirPath = path.dirname(filePath);
  await ensureDir(dirPath);

  // Write to temporary file first, then rename for atomicity
  const tempPath = `${filePath}.tmp`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
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
 * Safe read with type validation
 */
export async function readJsonSafe<T>(filePath: string, fallback: T, validator?: (data: unknown) => data is T): Promise<T> {
  try {
    const data = await readJson(filePath, fallback);
    if (validator && !validator(data)) {
      console.warn(`Invalid data structure in ${filePath}, using fallback`);
      return fallback;
    }
    return data;
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error);
    return fallback;
  }
}
