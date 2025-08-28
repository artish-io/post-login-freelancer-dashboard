import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  canEditHourlyRate, 
  updateHourlyRate, 
  getCurrentHourlyRate 
} from '@/lib/user-profile/hourly-rate-service';

/**
 * Hourly Rate Management API
 * 
 * GET: Check if user can edit rate and get current rate
 * POST: Update hourly rate with 60-day cooldown validation
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    
    // Get current rate and edit eligibility
    const [currentRate, editEligibility] = await Promise.all([
      getCurrentHourlyRate(userId),
      canEditHourlyRate(userId)
    ]);

    return NextResponse.json({
      success: true,
      currentRate,
      canEdit: editEligibility.canEdit,
      daysRemaining: editEligibility.daysRemaining,
      lastEditDate: editEligibility.lastEditDate,
      message: editEligibility.message,
      cooldownDays: 60
    });

  } catch (error) {
    console.error('❌ Error checking hourly rate status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check hourly rate status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newRate } = await request.json();
    
    if (!newRate || typeof newRate !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid rate format'
      }, { status: 400 });
    }

    const userId = Number(session.user.id);
    
    // Get current rate for comparison
    const currentRate = await getCurrentHourlyRate(userId);
    
    // Attempt to update the rate
    const updateResult = await updateHourlyRate(userId, newRate, currentRate || undefined);
    
    if (!updateResult.allowed) {
      return NextResponse.json({
        success: false,
        error: updateResult.reason || undefined,
        daysRemaining: updateResult.daysRemaining,
        currentRate,
        attemptedRate: newRate
      }, { status: 429 }); // Too Many Requests
    }

    return NextResponse.json({
      success: true,
      message: 'Hourly rate updated successfully',
      previousRate: updateResult.previousRate,
      newRate: updateResult.newRate,
      updatedAt: updateResult.attemptedAt,
      nextEditAvailable: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days from now
    });

  } catch (error) {
    console.error('❌ Error updating hourly rate:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update hourly rate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
