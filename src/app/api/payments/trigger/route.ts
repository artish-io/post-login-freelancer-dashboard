import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { getInvoiceByNumber, updateInvoice } from '@/lib/invoice-storage';
import { readProject } from '@/lib/projects-utils';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
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

    const { invoiceNumber, freelancerId } = await req.json();
    const sessionUserId = parseInt(session.user.id);

    // Validate required parameters
    if (!invoiceNumber || !freelancerId) {
      return NextResponse.json({ error: 'Missing invoiceNumber or freelancerId' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify only the freelancer can trigger payment for their own invoices
    if (freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only trigger payments for your own invoices'
      }, { status: 403 });
    }

    // Get invoice using hierarchical storage
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate freelancer authorization
    if (invoice.freelancerId !== freelancerId) {
      return NextResponse.json({ error: 'Unauthorized freelancer' }, { status: 403 });
    }

    // Check if invoice is already paid (prevent duplicate payment attempts)
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 });
    }

    // Validate invoice status is "sent" before allowing trigger
    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: 'Invoice must be in "sent" status to trigger payment' }, { status: 400 });
    }

    // Handle null projectId case
    if (!invoice.projectId) {
      return NextResponse.json({ error: 'Invoice has no associated project' }, { status: 400 });
    }

    // Get project using hierarchical storage
    const project = await readProject(invoice.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const invoicingMethod = project.invoicingMethod || 'milestone'; // fallback
    const isCompletion = invoicingMethod === 'completion';

    // For completion-based projects, validate task completion requirements
    if (isCompletion && (invoice.milestoneNumber || 1) > 1) {
      // Get all tasks using hierarchical storage
      const hierarchicalTasks = await readAllTasks();
      const allTasks = convertHierarchicalToLegacy(hierarchicalTasks);

      // Find project tasks
      const projectTaskData = allTasks.find((pt: any) => pt.projectId === project.projectId);
      const projectTasks = projectTaskData?.tasks || [];

      // For final milestone in completion projects, ensure all tasks are complete
      const allTasksComplete = projectTasks.every((t: any) => t.status === 'Approved' && t.completed === true);
      if (!allTasksComplete) {
        return NextResponse.json({
          error: 'Not all tasks are approved and completed for final payment in completion-based project'
        }, { status: 403 });
      }
    }

    // Payment gateway integration placeholder
    if (useStripe) {
      // TODO: Replace with Stripe integration once live
      // const paymentResult = await payWithStripe(invoice);
      console.log('Stripe integration placeholder - would process payment here');
    } else if (usePaystack) {
      // TODO: Replace with Paystack integration when API keys are available
      // const paymentResult = await payWithPaystack(invoice);
      console.log('Paystack integration placeholder - would process payment here');
    } else if (usePayPal) {
      // TODO: Replace with PayPal SDK if selected
      // const paymentResult = await payWithPayPal(invoice);
      console.log('PayPal integration placeholder - would process payment here');
    } else {
      // Fallback: mock payment
      console.log('Using mock payment processing');
    }

    // Update invoice status to processing using hierarchical storage
    const updateSuccess = await updateInvoice(invoiceNumber, {
      status: 'sent', // Keep as sent since processing isn't in the type definition
      updatedAt: new Date().toISOString()
    });

    if (!updateSuccess) {
      return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
    }

    const paymentRecord = await processMockPayment({
      invoiceNumber: invoice.invoiceNumber,
      projectId: project.projectId ? Number(project.projectId) : 0,
      freelancerId: Number(freelancerId),
      commissionerId: Number(invoice.commissionerId),
      totalAmount: invoice.totalAmount
    }, 'trigger');

    // Log transaction to mock payments file
    let payments = [];
    try {
      const paymentsRaw = await fs.readFile(MOCK_PAYMENTS_PATH, 'utf-8');
      payments = JSON.parse(paymentsRaw);
    } catch {
      // File doesn't exist yet, start with empty array
      payments = [];
    }

    // Check for duplicate transaction to prevent re-triggering
    const existingTransaction = payments.find((p: any) => p.invoiceNumber === invoiceNumber);
    if (existingTransaction) {
      return NextResponse.json({
        error: 'Payment already triggered for this invoice',
        existingTransactionId: existingTransaction.transactionId
      }, { status: 409 });
    }

    payments.push(paymentRecord);
    await fs.writeFile(MOCK_PAYMENTS_PATH, JSON.stringify(payments, null, 2));

    return NextResponse.json({
      message: 'Payment request initiated successfully',
      status: 'processing',
      transactionId: paymentRecord.transactionId,
      integration: paymentRecord.integration,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.totalAmount,
      projectId: project.projectId
    });
  } catch (error) {
    console.error('[PAYMENT_TRIGGER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}