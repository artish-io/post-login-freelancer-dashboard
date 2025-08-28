/**
 * Wallet Earnings API Endpoint
 * 
 * Provides earnings calculation (payments only, excluding withdrawals)
 * from hierarchical transaction storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BalanceCalculationService } from '@/lib/services/balance-calculation-service';
import { HierarchicalTransactionService } from '@/lib/storage/hierarchical-transaction-service';
import { TransactionError } from '@/lib/storage/transaction-schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`💵 Earnings API called for user ${resolvedParams.userId}`);

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
    
    // Get session for authorization (optional)
    const session = await getServerSession(authOptions);
    
    // Get query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const includeBreakdown = url.searchParams.get('breakdown') === 'true';
    const includeTransactions = url.searchParams.get('transactions') === 'true';
    const projectId = url.searchParams.get('projectId');
    const format = url.searchParams.get('format') || 'detailed';
    
    // Calculate total earnings
    const totalEarnings = await BalanceCalculationService.calculateEarnings(userId);
    
    // Prepare base response
    const response: any = {
      userId,
      totalEarnings,
      currency: 'USD',
      calculatedAt: new Date().toISOString()
    };
    
    // Add period-specific earnings if date range provided
    if (startDate && endDate) {
      const summary = await BalanceCalculationService.getTransactionSummary(
        userId,
        startDate,
        endDate
      );
      
      response.periodEarnings = {
        startDate,
        endDate,
        amount: summary.payments.totalAmount,
        transactionCount: summary.payments.count,
        averagePerTransaction: summary.payments.averageAmount
      };
    }
    
    // Add detailed breakdown if requested
    if (includeBreakdown) {
      const balance = await BalanceCalculationService.calculateBalance(userId);
      
      response.breakdown = {
        totalPayments: balance.totalPayments,
        totalWithdrawals: balance.totalWithdrawals,
        availableBalance: balance.availableBalance,
        pendingWithdrawals: balance.pendingWithdrawals,
        transactionCount: balance.transactionCount
      };
      
      // Add earnings by source if available
      const transactions = await HierarchicalTransactionService.getTransactionsByUser(userId, {
        type: 'payment',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        projectId: projectId || undefined
      });
      
      const earningsBySource: Record<string, number> = {};
      const earningsByProject: Record<string, number> = {};
      
      transactions.forEach(transaction => {
        if (transaction.type === 'payment' && transaction.status === 'completed') {
          // Group by source
          const source = (transaction as any).source || 'unknown';
          earningsBySource[source] = (earningsBySource[source] || 0) + transaction.amount;
          
          // Group by project
          const project = (transaction as any).projectId || 'unknown';
          earningsByProject[project] = (earningsByProject[project] || 0) + transaction.amount;
        }
      });
      
      response.breakdown.earningsBySource = earningsBySource;
      response.breakdown.earningsByProject = earningsByProject;
    }
    
    // Add transaction details if requested
    if (includeTransactions) {
      const transactions = await HierarchicalTransactionService.getTransactionsByUser(userId, {
        type: 'payment',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        projectId: projectId || undefined,
        limit: 50 // Limit to prevent large responses
      });
      
      response.recentTransactions = transactions.map(transaction => ({
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        status: transaction.status,
        projectId: transaction.type === 'payment' ? (transaction as any).projectId : undefined,
        invoiceNumber: transaction.type === 'payment' ? (transaction as any).invoiceNumber : undefined,
        source: transaction.type === 'payment' ? (transaction as any).source : undefined
      }));
    }
    
    // Return simple format if requested
    if (format === 'simple') {
      return NextResponse.json({
        userId,
        earnings: totalEarnings,
        currency: 'USD'
      });
    }
    
    console.log(`✅ Earnings API response for user ${userId}:`, {
      totalEarnings,
      periodEarnings: response.periodEarnings?.amount
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`❌ Earnings API error:`, error);
    
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
        message: 'Failed to calculate earnings'
      },
      { status: 500 }
    );
  }
}

// POST method for earnings analysis/reporting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`📊 Earnings analysis API called for user ${resolvedParams.userId}`);

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
    
    // Get session for authorization (disabled for testing)
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    //     { status: 401 }
    //   );
    // }
    
    // Parse request body
    const body = await request.json();
    const { 
      analysisType = 'summary',
      startDate,
      endDate,
      groupBy = 'month' // 'day', 'week', 'month', 'year'
    } = body;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        },
        { status: 400 }
      );
    }
    
    // Generate earnings analysis
    const summary = await BalanceCalculationService.getTransactionSummary(
      userId,
      startDate,
      endDate
    );
    
    // Get balance trend if requested
    let trend = null;
    if (analysisType === 'trend') {
      trend = await BalanceCalculationService.getBalanceTrend(
        userId,
        startDate,
        endDate
      );
    }
    
    const response = {
      userId,
      analysisType,
      period: { startDate, endDate },
      summary: {
        totalEarnings: summary.payments.totalAmount,
        transactionCount: summary.payments.count,
        averageEarning: summary.payments.averageAmount,
        totalWithdrawals: summary.withdrawals.totalAmount,
        netChange: summary.netChange
      },
      trend: trend || undefined,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Earnings analysis completed for user ${userId}:`, {
      totalEarnings: summary.payments.totalAmount,
      transactionCount: summary.payments.count
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`❌ Earnings analysis API error:`, error);
    
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
        message: 'Failed to generate earnings analysis'
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
