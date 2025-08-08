
import { NextRequest, NextResponse } from "next/server";
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { requireSession, getUserType } from '@/lib/auth/session-guard';
import { parseQuery, zWalletQuery } from '@/lib/validation/z';

async function handleGetWallet(req: NextRequest) {
  try {
    // 🔒 Auth - get session and validate
    const { session, userId: actorId } = await requireSession(req);

    // Parse query parameters
    const url = new URL(req.url);
    const query = parseQuery(url, zWalletQuery) as { currency?: string };
    const { currency } = query;

    // Get user type from session
    const userType = getUserType(session);
    if (!userType) {
      throw Object.assign(new Error('Invalid user type'), {
        code: ErrorCodes.FORBIDDEN_USER_TYPE,
        status: 403
      });
    }

    // 🔒 Only return wallet for the session user (no userId in query allowed)
    const walletCurrency = currency || 'USD';
    let wallet = await getWallet(actorId, userType, walletCurrency);

    if (!wallet) {
      // Create default wallet if it doesn't exist
      wallet = {
        userId: actorId,
        userType,
        currency: walletCurrency,
        availableBalance: 0,
        pendingWithdrawals: 0,
        lifetimeEarnings: 0,
        totalWithdrawn: 0,
        holds: 0,
        updatedAt: new Date().toISOString(),
      };
      await upsertWallet(wallet);
    }

    return NextResponse.json(
      ok({
        entities: {
          wallet: {
            userId: wallet.userId,
            userType: wallet.userType,
            currency: wallet.currency,
            availableBalance: wallet.availableBalance,
            pendingWithdrawals: wallet.pendingWithdrawals,
            lifetimeEarnings: wallet.lifetimeEarnings,
            totalWithdrawn: wallet.totalWithdrawn,
            holds: wallet.holds,
            updatedAt: wallet.updatedAt,
          },
        },
        message: 'Wallet retrieved successfully',
      })
    );
  } catch (error) {
    console.error('[WALLET_GET_ERROR]', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Failed to retrieve wallet', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const GET = withErrorHandling(handleGetWallet);