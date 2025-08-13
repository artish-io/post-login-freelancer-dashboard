import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { promises as fs } from 'fs';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { getInvoiceByNumber, saveInvoice } from '@/lib/invoice-storage';

/**
 * Pay Invoice API Endpoint
 *
 * PAYMENT GATEWAY INTEGRATION NOTES:
 * When ready to integrate with payment gateways:
 *
 * 1. STRIPE CONNECT FLOW:
 *    - Confirm payment intent: stripe.paymentIntents.confirm()
 *    - Handle 3D Secure authentication if required
 *    - Automatic transfer to freelancer's connected account
 *    - Platform fee deduction via application_fee_amount
 *
 * 2. PAYSTACK FLOW:
 *    - Verify transaction: paystack.transaction.verify()
 *    - Split payment using subaccounts
 *    - Handle webhook confirmations
 *
 * 3. SECURITY CONSIDERATIONS:
 *    - Validate payment amounts match invoice totals
 *    - Implement idempotency keys to prevent double payments
 *    - Add fraud detection and risk assessment
 *    - Store payment method details securely (tokenized)
 */

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      invoiceNumber,
      commissionerId,
      amount,
      paymentMethodId, // TODO: From payment gateway
      currency = 'USD'
    } = await request.json();

    const sessionUserId = parseInt(session.user.id);

    if (!invoiceNumber || !commissionerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify only the commissioner can pay their own invoices
    if (commissionerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only pay invoices for your own projects'
      }, { status: 403 });
    }

    // Load data files
    const { getAllUsers } = await import('@/lib/storage/unified-storage-service');
    const users = await getAllUsers();

    // Find the invoice
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 🔒 SECURITY: Double-check invoice belongs to this commissioner
    if (invoice.commissionerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: This invoice does not belong to you'
      }, { status: 403 });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    // Check if invoice is in sent status (ready for payment)
    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: 'Invoice must be sent before it can be paid' }, { status: 400 });
    }

    // Validate payment amount matches invoice total
    if (Math.abs(amount - invoice.totalAmount) > 0.01) {
      return NextResponse.json({
        error: 'Payment amount does not match invoice total',
        expected: invoice.totalAmount,
        received: amount
      }, { status: 400 });
    }

    // TODO: PAYMENT GATEWAY INTEGRATION
    // const paymentResult = await processPayment({
    //   amount: invoice.totalAmount * 100, // Convert to cents for Stripe
    //   currency: currency,
    //   paymentMethodId: paymentMethodId,
    //   freelancerAccountId: freelancer.stripeAccountId,
    //   platformFeePercent: 5, // 5% platform fee
    //   metadata: {
    //     invoiceNumber: invoiceNumber,
    //     projectId: invoice.projectId,
    //     freelancerId: invoice.freelancerId,
    //     commissionerId: commissionerId
    //   }
    // });

    // SIMULATION: Process payment
    const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const platformFee = Math.round(invoice.totalAmount * 0.05 * 100) / 100; // 5% platform fee
    const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;

    // Update invoice status to 'paid'
    const updatedInvoice = {
      ...invoice,
      status: 'paid' as const,
      paidDate: new Date().toISOString().split('T')[0],
      paidAmount: amount,
      paymentDetails: {
        paymentId: simulatedPaymentId,
        paymentMethod: 'simulation', // TODO: actual payment method
        platformFee: platformFee,
        freelancerAmount: freelancerAmount,
        currency: currency,
        processedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    // Get commissioner info for notification
    const commissionerIdNum = parseInt(commissionerId);
    const commissioner = users.find((user: any) => user.id === commissionerIdNum);
    const commissionerName = commissioner?.name || 'A commissioner';

    console.log('🔍 Payment notification debug:', {
      commissionerId,
      commissionerIdNum,
      commissioner: commissioner ? { id: commissioner.id, name: commissioner.name } : null,
      commissionerName
    });

    // Create notification for freelancer
    const notificationId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotification = {
      id: notificationId,
      timestamp: new Date().toISOString(),
      type: "invoice_paid",
      notificationType: 41, // INVOICE_PAID from the notification types
      actorId: commissionerIdNum,
      targetId: parseInt(invoice.freelancerId),
      entityType: 3, // Invoice entity type
      entityId: invoiceNumber,
      metadata: {
        invoiceNumber: invoiceNumber,
        projectTitle: invoice.projectTitle,
        amount: amount,
        milestoneDescription: invoice.milestoneDescription,
        commissionerName: commissionerName
      },
      context: {
        projectId: invoice.projectId,
        invoiceNumber: invoiceNumber
      }
    };

    // Add notification using the new partitioned storage system
    NotificationStorage.addEvent(newNotification);

    // CRITICAL: Create wallet transaction for freelancer
    const walletHistoryPath = path.join(process.cwd(), 'data/wallet/wallet-history.json');
    let walletHistory = [];
    try {
      const walletData = await fs.readFile(walletHistoryPath, 'utf-8');
      walletHistory = JSON.parse(walletData);
    } catch (error) {
      console.log('Creating new wallet history file');
      walletHistory = [];
    }

    // Add wallet credit transaction
    const walletTransaction = {
      id: Date.now(),
      userId: parseInt(invoice.freelancerId),
      commissionerId: commissionerIdNum,
      organizationId: null, // Could be derived from project if needed
      projectId: invoice.projectId,
      type: 'credit',
      amount: freelancerAmount,
      currency: currency,
      date: new Date().toISOString(),
      source: 'project_payment',
      description: `Payment for ${invoice.projectTitle}`,
      invoiceNumber: invoiceNumber
    };

    walletHistory.push(walletTransaction);
    await fs.writeFile(walletHistoryPath, JSON.stringify(walletHistory, null, 2));

    console.log(`💰 Created wallet transaction for freelancer ${invoice.freelancerId}: $${freelancerAmount}`);

    // Save updated invoice data
    await saveInvoice(updatedInvoice);

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully (SIMULATION MODE)',
      paymentId: simulatedPaymentId,
      invoiceNumber,
      amountPaid: amount,
      freelancerAmount: freelancerAmount,
      platformFee: platformFee,
      currency: currency,
      notificationId
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
