import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { eventLogger } from '../../../../lib/events/event-logger';
import { readProject } from '../../../../lib/projects-utils';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';
import { getInitialInvoiceStatus } from '../../../../lib/invoice-status-definitions';

/**
 * Sync project paidToDate if it's significantly out of sync with actual paid invoices
 */
async function syncProjectPaidToDateIfNeeded(projectId: string): Promise<void> {
  try {
    // Get project and calculate actual paid amount
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const project = await UnifiedStorageService.readProject(projectId);

    if (!project) {
      console.warn(`[SYNC_PAID_TO_DATE] Project ${projectId} not found`);
      return;
    }

    // Calculate total paid from all paid invoices
    const allInvoices = await getAllInvoices({ projectId });
    const totalPaidFromInvoices = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    const currentPaidToDate = project.paidToDate || 0;
    const difference = Math.abs(currentPaidToDate - totalPaidFromInvoices);

    // Only update if there's a significant difference (more than 1 cent)
    if (difference > 0.01) {
      const updatedProject = {
        ...project,
        paidToDate: Math.round(totalPaidFromInvoices * 100) / 100,
        updatedAt: new Date().toISOString()
      };

      await UnifiedStorageService.writeProject(updatedProject);

      console.log(`[SYNC_PAID_TO_DATE] Updated project ${projectId} paidToDate: ${currentPaidToDate} -> ${totalPaidFromInvoices}`);
    }
  } catch (error) {
    console.error(`[SYNC_PAID_TO_DATE] Error syncing project ${projectId}:`, error);
    // Don't throw - this is a best-effort sync
  }
}

/**
 * Auto-Generate Invoice for Completion-Based Projects
 * 
 * This endpoint is called when a task is approved in a completion-based project.
 * It automatically creates an invoice for the approved task based on the project's
 * budget allocation.
 * 
 * PAYMENT GATEWAY INTEGRATION:
 * When payment gateways are integrated, this endpoint should also:
 * 1. Create payment intent in the gateway
 * 2. Generate payment link for commissioner
 * 3. Set up automatic payout to freelancer upon payment
 */

export async function POST(request: Request) {
  try {
    const {
      taskId,
      projectId,
      freelancerId,
      commissionerId,
      taskTitle,
      projectTitle
    } = await request.json();

    if (!taskId || !projectId || !freelancerId || !commissionerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`💰 Auto-generating completion invoice for task ${taskId} in project ${projectId}...`);

    // ✅ ENHANCED: Ensure project paidToDate is synced before generating invoice
    await syncProjectPaidToDateIfNeeded(projectId);

    // Use robust invoice generation service with retry logic
    const { generateInvoiceWithRetry } = await import('../../../../lib/invoices/robust-invoice-service');

    const invoiceRequest = {
      taskId: Number(taskId),
      projectId: projectId,
      freelancerId: Number(freelancerId),
      commissionerId: Number(commissionerId),
      taskTitle: taskTitle || `Task ${taskId}`,
      projectTitle: projectTitle || `Project ${projectId}`,
      invoiceType: 'completion' as const
    };

    const result = await generateInvoiceWithRetry(invoiceRequest);

    if (result.success) {
      console.log(`✅ Invoice generated successfully: ${result.invoiceNumber}`);
      return NextResponse.json({
        success: true,
        invoice: {
          invoiceNumber: result.invoiceNumber,
          amount: result.amount,
          generatedAt: result.generatedAt,
          retryAttempt: result.retryAttempt
        },
        message: `Auto-generated completion invoice ${result.invoiceNumber} for task: ${taskTitle}`
      });
    } else {
      console.error(`❌ Invoice generation failed: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
        retryAttempt: result.retryAttempt
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error auto-generating completion invoice:', error);
    return NextResponse.json({ error: 'Failed to auto-generate invoice' }, { status: 500 });
  }
}
