import { NextResponse } from 'next/server';
import { NotificationStorage } from '../../../../lib/notifications/notification-storage';

/**
 * Migration API Endpoint
 * 
 * This endpoint migrates notifications from the legacy single file
 * (data/notifications/notifications-log.json) to the new partitioned
 * storage system for better scalability.
 * 
 * Usage: POST /api/notifications/migrate
 */
export async function POST() {
  try {
    console.log('🔄 Starting notification migration...');
    
    // Perform the migration
    NotificationStorage.migrateLegacyFile();
    
    // Get storage statistics after migration
    const stats = NotificationStorage.getStorageStats();
    
    console.log('✅ Migration completed successfully');
    console.log('📊 Storage stats:', stats);
    
    return NextResponse.json({
      success: true,
      message: 'Notifications migrated successfully to partitioned storage',
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get migration status and storage statistics
 * 
 * Usage: GET /api/notifications/migrate
 */
export async function GET() {
  try {
    const stats = NotificationStorage.getStorageStats();
    
    return NextResponse.json({
      success: true,
      message: 'Storage statistics retrieved',
      stats: stats,
      recommendations: {
        shouldMigrate: stats.totalPartitions === 0,
        storageHealth: stats.totalPartitions > 0 ? 'healthy' : 'needs_migration'
      }
    });
    
  } catch (error) {
    console.error('Error getting storage stats:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get storage statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
