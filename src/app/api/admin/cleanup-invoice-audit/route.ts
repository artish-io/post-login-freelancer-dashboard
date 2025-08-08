/**
 * Admin API endpoint for cleaning up invoice audit spam
 * 
 * This endpoint should only be used by administrators to clean up
 * the preview invoice spam in the audit logs.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cleanupInvoiceAuditSpam, getAuditLogStats } from '@/lib/cleanup/invoice-audit-cleanup';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here when role system is implemented
    // For now, any authenticated user can run cleanup (remove this in production)
    
    const { action } = await request.json();

    if (action === 'cleanup') {
      const result = await cleanupInvoiceAuditSpam();
      
      return NextResponse.json({
        success: true,
        message: 'Invoice audit cleanup completed successfully',
        result
      });
    } else if (action === 'stats') {
      const stats = await getAuditLogStats();
      
      return NextResponse.json({
        success: true,
        stats
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cleanup" or "stats"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in invoice audit cleanup:', error);
    return NextResponse.json(
      { 
        error: 'Cleanup failed',
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

    // Get current stats without cleanup
    const stats = await getAuditLogStats();
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Current audit log statistics'
    });

  } catch (error) {
    console.error('Error getting audit stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
