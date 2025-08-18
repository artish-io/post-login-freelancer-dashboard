interface NotificationKey {
  type: string;
  targetId: number;
  entityId: string;
  timeWindow: number; // minutes
}

// In-memory micro-cache for rapid deduplication
const recentNotifications = new Map<string, number>();

export function generateNotificationKey(notification: any): string {
  return `${notification.type}-${notification.targetId}-${notification.entityId}`;
}

export function isDuplicateNotification(
  notification: any,
  timeWindowMinutes: number = 5
): boolean {
  const key = generateNotificationKey(notification);
  const now = Date.now();
  const lastSent = recentNotifications.get(key);

  if (lastSent && (now - lastSent) < (timeWindowMinutes * 60 * 1000)) {
    return true;
  }

  recentNotifications.set(key, now);
  return false;
}

/**
 * Persistent deduplication using UnifiedStorageService with TTL semantics
 * This provides serverless and multi-instance safety
 */
export class PersistentDeduplication {
  private static readonly DEDUP_DIR = 'data/notifications/deduplication';
  private static readonly TTL_HOURS = 24; // 24 hour TTL for deduplication keys

  /**
   * Check if a notification is a duplicate using persistent storage
   */
  static async isDuplicatePersistent(
    notification: any,
    timeWindowMinutes: number = 5
  ): Promise<boolean> {
    try {
      const { UnifiedStorageService } = await import('../storage/unified-storage-service');
      const key = generateNotificationKey(notification);
      const now = Date.now();
      
      // Try to get existing deduplication record
      const dedupRecord = await this.getDedupRecord(key);
      
      if (dedupRecord && (now - dedupRecord.timestamp) < (timeWindowMinutes * 60 * 1000)) {
        return true; // Duplicate found
      }

      // Store new deduplication record
      await this.storeDedupRecord(key, now);
      return false; // Not a duplicate
    } catch (error) {
      console.warn('Failed to check persistent deduplication, falling back to in-memory:', error);
      // Fallback to in-memory deduplication
      return isDuplicateNotification(notification, timeWindowMinutes);
    }
  }

  /**
   * Get deduplication record from storage
   */
  private static async getDedupRecord(key: string): Promise<{ timestamp: number } | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), this.DEDUP_DIR, `${key}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const record = JSON.parse(data);
      
      // Check if record is expired
      const now = Date.now();
      if (now - record.timestamp > (this.TTL_HOURS * 60 * 60 * 1000)) {
        // Clean up expired record
        await fs.unlink(filePath).catch(() => {}); // Ignore errors
        return null;
      }
      
      return record;
    } catch (error) {
      // File doesn't exist or other error
      return null;
    }
  }

  /**
   * Store deduplication record to storage
   */
  private static async storeDedupRecord(key: string, timestamp: number): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dirPath = path.join(process.cwd(), this.DEDUP_DIR);
      const filePath = path.join(dirPath, `${key}.json`);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Store record
      await fs.writeFile(filePath, JSON.stringify({ timestamp, key }));
    } catch (error) {
      console.warn('Failed to store deduplication record:', error);
      // Don't throw - deduplication is not critical
    }
  }

  /**
   * Clean up expired deduplication records
   */
  static async cleanupExpiredRecords(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dirPath = path.join(process.cwd(), this.DEDUP_DIR);
      const files = await fs.readdir(dirPath).catch(() => []);
      const now = Date.now();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(dirPath, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const record = JSON.parse(data);
          
          // Check if expired
          if (now - record.timestamp > (this.TTL_HOURS * 60 * 60 * 1000)) {
            await fs.unlink(filePath);
            console.log(`Cleaned up expired deduplication record: ${file}`);
          }
        } catch (error) {
          // Ignore individual file errors
          console.warn(`Failed to process deduplication file ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup expired deduplication records:', error);
    }
  }
}

/**
 * Clear in-memory cache (useful for testing)
 */
export function clearDeduplicationCache(): void {
  recentNotifications.clear();
}

/**
 * Get cache statistics
 */
export function getDeduplicationStats(): { cacheSize: number; oldestEntry: number | null } {
  const now = Date.now();
  let oldestEntry: number | null = null;
  
  for (const timestamp of recentNotifications.values()) {
    if (oldestEntry === null || timestamp < oldestEntry) {
      oldestEntry = timestamp;
    }
  }
  
  return {
    cacheSize: recentNotifications.size,
    oldestEntry: oldestEntry ? now - oldestEntry : null
  };
}
