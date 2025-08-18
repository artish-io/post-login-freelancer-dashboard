import { NextResponse, NextRequest } from 'next/server';
import { getInvoiceByNumber, updateInvoice } from '@/app/api/payments/repos/invoices-repo';
import { listByInvoiceNumber, appendTransaction, findByMetadataKey } from '@/app/api/payments/repos/transactions-repo';
import { processMockPayment } from '../utils/gateways/test-gateway';
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
import { ok, err, RefreshHints, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logInvoiceTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';
import { emit as emitBus } from '@/lib/events/bus';
import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
import { zExecuteBody } from '@/lib/validation/z';
import { withRateLimit, RateLimiters } from '@/lib/security/rate-limiter';
import { withRequestValidation, VALIDATION_CONFIGS } from '@/lib/security/request-validator';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import type { InvoiceLike } from '@/app/api/payments/domain/types';



// Gateway flags (future real integrations)
const useStripe = process.env.PAYMENT_GATEWAY_STRIPE === 'true';
const usePaystack = process.env.PAYMENT_GATEWAY_PAYSTACK === 'true';
const usePayPal = process.env.PAYMENT_GATEWAY_PAYPAL === 'true';

async function handleExecutePayment(req: Request) {
  try {
    // Generate correlation ID for tracing
    const correlationId = req.headers.get('x-correlation-id') ||
      `pay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log(`[${correlationId}] Payment ${req.url} started by user`);

    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(req as NextRequest);

    // 🔒 Parse, sanitize, and validate request body
    const rawBody = await req.json();
    const sanitizedBody = sanitizeApiInput(rawBody);
    const body = zExecuteBody.parse(sanitizedBody) as { invoiceNumber: string };
    const { invoiceNumber } = body;

    // Load invoice first to validate ownership
    const invRaw = await getInvoiceByNumber(invoiceNumber);
    assert(invRaw, ErrorCodes.INVOICE_NOT_FOUND, 404, 'Invoice not found');

    // 🔒 Ensure invoice belongs to the session user (commissioner)
    assertOwnership(actorId, invRaw!.commissionerId, 'invoice');

    // Check for idempotency key to prevent duplicate processing
    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      // Check for existing transaction with this key
      const existingTx = await findByMetadataKey('idempotencyKey', idempotencyKey);
      if (existingTx.length > 0) {
        const cachedTx = existingTx[0];
        console.log(`[${correlationId}] Returning cached result for idempotency key: ${idempotencyKey}`);
        return NextResponse.json(ok({
          message: 'Payment already processed',
          entities: {
            transaction: {
              transactionId: cachedTx.transactionId,
              cached: true
            }
          }
        }));
      }
    }

    // 🔧 ADD FALLBACK LOGIC AFTER THE ABOVE:
    let finalIdempotencyKey = idempotencyKey;
    if (!finalIdempotencyKey) {
      // Generate fallback key using available invoice data
      finalIdempotencyKey = `pay:${invRaw!.projectId}:${invRaw!.invoiceNumber}`;
      console.log(`[${correlationId}] Generated fallback idempotency key: ${finalIdempotencyKey}`);

      // Check if this fallback key was already processed
      const existingTx = await findByMetadataKey('idempotencyKey', finalIdempotencyKey);
      if (existingTx.length > 0) {
        const cachedTx = existingTx[0];
        console.log(`[${correlationId}] Payment already processed with fallback key: ${finalIdempotencyKey}`);
        return NextResponse.json(ok({
          message: 'Payment already processed',
          entities: {
            transaction: {
              transactionId: cachedTx.transactionId,
              cached: true
            }
          }
        }));
      }
    }

    // Status guards - only allow processing → paid transition
    assert(invRaw!.status !== 'paid', ErrorCodes.PAYMENT_ALREADY_PROCESSED, 409, 'Invoice already paid');

    // Shape to domain DTO with proper currency validation
    const currency = (invRaw as any)?.currency || 'USD';
    if (!(invRaw as any)?.currency) {
      console.warn(`[${correlationId}] Missing currency for invoice ${invRaw!.invoiceNumber}, defaulting to USD`);
    }

    const invoice: InvoiceLike = {
      invoiceNumber: String(invRaw!.invoiceNumber),
      projectId: Number(invRaw!.projectId ?? 0),
      freelancerId: Number(invRaw!.freelancerId),
      commissionerId: Number(invRaw!.commissionerId),
      totalAmount: Number(invRaw!.totalAmount),
      currency: currency,
      status: invRaw!.status as any, // Handle legacy status values
      method: (invRaw as any)?.method || 'milestone',
      milestoneNumber: (invRaw as any)?.milestoneNumber,
      issueDate: (invRaw as any)?.issueDate,
      dueDate: (invRaw as any)?.dueDate,
      paidDate: (invRaw as any)?.paidDate,
    };

    // ✅ Service-layer rule: execute requires 'processing' by default
    const canExec = PaymentsService.canExecutePayment(invoice, actorId);
    assert(canExec.ok, ErrorCodes.INVALID_STATUS_TRANSITION, 400, !canExec.ok ? (canExec as any).reason : 'Cannot execute payment');

    // Gateway placeholders (real integrations later)
    let paymentRecord: any = null;
    if (useStripe) {
      console.log('[payments.execute] Stripe placeholder');
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else if (usePaystack) {
      console.log('[payments.execute] Paystack placeholder');
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else if (usePayPal) {
      console.log('[payments.execute] PayPal placeholder');
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else {
      console.log('[payments.execute] Using mock gateway');
      paymentRecord = await processMockPayment({
        invoiceNumber: invoice.invoiceNumber,
        projectId: Number(invoice.projectId ?? 0),
        freelancerId: Number(invoice.freelancerId),
        commissionerId: Number(invoice.commissionerId),
        totalAmount: Number(invoice.totalAmount)
      }, 'execute');
    }

    // Update invoice → paid
    const paidDate = new Date().toISOString();
    const invoiceUpdated = await updateInvoice(invoiceNumber, {
      status: 'paid',
      paidDate,
      updatedAt: paidDate
    });
    assert(invoiceUpdated, ErrorCodes.INTERNAL_ERROR, 500, 'Failed to update invoice status');

    // Update transaction log - ALWAYS append new records, NEVER update money-state fields
    const existingTxs = await listByInvoiceNumber(invoiceNumber);
    const latestTx = existingTxs[existingTxs.length - 1];
    const integrationMethod = useStripe ? 'stripe' : usePaystack ? 'paystack' : usePayPal ? 'paypal' : 'mock';

    // ALWAYS append new records - NEVER update money-state fields
    const completionTx = PaymentsService.buildTransaction({
      invoiceNumber: invoice.invoiceNumber,
      projectId: invoice.projectId,
      freelancerId: invoice.freelancerId,
      commissionerId: invoice.commissionerId,
      totalAmount: invoice.totalAmount,
    }, 'execute', integrationMethod as any);

    // Set final status and currency (ensure currency is always set)
    completionTx.status = 'paid';
    completionTx.currency = currency;
    completionTx.metadata = {
      ...completionTx.metadata,
      executedBy: actorId,
      correlationId,
      idempotencyKey: finalIdempotencyKey || undefined,
      originalTransactionId: latestTx?.transactionId // Link to original
    };

    // Add card metadata to transaction if available
    if (paymentRecord.cardUsed) {
      completionTx.metadata = {
        ...completionTx.metadata,
        cardUsed: paymentRecord.cardUsed,
        paymentMethod: 'test_card'
      };
    }

    await appendTransaction(completionTx);

    // Credit freelancer wallet with the paid amount (multi-currency)
    const amountPaid = Number(invoice.totalAmount);
    const freelancerIdNum = Number(invoice.freelancerId);
    // Use the already validated currency from above
    const nowISO = new Date().toISOString();

    let wallet = await getWallet(freelancerIdNum, 'freelancer', currency);
    const previousBalance = wallet?.availableBalance || 0;

    if (!wallet) {
      wallet = {
        userId: freelancerIdNum,
        userType: 'freelancer',
        currency,
        availableBalance: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        lifetimeEarnings: 0,
        holds: 0,
        updatedAt: nowISO,
      };
    }

    wallet.availableBalance = Number(wallet.availableBalance) + amountPaid;
    wallet.lifetimeEarnings = Number(wallet.lifetimeEarnings) + amountPaid;
    wallet.updatedAt = nowISO;

    await upsertWallet(wallet);

    // Log transitions for observability
    console.log(`[${correlationId}] Invoice transition: ${invRaw!.status} -> paid for ${invoice.invoiceNumber}`);
    logInvoiceTransition(
      invoice.invoiceNumber,
      invRaw!.status,
      'paid',
      actorId,
      Subsystems.PAYMENTS_EXECUTE,
      {
        projectId: invoice.projectId,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        integration: integrationMethod,
        transactionId: completionTx.transactionId,
      }
    );

    console.log(`[${correlationId}] Wallet credit: ${amountPaid} ${currency} to freelancer ${freelancerIdNum}`);
    logWalletChange(
      freelancerIdNum,
      'freelancer',
      'credit',
      amountPaid,
      currency,
      actorId,
      Subsystems.WALLETS_UPDATE,
      {
        reason: 'invoice_payment',
        transactionId: completionTx.transactionId,
        invoiceNumber: invoice.invoiceNumber,
        previousBalance,
        newBalance: wallet.availableBalance,
      }
    );

    // 🔔 Emit event for notifications/UI refresh hooks
    try {
      await emitBus('invoice.paid', {
        actorId: actorId,
        targetId: Number(invoice.freelancerId),
        projectId: String(invoice.projectId), // Keep as string for proper project lookup
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        projectTitle: undefined, // Could be fetched if needed
      });
    } catch (e) {
      console.warn('[payments.execute] bus emit failed:', e);
    }

    return NextResponse.json(
      ok({
        entities: {
          invoice: {
            invoiceNumber,
            status: 'paid',
            amount: invoice.totalAmount,
            currency: invoice.currency,
            paidDate,
          },
          transaction: {
            transactionId: paymentRecord.transactionId,
            integration: integrationMethod,
            status: 'paid',
            amount: invoice.totalAmount,
            currency: invoice.currency,
          },
          wallet: {
            availableBalance: wallet.availableBalance,
            pendingWithdrawals: wallet.pendingWithdrawals,
            totalWithdrawn: wallet.totalWithdrawn,
            lifetimeEarnings: wallet.lifetimeEarnings,
            currency: wallet.currency,
          },
        },
        refreshHints: [
          RefreshHints.WALLET_SUMMARY,
          RefreshHints.INVOICES_LIST,
          RefreshHints.TRANSACTIONS_LIST,
          RefreshHints.PROJECTS_OVERVIEW,
          RefreshHints.DASHBOARD,
        ],
        notificationsQueued: true,
        message: 'Payment executed successfully',
      })
    );
  } catch (error) {
    console.error('[PAYMENT_EXECUTE_ERROR]', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500),
      { status: 500 }
    );
  }
}

// Wrap the handler with security middleware
export const POST = withRateLimit(
  RateLimiters.payments,
  withRequestValidation(
    VALIDATION_CONFIGS.payments,
    withErrorHandling(handleExecutePayment)
  )
);
