import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { promises as fs } from 'fs';
import { getInvoiceByNumber, saveInvoice } from '@/lib/invoice-storage';

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
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceNumber, freelancerId, commissionerId } = await request.json();
    const sessionUserId = parseInt(session.user.id);

    if (!invoiceNumber || !freelancerId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify only the freelancer can send their own invoices
    if (freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only send invoices for your own projects'
      }, { status: 403 });
    }

    // Load data files
    const notificationsPath = path.join(process.cwd(), 'data/notifications/notifications-log.json');

    const [notificationsData, users] = await Promise.all([
      fs.readFile(notificationsPath, 'utf-8'),
      import('@/lib/storage/unified-storage-service').then(m => m.getAllUsers())
    ]);

    const notifications = JSON.parse(notificationsData);

    // Find the invoice
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 🔒 SECURITY: Double-check invoice belongs to this freelancer
    if (invoice.freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: This invoice does not belong to you'
      }, { status: 403 });
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

    // Calculate approved tasks count and validate invoice eligibility
    const approvedTasks = (invoice.milestones || []).filter(milestone =>
      milestone.approvedAt || milestone.taskId === 'upfront'
    );
    const approvedTasksCount = approvedTasks.length;
    const invoiceValue = invoice.totalAmount;

    // Log invoice received event
    console.log(`[INVOICE_RECEIVED] ${JSON.stringify({
      invoiceNumber,
      projectId: invoice.projectId,
      amount_due: invoiceValue,
      approved_tasks: approvedTasksCount
    })}`);

    // Only send notification if invoice has approved tasks and amount > 0
    if (approvedTasksCount > 0 && invoiceValue > 0) {
      // Create notification for commissioner with exact copy as specified
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
          amount: invoiceValue,
          approvedTasksCount: approvedTasksCount,
          freelancerName: freelancerName,
          notificationText: `${freelancerName} sent you an invoice for $${invoiceValue} for ${approvedTasksCount} approved task${approvedTasksCount !== 1 ? 's' : ''}, of your active project, ${invoice.projectTitle}.`
        },
        context: {
          projectId: invoice.projectId,
          invoiceNumber: invoiceNumber
        }
      };

      // Add notification to the log
      notifications.unshift(newNotification);
    }

      // Add notification to the log
      notifications.unshift(newNotification);
    }

    // SIMULATION: Save updated data
    // TODO: In production, also update payment gateway records
    const savePromises = [saveInvoice(updatedInvoice)];

    // Only save notifications if we created one
    if (approvedTasksCount > 0 && invoiceValue > 0) {
      savePromises.push(fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2)));
    }

    await Promise.all(savePromises);

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
