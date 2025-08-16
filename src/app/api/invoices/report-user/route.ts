import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

const ESCALATION_LOG_PATH = path.join(process.cwd(), 'data', 'invoices-log', 'overdue-invoice-escalation.json');
const INVOICES_PATH = path.join(process.cwd(), 'data', 'invoices.json');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNumber, freelancerId, commissionerId, reason } = body;

    if (!invoiceNumber || !freelancerId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Read current data
    const [escalationData, invoicesData, users] = await Promise.all([
      fs.promises.readFile(ESCALATION_LOG_PATH, 'utf-8'),
      fs.promises.readFile(INVOICES_PATH, 'utf-8'),
      getAllUsers()
    ]);

    const escalations = JSON.parse(escalationData);
    const invoices = JSON.parse(invoicesData);

    // Find the invoice
    const invoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice is overdue and has reminders
    if (invoice.status !== 'overdue') {
      return NextResponse.json({ 
        error: 'Can only report users for overdue invoices' 
      }, { status: 400 });
    }

    if (!invoice.reminders || invoice.reminders.length < 2) {
      return NextResponse.json({ 
        error: 'Must send at least 2 reminders before reporting user' 
      }, { status: 400 });
    }

    // Check 72-hour cooldown for reporting
    const now = new Date();
    const existingReports = escalations.filter((esc: any) => 
      esc.invoiceNumber === invoiceNumber && esc.freelancerId === freelancerId
    );

    if (existingReports.length > 0) {
      const lastReport = existingReports[existingReports.length - 1];
      const lastReportDate = new Date(lastReport.reportedAt);
      const hoursSinceLastReport = (now.getTime() - lastReportDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastReport < 72) {
        return NextResponse.json({ 
          error: `Must wait 72 hours between reports. ${Math.ceil(72 - hoursSinceLastReport)} hours remaining.`,
          hoursRemaining: Math.ceil(72 - hoursSinceLastReport)
        }, { status: 429 });
      }
    }

    // Get user details
    const freelancer = users.find((user: any) => user.id === freelancerId);
    const commissioner = users.find((user: any) => user.id === commissionerId);

    // Create escalation report
    const escalationReport = {
      id: escalations.length > 0 ? Math.max(...escalations.map((esc: any) => esc.id || 0)) + 1 : 1,
      invoiceNumber: invoiceNumber,
      freelancerId: freelancerId,
      freelancerName: freelancer?.name || 'Unknown',
      freelancerEmail: freelancer?.email || 'Unknown',
      commissionerId: commissionerId,
      commissionerName: commissioner?.name || 'Unknown',
      commissionerEmail: commissioner?.email || 'Unknown',
      projectTitle: invoice.projectTitle || 'Unknown Project',
      milestoneDescription: invoice.milestoneDescription || 'Unknown Milestone',
      invoiceAmount: invoice.totalAmount || 0,
      invoiceIssueDate: invoice.issueDate,
      invoiceDueDate: invoice.dueDate,
      daysPastDue: Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      reminderCount: invoice.reminders?.length || 0,
      lastReminderSent: invoice.lastReminderSent,
      reason: reason || 'Non-payment of overdue invoice',
      reportedAt: now.toISOString(),
      status: 'pending_review',
      notes: `Freelancer ${freelancer?.name} reported commissioner ${commissioner?.name} for non-payment of invoice ${invoiceNumber}. Invoice is ${Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue with ${invoice.reminders?.length || 0} reminders sent.`
    };

    escalations.push(escalationReport);

    // Update invoice with escalation flag
    const invoiceIndex = invoices.findIndex((inv: any) => inv.invoiceNumber === invoiceNumber);
    if (invoiceIndex !== -1) {
      if (!invoices[invoiceIndex].escalations) {
        invoices[invoiceIndex].escalations = [];
      }
      invoices[invoiceIndex].escalations.push({
        reportedAt: now.toISOString(),
        reportId: escalationReport.id
      });
    }

    // Save updated data
    await Promise.all([
      fs.promises.writeFile(ESCALATION_LOG_PATH, JSON.stringify(escalations, null, 2)),
      fs.promises.writeFile(INVOICES_PATH, JSON.stringify(invoices, null, 2))
    ]);

    return NextResponse.json({
      success: true,
      message: 'User reported successfully',
      reportId: escalationReport.id,
      nextReportAllowedAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Error reporting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
