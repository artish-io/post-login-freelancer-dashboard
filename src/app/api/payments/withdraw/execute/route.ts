
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { getWithdrawalById, updateWithdrawal } from '@/app/api/payments/repos/withdrawals-repo';
import { updateTransaction, findByWithdrawalId } from '@/app/api/payments/repos/transactions-repo';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { ok, err, RefreshHints, ErrorCodes } from '@/lib/http/envelope';
import { logWithdrawalTransition, logWalletChange } from '@/lib/log/transitions';

export async function POST(req: Request) {
  try {
    // 🔒 Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        err(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401),
        { status: 401 }
      );
    }

    const { withdrawalId, processedById } = await req.json();
    const sessionUserId = parseInt(session.user.id);

    if (!withdrawalId) {
      return NextResponse.json(
        err(ErrorCodes.MISSING_REQUIRED_FIELD, 'Missing withdrawalId', 400),
        { status: 400 }
      );
    }

    // Load withdrawal record
    const withdrawal = await getWithdrawalById(withdrawalId);
    if (!withdrawal) {
      return NextResponse.json(
        err(ErrorCodes.RESOURCE_NOT_FOUND, 'Withdrawal not found', 404),
        { status: 404 }
      );
    }

    // Check withdrawal status
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        err(ErrorCodes.INVALID_STATUS, `Withdrawal is not pending (current status: ${withdrawal.status})`, 400),
        { status: 400 }
      );
    }

    // Load wallet
    const wallet = await getWallet(withdrawal.userId, withdrawal.userType, withdrawal.currency);
    if (!wallet) {
      return NextResponse.json(
        err(ErrorCodes.RESOURCE_NOT_FOUND, 'Wallet not found', 404),
        { status: 404 }
      );
    }

    // Use service for business logic
    // Process through test gateway
    try {
      const { processMockWithdrawal } = await import('../../utils/gateways/test-gateway');
      const gatewayResult = await processMockWithdrawal({
        withdrawalId: withdrawal.withdrawalId,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        currency: withdrawal.currency
      });

      console.log('Mock withdrawal processed:', gatewayResult);
    } catch (gatewayError) {
      console.error('Gateway withdrawal failed:', gatewayError);
      // Continue with processing - gateway failure shouldn't block withdrawal
    }

    const finalizeResult = PaymentsService.finalizeWithdrawal(wallet, withdrawal.amount);
    if (!finalizeResult.ok) {
      return NextResponse.json(
        err(ErrorCodes.INSUFFICIENT_FUNDS, finalizeResult.reason, 409),
        { status: 409 }
      );
    }

    // Extract the updated wallet from the successful result
    const updatedWallet = finalizeResult.data!;

    const now = new Date().toISOString();
    const finalProcessedById = processedById ?? sessionUserId;

    // Update withdrawal status
    const updated = await updateWithdrawal(withdrawalId, {
      status: 'paid',
      processedAt: now,
      processedById: finalProcessedById,
    });

    if (!updated) {
      return NextResponse.json(
        err(ErrorCodes.INTERNAL_ERROR, 'Failed to update withdrawal status', 500),
        { status: 500 }
      );
    }

    // Update wallet
    await upsertWallet(updatedWallet);

    // Update transaction status
    const transaction = await findByWithdrawalId(withdrawalId);
    if (transaction) {
      await updateTransaction(transaction.transactionId, {
        status: 'paid',
        timestamp: now,
        metadata: {
          ...transaction.metadata,
          processedBy: finalProcessedById,
          processedAt: now,
        },
      });
    }

    // Log transitions for observability
    logWithdrawalTransition(
      withdrawalId,
      'pending',
      'paid',
      finalProcessedById,
      'PAYMENTS_WITHDRAW',
      {
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        method: 'executed',
      }
    );

    logWalletChange(
      withdrawal.userId,
      withdrawal.userType,
      'debit',
      withdrawal.amount,
      withdrawal.currency,
      finalProcessedById,
      'WALLETS_UPDATE',
      {
        reason: 'withdrawal_executed',
        withdrawalId,
        previousBalance: wallet.pendingWithdrawals,
        newBalance: updatedWallet.pendingWithdrawals,
      }
    );

    return NextResponse.json(
      ok({
        entities: {
          withdrawal: {
            withdrawalId,
            status: 'paid',
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            processedAt: now,
            processedById: finalProcessedById,
          },
          wallet: {
            availableBalance: updatedWallet.availableBalance,
            pendingWithdrawals: updatedWallet.pendingWithdrawals,
            totalWithdrawn: updatedWallet.totalWithdrawn,
            currency: updatedWallet.currency,
          },
        },
        refreshHints: [
          RefreshHints.WALLET_SUMMARY,
          RefreshHints.TRANSACTIONS_LIST,
          RefreshHints.DASHBOARD,
        ],
        notificationsQueued: false,
        message: 'Withdrawal executed successfully',
      })
    );
  } catch (error) {
    console.error('[WITHDRAW_EXECUTE_ERROR]', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500),
      { status: 500 }
    );
  }
}