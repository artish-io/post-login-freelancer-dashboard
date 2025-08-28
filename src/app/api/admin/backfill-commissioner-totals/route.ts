/**
 * Admin API endpoint for backfilling commissioner cumulative totals
 * 
 * This endpoint recalculates and persists accurate cumulative totals for all commissioners
 * based on executed payments (paid invoices).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  backfillAllCommissionerTotals, 
  recalculateCommissionerTotals,
  getAllCommissionerTotals 
} from '@/lib/commissioner-totals-service';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here when role system is implemented
    // For now, any authenticated user can run backfill (remove this in production)
    
    const { action, commissionerId } = await request.json();

    if (action === 'backfill-all') {
      console.log('🔄 Starting commissioner totals backfill...');
      const result = await backfillAllCommissionerTotals();
      
      return NextResponse.json({
        success: true,
        message: `Backfill completed. Updated ${result.updated} commissioners.`,
        result: {
          updated: result.updated,
          errors: result.errors
        }
      });
    } else if (action === 'recalculate-single' && commissionerId) {
      console.log(`🔄 Recalculating totals for commissioner ${commissionerId}...`);
      const totals = await recalculateCommissionerTotals(parseInt(commissionerId));
      
      return NextResponse.json({
        success: true,
        message: `Recalculated totals for commissioner ${commissionerId}`,
        totals
      });
    } else if (action === 'get-all') {
      const allTotals = await getAllCommissionerTotals();
      
      return NextResponse.json({
        success: true,
        totals: allTotals
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "backfill-all", "recalculate-single", or "get-all"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in commissioner totals backfill:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process commissioner totals request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const commissionerId = url.searchParams.get('commissionerId');

    if (commissionerId) {
      // Get totals for specific commissioner
      const { getCommissionerTotals } = await import('@/lib/commissioner-totals-service');
      const totals = await getCommissionerTotals(parseInt(commissionerId));
      
      return NextResponse.json({
        success: true,
        totals
      });
    } else {
      // Get all totals
      const allTotals = await getAllCommissionerTotals();
      
      return NextResponse.json({
        success: true,
        totals: allTotals
      });
    }
  } catch (error) {
    console.error('Error getting commissioner totals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get commissioner totals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
