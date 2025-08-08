
import { NextRequest, NextResponse } from "next/server";
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { addWithdrawal, getWithdrawalById } from '@/app/api/payments/repos/withdrawals-repo';
import { appendTransaction } from '@/app/api/payments/repos/transactions-repo';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { ok, err, RefreshHints, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logWithdrawalTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';
import { requireSession, getUserType } from '@/lib/auth/session-guard';
import { parseBody, zWithdrawBody } from '@/lib/validation/z';


async function handleWithdrawRequest(req: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { session, userId: actorId } = await requireSession(req);

    // 🔒 Parse and validate request body
    const body = await parseBody(req, zWithdrawBody) as { amount: number; currency: string; withdrawalId?: string };
    const { amount, currency, withdrawalId } = body;

    // Get user type from session - only wallet owner can withdraw
    const userType = getUserType(session);
    if (!userType) {
      throw Object.assign(new Error('Invalid user type'), {
        code: ErrorCodes.FORBIDDEN_USER_TYPE,
        status: 403
      });
    }

    const finalCurrency = currency || 'USD';

    // 🔒 Idempotency check: if withdrawalId provided, check for existing withdrawal
    if (withdrawalId) {
      const existingWithdrawal = await getWithdrawalById(withdrawalId);
      if (existingWithdrawal) {
        // Get current wallet state for response
        const wallet = await getWallet(actorId, userType, finalCurrency);

        return NextResponse.json(
          ok({
            entities: {
              withdrawal: existingWithdrawal,
              wallet: wallet ? {
                availableBalance: wallet.availableBalance,
                pendingWithdrawals: wallet.pendingWithdrawals,
                totalWithdrawn: wallet.totalWithdrawn,
                currency: wallet.currency,
              } : null,
            },
            refreshHints: [RefreshHints.WALLET_SUMMARY, RefreshHints.TRANSACTIONS_LIST],
            notificationsQueued: false,
            message: 'Idempotent success (withdrawal already exists)',
          })
        );
      }
    }

    // Load wallet using repo - only for the session user
    let wallet = await getWallet(actorId, userType, finalCurrency);
    if (!wallet) {
      // Create new wallet if it doesn't exist
      wallet = {
        userId: actorId,
        userType: userType,
        currency: finalCurrency,
        availableBalance: 0,
        pendingWithdrawals: 0,
        lifetimeEarnings: 0,
        totalWithdrawn: 0,
        holds: 0,
        updatedAt: new Date().toISOString(),
      };
      await upsertWallet(wallet);
    }

    // Use service for business logic
    const holdResult = PaymentsService.holdWithdrawal(wallet, amount);
    if (!holdResult.ok) {
      throw Object.assign(new Error((holdResult as any).reason || 'Insufficient funds'), {
        code: ErrorCodes.INSUFFICIENT_FUNDS,
        status: 400
      });
    }

    // Extract the updated wallet from the successful result
    const updatedWallet = holdResult.data!;

    // Generate withdrawal ID if not provided
    const finalWithdrawalId = withdrawalId || `WD-${actorId}-${Date.now()}`;
    const now = new Date().toISOString();

    // Create withdrawal record
    const withdrawal = {
      withdrawalId: finalWithdrawalId,
      userId: actorId,
      userType: userType,
      amount,
      currency: finalCurrency,
      status: 'pending' as const,
      requestedAt: now,
    };

    // Save withdrawal
    await addWithdrawal(withdrawal);

    // Update wallet with held funds
    await upsertWallet(updatedWallet);

    // Create transaction record
    const transaction = {
      transactionId: `TXN-${finalWithdrawalId}`,
      type: 'withdrawal' as const,
      integration: 'mock' as const,
      status: 'processing' as const,
      amount,
      currency: finalCurrency,
      timestamp: now,
      withdrawalId: finalWithdrawalId,
      freelancerId: userType === 'freelancer' ? actorId : undefined,
      commissionerId: userType === 'commissioner' ? actorId : undefined,
      metadata: {
        withdrawalId: finalWithdrawalId,
        userType: userType,
      },
    };

    await appendTransaction(transaction);

    // Log transitions for observability
    logWithdrawalTransition(
      finalWithdrawalId,
      'requested',
      'pending',
      actorId,
      Subsystems.PAYMENTS_WITHDRAW,
      {
        amount,
        currency: finalCurrency,
        method: 'pending_review',
      }
    );

    logWalletChange(
      actorId,
      userType,
      'hold',
      amount,
      finalCurrency,
      actorId,
      Subsystems.WALLETS_UPDATE,
      {
        reason: 'withdrawal_request',
        withdrawalId: finalWithdrawalId,
        previousBalance: wallet.availableBalance,
        newBalance: updatedWallet.availableBalance,
      }
    );

    return NextResponse.json(
      ok({
        entities: {
          withdrawal: {
            withdrawalId: finalWithdrawalId,
            amount,
            currency: finalCurrency,
            status: 'pending',
            requestedAt: now,
          },
          wallet: {
            availableBalance: updatedWallet.availableBalance,
            pendingWithdrawals: updatedWallet.pendingWithdrawals,
            totalWithdrawn: updatedWallet.totalWithdrawn,
            currency: updatedWallet.currency,
          },
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
          },
        },
        refreshHints: [
          RefreshHints.WALLET_SUMMARY,
          RefreshHints.TRANSACTIONS_LIST,
          RefreshHints.DASHBOARD,
        ],
        notificationsQueued: false, // Withdrawals don't generate notifications
        message: 'Withdrawal request created successfully',
      })
    );
  } catch (error) {
    console.error('[WITHDRAWAL_REQUEST_ERROR]', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleWithdrawRequest);