import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import path from 'path';
import { promises as fs } from 'fs';
import { NotificationStorage } from '../../../../lib/notifications/notification-storage';
import { getInvoiceByNumber, saveInvoice } from '../../../../lib/invoice-storage';

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
      paymentMethodId: _paymentMethodId, // TODO: From payment gateway
      currency = 'USD'
    } = await request.json();

    const sessionUserId = parseInt(session.user.id);

    if (!invoiceNumber || !commissionerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify only the commissioner can pay their own invoices
    const commissionerIdNum = parseInt(commissionerId);
    if (commissionerIdNum !== sessionUserId) {
      console.log(`[PAY_AUTH_ERROR] Commissioner ID mismatch: ${commissionerIdNum} !== ${sessionUserId}`);
      return NextResponse.json({
        error: 'Unauthorized: You can only pay invoices for your own projects'
      }, { status: 403 });
    }

    // Load data files
    const { getAllUsers } = await import('../../../../lib/storage/unified-storage-service');
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

    // Check if invoice is in payable status (sent or draft)
    if (!['sent', 'draft'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice must be sent or draft to be paid' }, { status: 400 });
    }

    // Validate payment amount matches invoice total
    if (Math.abs(amount - invoice.totalAmount) > 0.01) {
      return NextResponse.json({
        error: 'Payment amount does not match invoice total',
        expected: invoice.totalAmount,
        received: amount
      }, { status: 400 });
    }

    // SIMULATION: Process payment using test cards
    const testCardsPath = path.join(process.cwd(), 'data/commissioner-payments/test-cards.json');
    let testCards = [];
    try {
      const testCardsData = await fs.readFile(testCardsPath, 'utf-8');
      testCards = JSON.parse(testCardsData);
    } catch (error) {
      console.error('Failed to load test cards:', error);
      return NextResponse.json({ error: 'Payment system unavailable' }, { status: 500 });
    }

    // Find commissioner's test card
    const commissionerCard = testCards.find((card: any) =>
      card.commissionerId === sessionUserId && card.isActive && card.isDefault
    );

    if (!commissionerCard) {
      return NextResponse.json({
        error: 'No active payment method found. Please add a payment method.'
      }, { status: 400 });
    }

    // Check if card has sufficient balance
    if (commissionerCard.availableBalance < invoice.totalAmount) {
      return NextResponse.json({
        error: `Insufficient funds. Available: $${commissionerCard.availableBalance}, Required: $${invoice.totalAmount}`
      }, { status: 400 });
    }

    const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const platformFee = Math.round(invoice.totalAmount * 0.052666 * 100) / 100; // 5.2666% platform fee
    const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;

    // Update card balance and transaction history
    const newBalance = commissionerCard.availableBalance - invoice.totalAmount;
    const cardTransaction = {
      transactionId: `TXN-${Date.now()}`,
      amount: -invoice.totalAmount,
      type: 'payment',
      description: `Payment for invoice ${invoiceNumber}`,
      invoiceNumber: invoiceNumber,
      projectId: invoice.projectId?.toString() || 'NaN',
      freelancerId: invoice.freelancerId,
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance
    };

    // Update the card data
    const updatedCard = {
      ...commissionerCard,
      availableBalance: newBalance,
      transactionHistory: [...commissionerCard.transactionHistory, cardTransaction],
      lastUsed: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update test cards file
    const updatedTestCards = testCards.map((card: any) =>
      card.id === commissionerCard.id ? updatedCard : card
    );
    await fs.writeFile(testCardsPath, JSON.stringify(updatedTestCards, null, 2));

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

    // Get commissioner info for notification (reuse commissionerIdNum from earlier)
    const commissioner = users.find((user: any) => user.id === commissionerIdNum);
    const commissionerName = commissioner?.name || 'A commissioner';

    console.log('🔍 Payment notification debug:', {
      commissionerId,
      commissionerIdNum,
      commissioner: commissioner ? { id: commissioner.id, name: commissioner.name } : null,
      commissionerName
    });

    // Get organization name and project budget for the notification
    let organizationName = commissionerName; // Fallback to commissioner name
    let projectBudget = 0;
    try {
      const { getOrganizationByCommissionerId, getProjectById } = await import('../../../../lib/storage/unified-storage-service');
      const organization = await getOrganizationByCommissionerId(commissionerIdNum);
      if (organization) {
        organizationName = organization.name;
      }

      // Get project budget for remaining budget calculation
      if (invoice.projectId) {
        const project = await getProjectById(invoice.projectId);
        if (project) {
          projectBudget = project.totalBudget || 0;
        }
      }
    } catch (orgError) {
      console.warn('Could not fetch organization name or project budget for invoice payment notification, using fallbacks');
    }

    // Create notification for freelancer
    const notificationId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotification = {
      id: notificationId,
      timestamp: new Date().toISOString(),
      type: "invoice_paid" as const,
      notificationType: 41, // INVOICE_PAID from the notification types
      actorId: commissionerIdNum,
      targetId: typeof invoice.freelancerId === 'string' ? parseInt(invoice.freelancerId) : invoice.freelancerId,
      entityType: 3, // Invoice entity type
      entityId: invoiceNumber,
      metadata: {
        invoiceNumber: invoiceNumber,
        projectTitle: invoice.projectTitle,
        amount: amount,
        milestoneDescription: invoice.milestoneDescription,
        organizationName: organizationName, // Use organization name instead of commissioner name
        commissionerName: commissionerName, // Keep commissioner name for backward compatibility
        projectBudget: projectBudget // Add project budget for remaining budget calculation
      },
      context: {
        projectId: invoice.projectId,
        invoiceNumber: invoiceNumber
      }
    };

    // Add freelancer notification using the new partitioned storage system
    NotificationStorage.addEvent(newNotification);

    // Create notification for commissioner about their payment
    const commissionerNotificationId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const freelancerIdNum = typeof invoice.freelancerId === 'string' ? parseInt(invoice.freelancerId) : invoice.freelancerId;
    const freelancer = users.find((user: any) => user.id === freelancerIdNum);
    const freelancerName = freelancer?.name || 'A freelancer';

    // Get project info for remaining budget calculation
    let remainingBudget = 'unknown';
    try {
      const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
      const project = await UnifiedStorageService.readProject(invoice.projectId?.toString() || '');
      if (project) {
        const currentPaidToDate = project.paidToDate || 0;
        const totalBudget = project.totalBudget || 0;
        const newPaidToDate = currentPaidToDate + amount;
        remainingBudget = `$${(totalBudget - newPaidToDate).toFixed(2)}`;
      }
    } catch (error) {
      console.error('Failed to calculate remaining budget for notification:', error);
    }

    const commissionerNotification = {
      id: commissionerNotificationId,
      timestamp: new Date().toISOString(),
      type: "payment_sent" as const,
      notificationType: 42, // PAYMENT_SENT notification type
      actorId: commissionerIdNum,
      targetId: commissionerIdNum, // Commissioner notifies themselves
      entityType: 3, // Invoice entity type
      entityId: invoiceNumber,
      metadata: {
        invoiceNumber: invoiceNumber,
        projectTitle: invoice.projectTitle,
        amount: amount,
        freelancerName: freelancerName,
        remainingBudget: remainingBudget,
        notificationText: `You just paid ${freelancerName} $${amount} for their work on ${invoice.projectTitle}. This project has a remaining budget of ${remainingBudget} left.`
      },
      context: {
        projectId: invoice.projectId,
        invoiceNumber: invoiceNumber
      }
    };

    // Add commissioner notification
    NotificationStorage.addEvent(commissionerNotification);

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
      userId: freelancerIdNum,
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

    // Update project paidToDate (CRITICAL FIX)
    if (invoice.projectId) {
      try {
        const { UnifiedStorageService } = await import('../../../../lib/storage/unified-storage-service');
        const projectIdStr = invoice.projectId.toString();
        console.log(`🔍 Attempting to read project: ${projectIdStr}`);

        const project = await UnifiedStorageService.readProject(projectIdStr);
        console.log(`🔍 Project found:`, project ? { id: project.projectId, currentPaidToDate: project.paidToDate } : 'null');

        if (project) {
          const currentPaidToDate = project.paidToDate || 0;
          const paymentAmount = amount || invoice.totalAmount || 0;
          const newPaidToDate = currentPaidToDate + paymentAmount;

          console.log(`🔍 Payment calculation: ${currentPaidToDate} + ${paymentAmount} = ${newPaidToDate}`);

          await UnifiedStorageService.writeProject({
            ...project,
            paidToDate: newPaidToDate,
            updatedAt: new Date().toISOString()
          });

          console.log(`💰 Updated project ${invoice.projectId} paidToDate: $${currentPaidToDate} → $${newPaidToDate}`);
        } else {
          console.error(`❌ Project ${projectIdStr} not found`);
        }
      } catch (error) {
        console.error('Failed to update project paidToDate:', error);
        console.error('Error details:', error);
      }
    } else {
      console.error('❌ No projectId found in invoice:', invoice);
    }

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
