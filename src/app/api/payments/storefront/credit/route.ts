import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { appendTransaction, type TransactionRecord, findByMetadataKey } from '@/app/api/payments/repos/transactions-repo';
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { ok, err, RefreshHints, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logWalletChange, Subsystems } from '@/lib/log/transitions';
import { requireSession, assert } from '@/lib/auth/session-guard';
import { parseBody, zStorefrontCreditBody } from '@/lib/validation/z';
import type { Wallet, Currency } from '@/app/api/payments/repos/wallets-repo';

/**
 * TODO: Replace with real orders/products repos when available
 * This is a mock function to resolve the freelancer owner from order/product data
 */
async function resolveOrderOwner(orderId: string, _productId: string | number): Promise<number | null> {
  // Mock implementation - in real system this would:
  // 1. Look up the order by orderId
  // 2. Get the product by productId from the order
  // 3. Return the freelancer who owns that product

  // For now, return a mock freelancer ID (this should be replaced with real logic)
  console.warn('[STOREFRONT_CREDIT] Using mock resolveOrderOwner - replace with real implementation');

  // Mock: extract freelancer ID from orderId pattern or return default
  const match = orderId.match(/freelancer-(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  // Default mock freelancer for testing
  return 1;
}

async function handleStorefrontCredit(req: NextRequest) {
  try {
    // 🔒 Auth - get session and validate (system/admin only for storefront credits)
    const { userId: actorId } = await requireSession(req);

    // 🔒 Parse and validate request body
    const body = await parseBody(req, zStorefrontCreditBody) as {
      orderId: string;
      productId: string | number;
      amount: number;
      currency: string;
    };
    const { orderId, productId, amount, currency } = body;

    // Accept any ISO 4217 currency string; default to 'USD' if not provided
    const cur: Currency = (typeof currency === 'string' && currency.trim().length > 0)
      ? (currency as string)
      : 'USD';

    // 🔒 CRITICAL: Resolve freelancer from order/product data, NOT from client request
    // TODO: replace with real orders/products repos when available
    const ownerFreelancerId = await resolveOrderOwner(orderId, productId);
    assert(ownerFreelancerId, ErrorCodes.INVALID_ORDER_MAPPING, 400, 'Unable to resolve product owner');

    // 🔒 Idempotency check: look for existing transaction with this orderId
    const existingTransactions = await findByMetadataKey('orderId', String(orderId));
    if (existingTransactions.length > 0) {
      const existingTx = existingTransactions[0];

      // Get current wallet state for response
      const wallet = await getWallet(ownerFreelancerId!, 'freelancer', cur);

      return NextResponse.json(
        ok({
          entities: {
            transaction: existingTx,
            wallet: wallet ? {
              availableBalance: wallet.availableBalance,
              lifetimeEarnings: wallet.lifetimeEarnings,
              currency: wallet.currency,
            } : null,
          },
          refreshHints: [RefreshHints.WALLET_SUMMARY, RefreshHints.TRANSACTIONS_LIST],
          notificationsQueued: true,
          message: 'Idempotent success (already credited)',
        })
      );
    }

    // Create transaction object (Transactions repo shape)
    const nowISO = new Date().toISOString();
    const transaction: TransactionRecord = {
      transactionId: `TXN-${orderId}`,
      type: 'store-purchase',
      integration: 'mock',
      status: 'paid',
      amount: Number(amount),
      timestamp: nowISO,
      currency: cur,
      freelancerId: ownerFreelancerId!,
      productId: String(productId),
      metadata: { orderId: String(orderId) }
    };

    await appendTransaction(transaction);

    // Get or create wallet (Wallets repo shape)
    let walletMaybe: Wallet | undefined = await getWallet(ownerFreelancerId!, 'freelancer', cur);
    if (!walletMaybe) {
      walletMaybe = {
        userId: ownerFreelancerId!,
        userType: 'freelancer',
        currency: cur,
        availableBalance: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 0,
        holds: 0,
        updatedAt: nowISO,
      } as Wallet;
    }

    const previousBalance = walletMaybe.availableBalance;
    const wallet: Wallet = walletMaybe as Wallet;
    wallet.availableBalance = Number(wallet.availableBalance) + Number(amount);
    wallet.lifetimeEarnings = Number(wallet.lifetimeEarnings) + Number(amount);
    wallet.updatedAt = nowISO;

    await upsertWallet(wallet);

    // Log the wallet change for observability
    logWalletChange(
      ownerFreelancerId!,
      'freelancer',
      'credit',
      Number(amount),
      cur,
      actorId, // System/admin initiated storefront credit
      Subsystems.PAYMENTS_STOREFRONT,
      {
        reason: 'storefront_purchase',
        transactionId: transaction.transactionId,
        previousBalance,
        newBalance: wallet.availableBalance,
      }
    );

    return NextResponse.json(
      ok({
        entities: {
          transaction: {
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            timestamp: transaction.timestamp,
          },
          wallet: {
            availableBalance: wallet.availableBalance,
            lifetimeEarnings: wallet.lifetimeEarnings,
            currency: wallet.currency,
          },
        },
        refreshHints: [
          RefreshHints.WALLET_SUMMARY,
          RefreshHints.TRANSACTIONS_LIST,
          RefreshHints.DASHBOARD,
        ],
        notificationsQueued: false, // Storefront credits don't generate notifications
        message: 'Storefront payment credited successfully',
      })
    );
  } catch (error) {
    console.error('[STOREFRONT_CREDIT_ERROR]', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleStorefrontCredit);