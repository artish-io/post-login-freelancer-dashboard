import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getInvoiceByNumber, saveInvoice } from '../../../lib/invoice-storage';

/**
 * Send Invoice API Endpoint
 * 
 * PAYMENT GATEWAY INTEGRATION NOTES:
 * When ready to integrate with payment gateways (Stripe Connect, Paystack, etc.):
 * 
 * 1. STRIPE CONNECT INTEGRATION:
 *    - Add Stripe Connect account creation for freelancers
 *    - Use Stripe's invoice API: stripe.invoices.create()
 *    - Set up webhooks for payment status updates
 *    - Handle automatic payouts to freelancer accounts
 * 
 * 2. PAYSTACK INTEGRATION:
 *    - Use Paystack's subaccount feature for freelancers
 *    - Create payment links: paystack.transaction.initialize()
 *    - Set up webhook endpoints for payment confirmations
 * 
 * 3. GENERAL PAYMENT FLOW:
 *    - Create payment intent/transaction in gateway
 *    - Store gateway transaction ID in invoice metadata
 *    - Handle webhook notifications for status updates
 *    - Implement automatic retry logic for failed payments
 *    - Add payment method management (cards, bank accounts)
 */

export async function POST(request: Request) {
  try {
    const { invoiceNumber, freelancerId, commissionerId } = await request.json();

    if (!invoiceNumber || !freelancerId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load data files
    const notificationsPath = path.join(process.cwd(), 'data/notifications/notifications-log.json');
    const usersPath = path.join(process.cwd(), 'data/users.json');

    const [notificationsData, usersData] = await Promise.all([
      fs.readFile(notificationsPath, 'utf-8'),
      fs.readFile(usersPath, 'utf-8')
    ]);

    const notifications = JSON.parse(notificationsData);
    const users = JSON.parse(usersData);

    // Find the invoice
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate invoice can be sent
    if (invoice.status === 'sent') {
      return NextResponse.json({ error: 'Invoice has already been sent' }, { status: 400 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice has already been paid' }, { status: 400 });
    }

    // SIMULATION: Update invoice status to 'sent'
    // TODO: When integrating payment gateway, create payment intent here
    const updatedInvoice = {
      ...invoice,
      status: 'sent' as const,
      sentDate: new Date().toISOString().split('T')[0],
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // TODO: Add payment gateway metadata
    // invoices[invoiceIndex].paymentGateway = {
    //   provider: 'stripe', // or 'paystack'
    //   transactionId: 'pi_1234567890', // from payment gateway
    //   paymentLink: 'https://checkout.stripe.com/pay/...',
    //   expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    // };

    // Get freelancer info for notification
    const freelancer = users.find((user: any) => user.id === freelancerId);
    const freelancerName = freelancer?.name || 'A freelancer';

    // Create notification for commissioner
    const notificationId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotification = {
      id: notificationId,
      timestamp: new Date().toISOString(),
      type: "invoice_sent",
      notificationType: 40, // INVOICE_SENT notification type
      actorId: freelancerId,
      targetId: commissionerId,
      entityType: 3, // Invoice entity type
      entityId: invoiceNumber,
      metadata: {
        invoiceNumber: invoiceNumber,
        projectTitle: invoice.projectTitle,
        amount: invoice.totalAmount,
        milestoneDescription: invoice.milestoneDescription,
        freelancerName: freelancerName
      },
      context: {
        projectId: invoice.projectId,
        invoiceNumber: invoiceNumber
      }
    };

    // Add notification to the log
    notifications.unshift(newNotification);

    // SIMULATION: Save updated data
    // TODO: In production, also update payment gateway records
    await Promise.all([
      saveInvoice(updatedInvoice),
      fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2))
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice sent successfully (SIMULATION MODE)',
      invoiceNumber,
      notificationId,
      // TODO: Include payment gateway response
      // paymentLink: paymentGatewayResponse.paymentLink,
      // transactionId: paymentGatewayResponse.id
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
