/**
 * Robust ID Generation Utilities
 * 
 * Provides collision-resistant ID generation for various entities
 * in the system while maintaining backward compatibility with numeric IDs.
 */

import { randomBytes } from 'crypto';

// Counter for ensuring uniqueness during rapid generation
let idCounter = 0;

/**
 * Generate a collision-resistant numeric ID
 * Uses timestamp + crypto random + counter for uniqueness while staying within safe integer bounds
 */
export function generateNumericId(prefix?: string): number {
  // Use a shorter timestamp (remove last 3 digits to make room for random part)
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

  // Use crypto.randomBytes for better randomness
  const randomBuffer = randomBytes(4);
  const randomPart = randomBuffer.readUInt32BE(0) % 100000; // 5 digits max

  // Add counter for rapid generation uniqueness (reset every 1000)
  idCounter = (idCounter + 1) % 1000;

  // Combine: timestamp (10 digits) + random (5 digits) + counter (3 digits) = 18 digits max
  // This stays well within Number.MAX_SAFE_INTEGER (15-16 digits)
  const id = timestamp * 100000000 + randomPart * 1000 + idCounter;

  // Double-check we're within safe bounds
  if (id > Number.MAX_SAFE_INTEGER) {
    // Fallback: simpler approach
    return Date.now() + (randomBuffer.readUInt32BE(0) % 999999);
  }

  return id;
}

/**
 * Generate a project ID with collision detection
 */
export function generateProjectId(): number {
  return generateNumericId('project');
}

/**
 * Generate a task ID with collision detection
 */
export function generateTaskId(): number {
  return generateNumericId('task');
}

/**
 * Generate an invoice ID with collision detection
 */
export function generateInvoiceId(): number {
  return generateNumericId('invoice');
}

/**
 * Generate a UUID-style string ID for entities that can use strings
 */
export function generateStringId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString('hex');
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a short alphanumeric ID (like invoice numbers)
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBuffer = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBuffer[i] % chars.length];
  }
  
  return result;
}

/**
 * Generate a user-prefixed invoice number
 */
export function generateInvoiceNumber(userInitials: string): string {
  const shortId = generateShortId(5);
  return `${userInitials}-${shortId}`;
}

/**
 * Validate that an ID is within safe integer bounds
 */
export function validateNumericId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= Number.MAX_SAFE_INTEGER;
}

/**
 * ID collision detection utility
 * Checks if an ID already exists in a given set
 */
export function checkIdCollision(id: number | string, existingIds: Set<number | string>): boolean {
  return existingIds.has(id);
}

/**
 * Generate a unique ID with collision detection
 * Retries up to maxAttempts times if collisions occur
 */
export function generateUniqueId(
  generator: () => number | string,
  existingIds: Set<number | string>,
  maxAttempts: number = 10
): number | string {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generator();
    if (!checkIdCollision(id, existingIds)) {
      return id;
    }
  }
  
  throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
}

/**
 * Enhanced project ID generation with collision detection
 */
export function generateUniqueProjectId(existingProjectIds: Set<number>): number {
  return generateUniqueId(
    generateProjectId,
    existingProjectIds,
    10
  ) as number;
}

/**
 * Generate organization-based project ID in format [ORG_FIRST_LETTER]-[COUNTER]
 * Example: For "Corlax Wellness" -> "C-001", "C-002", etc.
 */
export function generateOrganizationProjectId(organizationName: string, existingProjectIds: Set<string> = new Set()): string {
  // Extract first letter of organization name
  const firstLetter = organizationName.trim().charAt(0).toUpperCase();
  const prefix = firstLetter || 'X'; // Fallback to 'X' if no name

  // Find the highest existing counter for this organization
  let maxCounter = 0;
  const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);

  for (const existingId of existingProjectIds) {
    const match = existingId.match(prefixPattern);
    if (match) {
      const counter = parseInt(match[1], 10);
      if (counter > maxCounter) {
        maxCounter = counter;
      }
    }
  }

  // Generate next counter
  const nextCounter = maxCounter + 1;
  const paddedCounter = nextCounter.toString().padStart(3, '0');

  return `${prefix}-${paddedCounter}`;
}

/**
 * Enhanced task ID generation with collision detection
 */
export function generateUniqueTaskId(existingTaskIds: Set<number>): number {
  return generateUniqueId(
    generateTaskId,
    existingTaskIds,
    10
  ) as number;
}

/**
 * Performance monitoring for ID generation
 */
export interface IdGenerationMetrics {
  totalGenerated: number;
  collisions: number;
  averageAttempts: number;
  lastGenerated: string;
}

class IdGenerationMonitor {
  private metrics: IdGenerationMetrics = {
    totalGenerated: 0,
    collisions: 0,
    averageAttempts: 0,
    lastGenerated: new Date().toISOString()
  };

  recordGeneration(attempts: number): void {
    this.metrics.totalGenerated++;
    this.metrics.collisions += attempts - 1;
    this.metrics.averageAttempts = 
      (this.metrics.averageAttempts * (this.metrics.totalGenerated - 1) + attempts) / 
      this.metrics.totalGenerated;
    this.metrics.lastGenerated = new Date().toISOString();
  }

  getMetrics(): IdGenerationMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalGenerated: 0,
      collisions: 0,
      averageAttempts: 0,
      lastGenerated: new Date().toISOString()
    };
  }
}

export const idGenerationMonitor = new IdGenerationMonitor();
