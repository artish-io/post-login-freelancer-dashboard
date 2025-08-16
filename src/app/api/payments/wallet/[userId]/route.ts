import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session-guard';
import { getWallet } from '../../repos/wallets-repo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: sessionUserId } = await requireSession(request);
    const { userId } = await params;
    const requestedUserId = parseInt(userId);
    
    // Users can only access their own wallet data
    if (sessionUserId !== requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Determine user type based on session or request
    const url = new URL(request.url);
    const userType = url.searchParams.get('userType') || 'freelancer';
    const currency = url.searchParams.get('currency') || 'USD';
    
    if (userType !== 'freelancer' && userType !== 'commissioner') {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
    }
    
    const wallet = await getWallet(requestedUserId, userType as 'freelancer' | 'commissioner', currency);
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      wallet: {
        userId: wallet.userId,
        userType: wallet.userType,
        currency: wallet.currency,
        availableBalance: wallet.availableBalance,
        pendingWithdrawals: wallet.pendingWithdrawals,
        lifetimeEarnings: wallet.lifetimeEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        holds: wallet.holds,
        updatedAt: wallet.updatedAt
      }
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}
