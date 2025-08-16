import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllUsers } from '@/lib/storage/unified-storage-service';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { ok, err, RefreshHints, ErrorCodes } from '@/lib/http/envelope';

const INVOICES_PATH = path.join(process.cwd(), 'data', 'invoices.json');
const COMMISSIONER_NOTIFICATIONS_PATH = path.join(process.cwd(), 'data', 'notifications', 'commissioners.json');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNumber, freelancerId, commissionerId, type = 'reminder' } = body;

    if (!invoiceNumber || !freelancerId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Read current data
    const [invoicesData, commissionerNotificationsData, users] = await Promise.all([
      fs.promises.readFile(INVOICES_PATH, 'utf-8'),
      fs.promises.readFile(COMMISSIONER_NOTIFICATIONS_PATH, 'utf-8'),
      getAllUsers()
    ]);

    const invoices = JSON.parse(invoicesData);
    const commissionerNotifications = JSON.parse(commissionerNotificationsData);

    // Find the invoice
    const invoiceIndex = invoices.findIndex((inv: any) => inv.invoiceNumber === invoiceNumber);
    if (invoiceIndex === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[invoiceIndex];
    
    // Check if invoice is in a state that allows reminders
    if (!['sent', 'overdue'].includes(invoice.status)) {
      return NextResponse.json({ 
        error: `Cannot send reminder for invoice with status: ${invoice.status}` 
      }, { status: 400 });
    }

    // Initialize reminders array if it doesn't exist
    if (!invoice.reminders) {
      invoice.reminders = [];
    }

    // Check cooldown period
    const now = new Date();
    const lastReminder = invoice.reminders[invoice.reminders.length - 1];
    
    if (lastReminder) {
      const lastReminderDate = new Date(lastReminder.sentAt);
      const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);
      
      // First two reminders: 48-hour cooldown
      // After that: 72-hour cooldown for escalation
      const requiredCooldown = invoice.reminders.length < 2 ? 48 : 72;
      
      if (hoursSinceLastReminder < requiredCooldown) {
        return NextResponse.json({ 
          error: `Must wait ${requiredCooldown} hours between reminders. ${Math.ceil(requiredCooldown - hoursSinceLastReminder)} hours remaining.`,
          hoursRemaining: Math.ceil(requiredCooldown - hoursSinceLastReminder)
        }, { status: 429 });
      }
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.dueDate);
    const isOverdue = now > dueDate;
    
    // Update invoice status to overdue if past due date
    if (isOverdue && invoice.status === 'sent') {
      invoice.status = 'overdue';
    }

    // Add reminder to invoice
    const reminder = {
      sentAt: now.toISOString(),
      sentBy: freelancerId,
      type: type,
      isOverdue: isOverdue
    };
    
    invoice.reminders.push(reminder);
    invoice.lastReminderSent = now.toISOString();

    // Get freelancer and task/project info for notification
    const freelancer = users.find((user: any) => user.id === freelancerId);
    const freelancerName = freelancer?.name || 'Freelancer';
    
    // Determine notification message based on invoice type and status
    let notificationText = '';
    if (invoice.milestoneDescription) {
      // Old format - use milestone description as task title
      notificationText = isOverdue 
        ? `${freelancerName} reminded you about overdue ${invoiceNumber} for ${invoice.milestoneDescription}`
        : `${freelancerName} reminded you about ${invoiceNumber} for ${invoice.milestoneDescription}`;
    } else if (invoice.projectTitle) {
      // New format - use project title for completion-based invoicing
      notificationText = isOverdue
        ? `${freelancerName} reminded you about overdue ${invoiceNumber} for ${invoice.projectTitle}`
        : `${freelancerName} reminded you about ${invoiceNumber} for ${invoice.projectTitle}`;
    } else {
      // Fallback
      notificationText = isOverdue
        ? `${freelancerName} reminded you about overdue ${invoiceNumber}`
        : `${freelancerName} reminded you about ${invoiceNumber}`;
    }

    // Find or create commissioner notification entry
    let commissionerEntry = commissionerNotifications.find((entry: any) => entry.commissionerId === commissionerId);
    if (!commissionerEntry) {
      commissionerEntry = {
        commissionerId: commissionerId,
        notifications: []
      };
      commissionerNotifications.push(commissionerEntry);
    }

    // Create notification event using the event system
    const notificationEvent = {
      id: `invoice-reminder-${invoiceNumber}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: isOverdue ? 'invoice_overdue_reminder' : 'invoice_reminder',
      notificationType: isOverdue ? 25 : 24, // Using appropriate notification type numbers
      actorId: Number(freelancerId),
      targetId: Number(invoice.commissionerId),
      entityType: 2, // INVOICE entity type
      entityId: String(invoiceNumber),
      metadata: {
        freelancerName,
        invoiceAmount: invoice.totalAmount,
        dueDate: invoice.dueDate,
        reminderText: notificationText,
        isOverdue
      },
      context: {
        invoiceNumber,
        projectId: invoice.projectId
      }
    };

    // Add event to notification storage
    NotificationStorage.addEvent(notificationEvent);

    // Save updated invoice data
    await fs.promises.writeFile(INVOICES_PATH, JSON.stringify(invoices, null, 2));

    return NextResponse.json(
      ok({
        entities: {
          invoice: {
            invoiceNumber,
            reminderCount: invoice.reminders.length,
            isOverdue,
            nextReminderAllowedAt: new Date(now.getTime() + (invoice.reminders.length < 2 ? 48 : 72) * 60 * 60 * 1000).toISOString(),
          },
        },
        refreshHints: [
          RefreshHints.INVOICES_LIST,
          RefreshHints.INVOICE_DETAIL,
          RefreshHints.NOTIFICATIONS,
        ],
        notificationsQueued: true,
        message: 'Reminder sent successfully',
      })
    );

  } catch (error) {
    console.error('Error sending invoice reminder:', error);
    return NextResponse.json(
      err({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal server error',
        status: 500,
      }),
      { status: 500 }
    );
  }
}
