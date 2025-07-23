import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

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
    const {
      invoiceNumber,
      commissionerId,
      amount,
      paymentMethodId, // TODO: From payment gateway
      currency = 'USD'
    } = await request.json();

    if (!invoiceNumber || !commissionerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load data files
    const invoicesPath = path.join(process.cwd(), 'data/invoices.json');
    const notificationsPath = path.join(process.cwd(), 'data/notifications/notifications-log.json');
    const usersPath = path.join(process.cwd(), 'data/users.json');

    const [invoicesData, notificationsData, usersData] = await Promise.all([
      fs.readFile(invoicesPath, 'utf-8'),
      fs.readFile(notificationsPath, 'utf-8'),
      fs.readFile(usersPath, 'utf-8')
    ]);

    const invoices = JSON.parse(invoicesData);
    const notifications = JSON.parse(notificationsData);
    const users = JSON.parse(usersData);

    // Find the invoice
    const invoiceIndex = invoices.findIndex((inv: any) => inv.invoiceNumber === invoiceNumber);
    if (invoiceIndex === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[invoiceIndex];

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
    invoices[invoiceIndex].status = 'paid';
    invoices[invoiceIndex].paidDate = new Date().toISOString().split('T')[0];
    invoices[invoiceIndex].paidAmount = amount;
    invoices[invoiceIndex].paymentDetails = {
      paymentId: simulatedPaymentId,
      paymentMethod: 'simulation', // TODO: actual payment method
      platformFee: platformFee,
      freelancerAmount: freelancerAmount,
      currency: currency,
      processedAt: new Date().toISOString()
    };

    // Get commissioner info for notification
    const commissioner = users.find((user: any) => user.id === commissionerId);
    const commissionerName = commissioner?.name || 'A commissioner';

    // Create notification for freelancer
    const notificationId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotification = {
      id: notificationId,
      timestamp: new Date().toISOString(),
      type: "invoice_paid",
      notificationType: 41, // INVOICE_PAID from the notification types
      actorId: commissionerId,
      targetId: invoice.freelancerId,
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

    // Add notification to the log
    notifications.unshift(newNotification);

    // Save updated data
    await Promise.all([
      fs.writeFile(invoicesPath, JSON.stringify(invoices, null, 2)),
      fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2))
    ]);

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
