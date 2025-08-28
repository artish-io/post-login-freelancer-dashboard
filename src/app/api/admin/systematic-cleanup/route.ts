/**
 * Admin API endpoint for systematic data cleanup
 *
 * Removes ALL data entries (gigs, projects, tasks, notifications, invoices,
 * payments, messages, transactions) created before August 25, 2025
 * and cleans up indexing residue (orphaned ids, empty index entries, broken references).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { performSystematicCleanup } from '@/lib/cleanup/systematic-data-cleanup';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here when role system is implemented
    // For now, any authenticated user can run cleanup (remove this in production)
    
    const { action, dryRun } = await request.json();

    if (action === 'cleanup') {
      console.log('🧹 Starting systematic data cleanup...');
      
      if (dryRun) {
        // TODO: Implement dry run mode that shows what would be deleted
        return NextResponse.json({
          success: true,
          message: 'Dry run mode not yet implemented',
          dryRun: true
        });
      }

      const result = await performSystematicCleanup();
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed. Found ${result.totalItemsFound} items, removed ${result.totalItemsRemoved}.`,
        result
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cleanup"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in systematic cleanup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform systematic cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return cleanup status/info
    return NextResponse.json({
      success: true,
      info: {
        cutoffDate: '2025-08-25',
        description: 'Removes redundant data created before August 25, 2025',
        categories: [
          'Gigs',
          'Gig Applications', 
          'Notifications',
          'Transactions (preserved for audit)'
        ]
      }
    });
  } catch (error) {
    console.error('Error getting cleanup info:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup info' },
      { status: 500 }
    );
  }
}
