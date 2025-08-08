import fs from 'fs';
import path from 'path';
import { EventType } from '../events/event-logger';

export interface NotificationEvent {
  id: string;
  timestamp: string;
  type: EventType;
  notificationType: number;
  actorId: number;
  targetId?: number;
  entityType: number;
  entityId: number | string;
  metadata: Record<string, any>;
  context?: Record<string, any>;
}

/**
 * Notification Storage Manager
 *
 * Manages notifications across granular partitioned files for maximum scalability:
 * - data/notifications/events/2025/July/01/invoice_paid.json
 * - data/notifications/events/2025/July/01/task_submitted.json
 * - data/notifications/events/2025/July/02/product_purchased.json
 * - etc.
 *
 * This granular structure prevents any single file from becoming too large,
 * improves performance, and allows for efficient querying by date and event type.
 */
export class NotificationStorage {
  private static readonly EVENTS_DIR = path.join(process.cwd(), 'data/notifications/events');
  private static readonly LEGACY_FILE = path.join(process.cwd(), 'data/notifications/notifications-log.json');
  private static readonly LEGACY_MONTHLY_DIR = path.join(process.cwd(), 'data/notifications/events');
  private static readonly READ_STATES_FILE = path.join(process.cwd(), 'data/notifications/read-states.json');
  private static readonly ACTIONED_STATES_FILE = path.join(process.cwd(), 'data/notifications/actioned-states.json');

  /**
   * Ensure the events directory exists
   */
  private static ensureEventsDirectory(): void {
    if (!fs.existsSync(this.EVENTS_DIR)) {
      fs.mkdirSync(this.EVENTS_DIR, { recursive: true });
    }
  }

  /**
   * Get the granular path for an event
   * Format: data/notifications/events/2025/July/01/invoice_paid.json
   */
  private static getGranularEventPath(date: Date, eventType: string): string {
    const year = date.getFullYear().toString();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate().toString().padStart(2, '0');

    const dirPath = path.join(this.EVENTS_DIR, year, month, day);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    return path.join(dirPath, `${eventType}.json`);
  }

