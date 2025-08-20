/**
 * Wallet Balance API Endpoint
 * 
 * Provides real-time balance calculation from hierarchical transaction storage.
 * Replaces static wallet balance with dynamic calculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BalanceCalculationService } from '@/lib/services/balance-calculation-service';
import { TransactionError } from '@/lib/storage/transaction-schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`🔍 Balance API called for user ${resolvedParams.userId}`);

    // Parse and validate user ID
    const userId = parseInt(resolvedParams.userId);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID',
          message: 'User ID must be a positive integer'
        },
        { status: 400 }
      );
    }
    
    // Get session for authorization - REQUIRED for security
    const session = await getServerSession(authOptions);

    // Authorization check - users can only access their own balance
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user can access this balance - only own balance or admin
    if (session.user.id !== userId.toString() && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // Get query parameters for additional options
    const url = new URL(request.url);
    const includeBreakdown = url.searchParams.get('breakdown') === 'true';
    const includePending = url.searchParams.get('pending') === 'true';
    const format = url.searchParams.get('format') || 'detailed';
    
    // Calculate balance
    const balance = await BalanceCalculationService.calculateBalance(userId);
    
    // Prepare response based on format
    if (format === 'simple') {
      // Simple format - just the balance amount
      return NextResponse.json({
        userId,
        balance: balance.availableBalance,
        currency: 'USD',
        lastCalculated: balance.lastCalculated
      });
    }
    
    // Detailed format (default)
    const response: any = {
      userId,
      availableBalance: balance.availableBalance,
      lifetimeEarnings: balance.lifetimeEarnings,
      currency: 'USD',
      lastCalculated: balance.lastCalculated,
      transactionCount: balance.transactionCount
    };
    
    // Add breakdown if requested
    if (includeBreakdown) {
      response.breakdown = {
        totalPayments: balance.totalPayments,
        totalWithdrawals: balance.totalWithdrawals,
        netBalance: balance.availableBalance
      };
    }
    
    // Add pending information if requested
    if (includePending) {
      response.pendingWithdrawals = balance.pendingWithdrawals;
      response.availableForWithdrawal = balance.availableBalance - balance.pendingWithdrawals;
    }
    
    // Add last transaction date if available
    if (balance.lastTransactionDate) {
      response.lastTransactionDate = balance.lastTransactionDate;
    }
    
    console.log(`✅ Balance API response for user ${userId}:`, {
      balance: balance.availableBalance,
      transactionCount: balance.transactionCount
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`❌ Balance API error for user ${params.userId}:`, error);
    
    if (error instanceof TransactionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          transactionId: error.transactionId,
          userId: error.userId
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate balance'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`🔄 Balance refresh API called for user ${resolvedParams.userId}`);

    // Parse and validate user ID
    const userId = parseInt(resolvedParams.userId);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }
    
    // Get session for authorization - REQUIRED for security
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user can refresh this balance - only own balance or admin
    if (session.user.id !== userId.toString() && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // Parse request body for refresh options
    const body = await request.json().catch(() => ({}));
    const { forceRecalculation = false } = body;
    
    // Refresh balance calculation
    const balance = await BalanceCalculationService.refreshBalance(userId);
    
    const response = {
      userId,
      availableBalance: balance.availableBalance,
      lifetimeEarnings: balance.lifetimeEarnings,
      totalPayments: balance.totalPayments,
      totalWithdrawals: balance.totalWithdrawals,
      pendingWithdrawals: balance.pendingWithdrawals,
      currency: 'USD',
      lastCalculated: balance.lastCalculated,
      transactionCount: balance.transactionCount,
      refreshed: true,
      forceRecalculation
    };
    
    console.log(`✅ Balance refreshed for user ${userId}:`, {
      balance: balance.availableBalance,
      transactionCount: balance.transactionCount
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`❌ Balance refresh API error for user ${params.userId}:`, error);
    
    if (error instanceof TransactionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          transactionId: error.transactionId,
          userId: error.userId
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh balance'
      },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
