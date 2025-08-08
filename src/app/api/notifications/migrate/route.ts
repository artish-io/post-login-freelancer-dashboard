import { NextResponse } from 'next/server';
import { NotificationStorage } from '../../../../lib/notifications/notification-storage';

/**
 * Migration API Endpoint
 *
 * @deprecated Legacy migration is no longer needed as all legacy files have been removed.
 * The system now uses the new granular event storage exclusively.
 *
 * Usage: POST /api/notifications/migrate
 */
export async function POST() {
  try {
    console.log('⚠️  Migration endpoint called but no longer needed');

    // Get storage statistics
    const stats = NotificationStorage.getStorageStats();

    console.log('✅ System is already using granular storage');
    console.log('📊 Storage stats:', stats);

    return NextResponse.json({
      success: true,
      message: 'Migration not needed - system already using granular storage',
      stats: stats,
      note: 'Legacy files have been removed. System is fully migrated.'
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
