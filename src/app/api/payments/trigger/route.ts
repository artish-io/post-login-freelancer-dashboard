import { NextResponse, NextRequest } from 'next/server';
import { getInvoiceByNumber, updateInvoice } from '@/app/api/payments/repos/invoices-repo';
import { appendTransaction, listByInvoiceNumber } from '@/app/api/payments/repos/transactions-repo';
import { getProjectById } from '@/app/api/payments/repos/projects-repo';
import { processMockPayment } from '../utils/gateways/test-gateway';
import { ok, err, RefreshHints, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';
import { logInvoiceTransition, Subsystems } from '@/lib/log/transitions';
import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
import { zTriggerBody } from '@/lib/validation/z';
import { withRateLimit, RateLimiters } from '@/lib/security/rate-limiter';
import { withRequestValidation, VALIDATION_CONFIGS } from '@/lib/security/request-validator';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';


// Optional env flags for future real gateways
const useStripe = process.env.PAYMENT_GATEWAY_STRIPE === 'true';
const usePaystack = process.env.PAYMENT_GATEWAY_PAYSTACK === 'true';
const usePayPal = process.env.PAYMENT_GATEWAY_PAYPAL === 'true';

// Feature flag for eligibility checks (can be disabled for tests)
const requireEligibility = process.env.PAYMENTS_REQUIRE_ELIGIBILITY !== 'false';

async function handleTriggerPayment(req: Request) {
  try {
    // Generate correlation ID for tracing
    const correlationId = req.headers.get('x-correlation-id') ||
      `pay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log(`[${correlationId}] Payment trigger ${req.url} started`);

    // 🔒 Auth - get session and validate
    const { userId: actorId } = await requireSession(req as NextRequest);

    // 🔒 Parse, sanitize, and validate request body
    const rawBody = await req.json();
    const sanitizedBody = sanitizeApiInput(rawBody);
    const body = zTriggerBody.parse(sanitizedBody) as { invoiceNumber: string };
    const { invoiceNumber } = body;

    // Load invoice first to validate ownership
    const invoice = await getInvoiceByNumber(invoiceNumber);
    assert(invoice, ErrorCodes.INVOICE_NOT_FOUND, 404, 'Invoice not found');

    // 🔒 Ensure invoice belongs to the session user (freelancer)
    assertOwnership(actorId, invoice!.freelancerId, 'invoice');

    // Status guards - only allow sent → processing transition
    assert(invoice!.status !== 'paid', ErrorCodes.PAYMENT_ALREADY_PROCESSED, 409, 'Invoice already paid');
    assert(invoice!.status === 'sent', ErrorCodes.INVALID_STATUS_TRANSITION, 400, 'Invoice must be in "sent" status to trigger payment');

    // Project lookup and validation
    assert(invoice!.projectId, ErrorCodes.INVALID_INPUT, 400, 'Invoice has no associated project');
    const projectRaw = await getProjectById(invoice!.projectId!);
    assert(projectRaw, ErrorCodes.PROJECT_NOT_FOUND, 404, 'Project not found');

    // Project validation complete - we have a valid project

    // 🔎 Call payment-eligibility endpoint first to ensure UI can safely show "Pay now"
    // Can be disabled via PAYMENTS_REQUIRE_ELIGIBILITY=false for tests
    if (requireEligibility) {
      try {
        const proto = req.headers.get('x-forwarded-proto') ?? 'http';
        const host = req.headers.get('host') ?? 'localhost:3000';

        // Validate headers are present (important for production)
        if (!proto || !host) {
          console.warn('[payments.trigger] Missing forwarded headers, using defaults');
        }

        const base = `${proto}://${host}`;
        const eligRes = await fetch(`${base}/api/projects/payment-eligibility?projectId=${invoice!.projectId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        });

        assert(eligRes.ok, ErrorCodes.SERVICE_UNAVAILABLE, 502, `Failed to verify payment eligibility (${eligRes.status})`);

        const eligibility = await eligRes.json();
        assert(eligibility?.paymentEligible, ErrorCodes.INVALID_STATUS, 403, 'Project not eligible for payment yet');
      } catch (e) {
        console.warn('[payments.trigger] eligibility check failed', e);
        throw Object.assign(new Error('Eligibility check failed'), {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          status: 502
        });
      }
    } else {
      console.log('[payments.trigger] Eligibility check skipped (PAYMENTS_REQUIRE_ELIGIBILITY=false)');
    }

    // Prevent duplicate trigger by checking tx log first (idempotency)
    const existing = await listByInvoiceNumber(invoiceNumber);
    const hasOpenTx = existing.some(tx => tx.status === 'processing' || tx.status === 'paid');
    if (hasOpenTx) {
      // Return existing transaction for idempotency
      return NextResponse.json(
        ok({
          entities: {
            transaction: {
              transactionId: existing[0]?.transactionId,
              status: existing[0]?.status,
            },
          },
          message: 'Payment already triggered for this invoice',
        })
      );
    }

    // Gateway placeholders (real integrations later)
    if (useStripe) {
      console.log('[payments.trigger] Stripe placeholder');
    } else if (usePaystack) {
      console.log('[payments.trigger] Paystack placeholder');
    } else if (usePayPal) {
      console.log('[payments.trigger] PayPal placeholder');
    } else {
      console.log('[payments.trigger] Using mock gateway');
    }

    // Build transaction via mock gateway (processing)
    const paymentRecord = await processMockPayment({
      invoiceNumber: invoice!.invoiceNumber,
      projectId: invoice!.projectId!,
      freelancerId: Number(invoice!.freelancerId),
      commissionerId: Number(invoice!.commissionerId),
      totalAmount: Number(invoice!.totalAmount)
    }, 'trigger');

    // Persist: set invoice → processing
    const updateOk = await updateInvoice(invoiceNumber, {
      status: 'processing' as any, // Handle status transition
      updatedAt: new Date().toISOString()
    });
    assert(updateOk, ErrorCodes.INTERNAL_ERROR, 500, 'Failed to update invoice status');

    // Log the status transition
    console.log(`[${correlationId}] Invoice transition: sent -> processing for ${invoiceNumber}`);
    logInvoiceTransition(
      invoiceNumber,
      'sent',
      'processing',
      actorId,
      Subsystems.PAYMENTS_TRIGGER,
      {
        projectId: invoice!.projectId!,
        amount: Number(invoice!.totalAmount),
        integration: 'mock',
        transactionId: paymentRecord.transactionId,
      }
    );

    // Persist: append transaction record with correlation ID
    await appendTransaction({
      ...paymentRecord,
      type: 'invoice',
      integration: 'mock',
      metadata: {
        correlationId
      }
    } as any);

    return NextResponse.json(
      ok({
        entities: {
          invoice: {
            invoiceNumber: invoice!.invoiceNumber,
            status: 'processing',
            amount: invoice!.totalAmount,
            projectId: invoice!.projectId,
          },
          transaction: {
            transactionId: paymentRecord.transactionId,
            integration: paymentRecord.integration,
            status: 'processing',
          },
        },
        refreshHints: [
          RefreshHints.INVOICES_LIST,
          RefreshHints.INVOICE_DETAIL,
          RefreshHints.TRANSACTIONS_LIST,
          RefreshHints.DASHBOARD,
        ],
        notificationsQueued: false,
        message: 'Payment request initiated successfully',
      })
    );
  } catch (error) {
    console.error('[PAYMENT_TRIGGER_ERROR]', error);
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
    withErrorHandling(handleTriggerPayment)
  )
);