  /**
   * Load events from a granular event file
   */
  private static loadGranularEvents(filePath: string): NotificationEvent[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.trim() ? JSON.parse(content) : [];
    } catch (error) {
      console.error(`Error loading granular events from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Save events to a granular event file
   */
  private static saveGranularEvents(filePath: string, events: NotificationEvent[]): void {
    try {
      // Sort events by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
    } catch (error) {
      console.error(`Error saving granular events to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get the filename for a given date
   */
  private static getPartitionFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}.json`;
  }

  /**
   * Get the full path for a partition file
   */
  private static getPartitionPath(date: Date): string {
    return path.join(this.EVENTS_DIR, this.getPartitionFilename(date));
  }

  /**
   * Load events from a specific partition file
   */
  private static loadPartition(filePath: string): NotificationEvent[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.trim() ? JSON.parse(content) : [];
    } catch (error) {
      console.error(`Error loading partition ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Save events to a specific partition file
   */
  private static savePartition(filePath: string, events: NotificationEvent[]): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
    } catch (error) {
      console.error(`Error saving partition ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Add a new notification event using granular storage
   */
  static addEvent(event: NotificationEvent): void {
    this.ensureEventsDirectory();

    const eventDate = new Date(event.timestamp);
    const granularPath = this.getGranularEventPath(eventDate, event.type);

    // Load existing events from the granular file
    const events = this.loadGranularEvents(granularPath);

    // Add new event at the beginning (most recent first)
    events.unshift(event);

    // Keep only the most recent 100 events per granular file to prevent files from growing too large
    if (events.length > 100) {
      events.splice(100);
    }

    // Save updated events
    this.saveGranularEvents(granularPath, events);

    const year = eventDate.getFullYear();
    const month = eventDate.toLocaleDateString('en-US', { month: 'long' });
    const day = eventDate.getDate().toString().padStart(2, '0');
    console.log(`📝 Added ${event.type} event to granular storage: ${year}/${month}/${day}/${event.type}.json`);
  }

  /**
   * Get events for a specific user within a date range
   */
  static getEventsForUser(
    userId: number, 
    userType: 'freelancer' | 'commissioner',
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): NotificationEvent[] {
    this.ensureEventsDirectory();
    
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth() - 3, 1); // Default: 3 months ago
    const end = endDate || now;
    
    const allEvents: NotificationEvent[] = [];
    
    // Generate list of dates to check using granular structure
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const year = currentDate.getFullYear().toString();
      const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
      const day = currentDate.getDate().toString().padStart(2, '0');

      const dayDir = path.join(this.EVENTS_DIR, year, month, day);

      if (fs.existsSync(dayDir)) {
        // Get all event type files for this day
        const eventFiles = fs.readdirSync(dayDir).filter(file => file.endsWith('.json'));

        for (const eventFile of eventFiles) {
          const eventFilePath = path.join(dayDir, eventFile);
          const dayEvents = this.loadGranularEvents(eventFilePath);
          allEvents.push(...dayEvents);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Filter events for the specific user
    const userEvents = allEvents.filter(event => {
      // Check if this event is relevant to the user
      if (userType === 'freelancer') {
        return event.targetId === userId;
      } else {
        // For commissioners, they could be either actor or target depending on the event
        return event.actorId === userId || event.targetId === userId;
      }
    });
    
    // Sort by timestamp (newest first) and limit results
    return userEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Legacy migration method - no longer needed as legacy files have been removed
   * @deprecated Legacy files have been removed. This method is kept for reference only.
   */
  static migrateLegacyFile(): void {
    console.log('⚠️  Legacy migration no longer needed - legacy files have been removed');
    console.log('✅ System is already using the new granular event storage');
  }

  /**
   * Load read states from storage
   */
  private static loadReadStates(): Record<string, Set<number>> {
    try {
      if (!fs.existsSync(this.READ_STATES_FILE)) {
        return {};
      }
      const content = fs.readFileSync(this.READ_STATES_FILE, 'utf-8');
      const data = JSON.parse(content);

      // Convert arrays back to Sets
      const readStates: Record<string, Set<number>> = {};
      for (const [notificationId, userIds] of Object.entries(data)) {
        readStates[notificationId] = new Set(userIds as number[]);
      }
      return readStates;
    } catch (error) {
      console.error('Error loading read states:', error);
      return {};
    }
  }

  /**
   * Save read states to storage
   */
  private static saveReadStates(readStates: Record<string, Set<number>>): void {
    try {
      // Convert Sets to arrays for JSON serialization
      const data: Record<string, number[]> = {};
      for (const [notificationId, userIds] of Object.entries(readStates)) {
        data[notificationId] = Array.from(userIds);
      }

      // Ensure directory exists
      const dir = path.dirname(this.READ_STATES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.READ_STATES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving read states:', error);
    }
  }

  /**
   * Mark a notification as read for a specific user
   */
  static markAsRead(notificationId: string, userId: number): void {
    const readStates = this.loadReadStates();

    if (!readStates[notificationId]) {
      readStates[notificationId] = new Set();
    }

    readStates[notificationId].add(userId);
    this.saveReadStates(readStates);
  }

  /**
   * Check if a notification is read by a specific user
   */
  static isRead(notificationId: string, userId: number): boolean {
    const readStates = this.loadReadStates();
    return readStates[notificationId]?.has(userId) || false;
  }

  /**
   * Load actioned states from storage
   */
  private static loadActionedStates(): Record<string, Record<number, string>> {
    try {
      if (fs.existsSync(this.ACTIONED_STATES_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.ACTIONED_STATES_FILE, 'utf-8'));
        return data || {};
      }
      return {};
    } catch (error) {
      console.error('Error loading actioned states:', error);
      return {};
    }
  }

  /**
   * Save actioned states to storage
   */
  private static saveActionedStates(actionedStates: Record<string, Record<number, string>>): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.ACTIONED_STATES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.ACTIONED_STATES_FILE, JSON.stringify(actionedStates, null, 2));
    } catch (error) {
      console.error('Error saving actioned states:', error);
    }
  }

  /**
   * Mark a notification as actioned for a specific user
   */
  static markAsActioned(notificationId: string, userId: number, action: string): void {
    const actionedStates = this.loadActionedStates();

    if (!actionedStates[notificationId]) {
      actionedStates[notificationId] = {};
    }

    actionedStates[notificationId][userId] = action;
    this.saveActionedStates(actionedStates);
  }

  /**
   * Check if a notification is actioned by a specific user
   */
  static isActioned(notificationId: string, userId: number): string | null {
    const actionedStates = this.loadActionedStates();
    return actionedStates[notificationId]?.[userId] || null;
  }

  /**
   * Get all events from all granular files (for searching)
   */
  static getAllEvents(): NotificationEvent[] {
    this.ensureEventsDirectory();

    const allEvents: NotificationEvent[] = [];

    // Get all years
    const eventsDir = this.EVENTS_DIR;
    if (!fs.existsSync(eventsDir)) return allEvents;

    const years = fs.readdirSync(eventsDir).filter(item =>
      fs.statSync(path.join(eventsDir, item)).isDirectory()
    );

    for (const year of years) {
      const yearDir = path.join(eventsDir, year);
      const months = fs.readdirSync(yearDir).filter(item =>
        fs.statSync(path.join(yearDir, item)).isDirectory()
      );

      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const days = fs.readdirSync(monthDir).filter(item =>
          fs.statSync(path.join(monthDir, item)).isDirectory()
        );

        for (const day of days) {
          const dayDir = path.join(monthDir, day);
          const eventFiles = fs.readdirSync(dayDir).filter(file => file.endsWith('.json'));

          for (const eventFile of eventFiles) {
            const eventPath = path.join(dayDir, eventFile);
            try {
              const events = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
              if (Array.isArray(events)) {
                allEvents.push(...events);
              }
            } catch (error) {
              console.error(`Error reading event file ${eventPath}:`, error);
            }
          }
        }
      }
    }

    return allEvents;
  }

  /**
   * Get statistics about the notification storage
   */
  static getStorageStats(): {
    totalPartitions: number;
    totalEvents: number;
    partitions: Array<{ filename: string; eventCount: number; sizeKB: number }>;
  } {
    this.ensureEventsDirectory();

    const partitionFiles = fs.readdirSync(this.EVENTS_DIR)
      .filter(file => file.endsWith('.json'))
      .sort();

    let totalEvents = 0;
    const partitions = partitionFiles.map(filename => {
      const filePath = path.join(this.EVENTS_DIR, filename);
      const events = this.loadPartition(filePath);
      const stats = fs.statSync(filePath);

      totalEvents += events.length;

      return {
        filename,
        eventCount: events.length,
        sizeKB: Math.round(stats.size / 1024)
      };
    });

    return {
      totalPartitions: partitionFiles.length,
      totalEvents,
      partitions
    };
  }
}
