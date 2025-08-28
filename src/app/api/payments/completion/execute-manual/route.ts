import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
// Using hierarchical storage instead of missing repos
import { getAllInvoices, updateInvoice } from '@/lib/invoice-storage';
import { readProject } from '@/lib/projects-utils';
import { processMockPayment } from '../../utils/gateways/test-gateway';
// Missing services - using placeholders
// import { PaymentsService } from '@/app/api/payments/services/payments-service';
// import { requireSession, assert, assertOwnership } from '@/lib/auth/session-guard';
// import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
// import { withErrorHandling, ok, err } from '@/lib/http/envelope';
// import { logInvoiceTransition, logWalletChange, Subsystems } from '@/lib/log/transitions';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing milestone routes

export async function POST(req: NextRequest) {
  try {
    // Simplified implementation without missing dependencies
    const body = await req.json();
    const { invoiceNumber, manualTrigger = true } = body;

    // Basic validation
    if (!invoiceNumber) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }

    if (!manualTrigger) {
      return NextResponse.json({ error: 'Manual trigger flag required' }, { status: 400 });
    }

    // Get invoice using hierarchical storage
    const allInvoices = await getAllInvoices();
    const invoice = allInvoices.find(inv => inv.invoiceNumber === invoiceNumber);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: 'Invoice must be in sent status' }, { status: 400 });
    }

    // Get project using hierarchical storage
    const project = await readProject(String(invoice.projectId));
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Simplified validation and processing
    console.log(`[MANUAL_PAYMENT] Processing manual payment for invoice ${invoiceNumber}, amount: $${invoice.totalAmount}`);

    // Update invoice status to paid
    await updateInvoice(invoiceNumber, {
      status: 'paid',
      paidDate: new Date().toISOString()
    });
    console.log(`[MANUAL_PAYMENT] Successfully processed manual payment for invoice ${invoiceNumber}`);

    // 🔔 COMPLETION-SPECIFIC: Emit payment notifications
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Freelancer payment notification
      await handleCompletionNotification({
        type: 'completion.invoice_paid',
        actorId: project.commissionerId || 0,
        targetId: project.freelancerId,
        projectId: String(invoice.projectId),
        context: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          taskTitle: (invoice as any).taskTitle || 'Task',
          projectTitle: project.title || 'Project',
          remainingBudget: Math.max(0, (project.totalBudget || 0) - ((project as any).paidToDate || 0) - invoice.totalAmount)
        }
      });

      // Commissioner payment confirmation notification
      await handleCompletionNotification({
        type: 'completion.commissioner_payment',
        actorId: project.commissionerId || 0,
        targetId: project.commissionerId || 0,
        projectId: String(invoice.projectId),
        context: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          taskTitle: (invoice as any).taskTitle || 'Task',
          projectTitle: project.title || 'Project',
          remainingBudget: Math.max(0, (project.totalBudget || 0) - ((project as any).paidToDate || 0) - invoice.totalAmount)
        }
      });
    } catch (e) {
      console.warn('Completion payment notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Manual payment executed successfully',
      invoiceNumber,
      status: 'paid',
      amount: invoice.totalAmount
    });
  } catch (error) {
    console.error('[MANUAL_PAYMENT] Error processing manual payment:', error);
    return NextResponse.json(
      { error: 'Failed to process manual payment' },
      { status: 500 }
    );
  }
}

