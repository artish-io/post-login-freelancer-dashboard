#!/usr/bin/env tsx

/**
 * Migration Script: Legacy Notifications to Hierarchical Storage
 * 
 * Migrates notifications from the legacy notifications-log.json file
 * to the hierarchical storage system used by notifications-v2 API.
 * 
 * This fixes the issue where notifications exist in the legacy file
 * but aren't visible in the frontend because the API only reads from
 * the hierarchical system.
 * 
 * Usage:
 *   npm run migrate:notifications
 *   npm run migrate:notifications -- --dry-run
 */

import { promises as fs } from 'fs';
import path from 'path';
import { NotificationStorage } from '../src/lib/notifications/notification-storage';

interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
}

interface LegacyNotification {
  id: string;
  timestamp: string;
  type: string;
  notificationType: number;
  actorId: number;
  targetId: number;
  entityType: number;
  entityId: string;
  metadata: any;
  context: any;
}

async function migrateLegacyNotifications(options: MigrationOptions = { dryRun: false, verbose: false }) {
  console.log('🔄 Starting legacy notifications migration...');
  
  const legacyFilePath = path.join(process.cwd(), 'data/notifications/notifications-log.json');
  
  try {
    // Check if legacy file exists
    const legacyFileExists = await fs.access(legacyFilePath).then(() => true).catch(() => false);
    if (!legacyFileExists) {
      console.log('✅ No legacy notifications file found. Migration not needed.');
      return { success: true, migrated: 0, skipped: 0 };
    }

    // Read legacy notifications
    const legacyData = await fs.readFile(legacyFilePath, 'utf-8');
    const legacyNotifications: LegacyNotification[] = JSON.parse(legacyData);
    
    console.log(`📊 Found ${legacyNotifications.length} notifications in legacy file`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const notification of legacyNotifications) {
      try {
        // Check if notification already exists in hierarchical storage
        const existingEvents = NotificationStorage.getRecentEvents(1000);
        const exists = existingEvents.some(event => event.id === notification.id);
        
        if (exists) {
          skipped++;
          if (options.verbose) {
            console.log(`⏭️  Skipping ${notification.id} (already exists)`);
          }
          continue;
        }
        
        // Convert legacy notification to hierarchical format
        const hierarchicalNotification = {
          id: notification.id,
          timestamp: notification.timestamp,
          type: notification.type,
          notificationType: notification.notificationType,
          actorId: notification.actorId,
          targetId: notification.targetId,
          entityType: notification.entityType,
          entityId: notification.entityId,
          metadata: notification.metadata,
          context: notification.context
        };
        
        if (!options.dryRun) {
          // Add to hierarchical storage
          NotificationStorage.addEvent(hierarchicalNotification);
        }
        
        migrated++;
        
        if (options.verbose || options.dryRun) {
          console.log(`${options.dryRun ? '🔍' : '✅'} ${options.dryRun ? 'Would migrate' : 'Migrated'} ${notification.type} notification ${notification.id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating notification ${notification.id}:`, error);
      }
    }
    
    if (!options.dryRun && migrated > 0) {
      // Create backup of legacy file
      const backupPath = `${legacyFilePath}.backup.${Date.now()}`;
      await fs.copyFile(legacyFilePath, backupPath);
      console.log(`💾 Created backup at ${backupPath}`);
      
      // Clear the legacy file (but don't delete it completely)
      await fs.writeFile(legacyFilePath, '[]');
      console.log(`🧹 Cleared legacy notifications file`);
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${legacyNotifications.length}`);
    
    if (options.dryRun) {
      console.log('\n🔍 This was a dry run. No changes were made.');
      console.log('   Run without --dry-run to perform the actual migration.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
    return { success: true, migrated, skipped };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  migrateLegacyNotifications({ dryRun, verbose })
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        console.error('Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { migrateLegacyNotifications };
