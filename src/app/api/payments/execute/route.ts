import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { getInvoiceByNumber, updateInvoice } from '@/lib/invoice-storage';
import { processMockPayment } from '../utils/test-gateway';

const MOCK_PAYMENTS_PATH = path.join(process.cwd(), 'data', 'payments', 'mock-transactions.json');

// Payment gateway environment flags
const useStripe = process.env.PAYMENT_GATEWAY_STRIPE === 'true';
const usePaystack = process.env.PAYMENT_GATEWAY_PAYSTACK === 'true';
const usePayPal = process.env.PAYMENT_GATEWAY_PAYPAL === 'true';

export async function POST(req: Request) {
  try {
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceNumber, commissionerId } = await req.json();
    const sessionUserId = parseInt(session.user.id);

    // Validate required parameters
    if (!invoiceNumber || !commissionerId) {
      return NextResponse.json({ error: 'Missing invoiceNumber or commissionerId' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify only the commissioner can execute payment for their own invoices
    if (commissionerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only execute payments for your own invoices'
      }, { status: 403 });
    }

    // Get invoice using hierarchical storage
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate commissioner authorization
    if (invoice.commissionerId !== commissionerId) {
      return NextResponse.json({ error: 'Unauthorized commissioner' }, { status: 403 });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 });
    }

    // For mock implementation, we'll accept "sent" status invoices directly
    // In production, this would check for "processing" status from the trigger endpoint
    if (invoice.status !== 'sent') {
      return NextResponse.json({
        error: 'Invoice must be in "sent" status for payment execution'
      }, { status: 400 });
    }

    // Payment gateway execution placeholder
    let executionResult = null;
    let paymentRecord: any = null;

    if (useStripe) {
      // TODO: Replace with Stripe payment execution once live
      // executionResult = await executeStripePayment(invoice);
      console.log('Stripe payment execution placeholder - would finalize payment here');
      executionResult = { success: true, mockPayment: false };
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else if (usePaystack) {
      // TODO: Replace with Paystack payment execution when API keys are available
      // executionResult = await executePaystackPayment(invoice);
      console.log('Paystack payment execution placeholder - would finalize payment here');
      executionResult = { success: true, mockPayment: false };
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else if (usePayPal) {
      // TODO: Replace with PayPal payment execution if selected
      // executionResult = await executePayPalPayment(invoice);
      console.log('PayPal payment execution placeholder - would finalize payment here');
      executionResult = { success: true, mockPayment: false };
      paymentRecord = { transactionId: `TXN-${invoice.invoiceNumber}` };
    } else {
      // Fallback: mock payment execution
      console.log('Using mock payment execution');
      paymentRecord = await processMockPayment({
        invoiceNumber: invoice.invoiceNumber,
        projectId: invoice.projectId ? Number(invoice.projectId) : 0,
        freelancerId: Number(invoice.freelancerId),
        commissionerId: Number(commissionerId),
        totalAmount: invoice.totalAmount
      }, 'execute');
      executionResult = paymentRecord;
    }

    // Update invoice status to paid using hierarchical storage
    const paidDate = new Date().toISOString();
    const updateSuccess = await updateInvoice(invoiceNumber, {
      status: 'paid',
      paidDate,
      updatedAt: paidDate
    });

    if (!updateSuccess) {
      return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
    }

    // Update or create mock transaction record
    let payments = [];
    try {
      const paymentsRaw = await fs.readFile(MOCK_PAYMENTS_PATH, 'utf-8');
      payments = JSON.parse(paymentsRaw);
    } catch {
      // File missing or unreadable, start with empty array
      payments = [];
    }

    const timestamp = new Date().toISOString();
    const integrationMethod = useStripe ? 'stripe' : usePaystack ? 'paystack' : usePayPal ? 'paypal' : 'mock';

    // Find existing transaction record
    const txnIndex = payments.findIndex((p: any) => p.invoiceNumber === invoiceNumber);
    if (txnIndex !== -1) {
      // Update existing transaction
      payments[txnIndex].status = 'paid';
      payments[txnIndex].timestamp = timestamp;
      payments[txnIndex].executionResult = executionResult;
    } else {
      // Create new transaction record if it doesn't exist
      payments.push({
        transactionId: paymentRecord.transactionId,
        invoiceNumber,
        projectId: invoice.projectId,
        freelancerId: invoice.freelancerId,
        commissionerId,
        amount: invoice.totalAmount,
        status: 'paid',
        integration: integrationMethod,
        timestamp,
        executionResult
      });
    }

    // Save updated transaction log
    await fs.writeFile(MOCK_PAYMENTS_PATH, JSON.stringify(payments, null, 2));

    return NextResponse.json({
      message: 'Payment executed successfully',
      status: 'paid',
      invoiceNumber,
      transactionId: paymentRecord.transactionId,
      amount: invoice.totalAmount,
      paidDate,
      integration: integrationMethod
    });
  } catch (error) {
    console.error('[PAYMENT_EXECUTE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
