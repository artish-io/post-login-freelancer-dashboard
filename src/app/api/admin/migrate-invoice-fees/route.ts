import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getAllInvoices, saveInvoice } from '@/lib/invoice-storage';

/**
 * Invoice Fee Migration API
 * 
 * This endpoint backfills platform fee calculations for all paid invoices
 * that are missing paymentDetails. Ensures all transactions have proper
 * 5% platform fee deductions.
 */

export async function POST() {
  try {
    // Load invoices using hierarchical storage
    const invoices = await getAllInvoices();

    let updatedCount = 0;
    let totalPlatformFees = 0;

    // Process each invoice
    for (const invoice of invoices) {
      // Only process paid invoices that don't have paymentDetails
      if (invoice.status === 'paid' && !invoice.paymentDetails) {
        // Calculate 5.2666% platform fee
        const platformFee = Math.round(invoice.totalAmount * 0.052666 * 100) / 100;
        const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;

        // Create updated invoice with payment details
        const updatedInvoice = {
          ...invoice,
          paymentDetails: {
            paymentId: `pay_migrated_${invoice.invoiceNumber}`,
            paymentMethod: 'stripe', // Default to stripe for historical data
            platformFee: platformFee,
            freelancerAmount: freelancerAmount,
            currency: 'USD',
            processedAt: invoice.paidDate ? `${invoice.paidDate}T12:00:00Z` : new Date().toISOString(),
            migrated: true // Flag to indicate this was backfilled
          }
        };

        // Ensure paidDate exists
        if (!updatedInvoice.paidDate) {
          // Use issue date + 7 days as estimated paid date
          const issueDate = new Date(invoice.issueDate);
          issueDate.setDate(issueDate.getDate() + 7);
          updatedInvoice.paidDate = issueDate.toISOString().split('T')[0];
        }

        // Save updated invoice using hierarchical storage
        await saveInvoice(updatedInvoice);

        updatedCount++;
        totalPlatformFees += platformFee;
      }
    }

    // Reload invoices to get updated data for summary
    const updatedInvoices = await getAllInvoices();

    // Calculate summary statistics using updated invoices
    const allPaidInvoices = updatedInvoices.filter((inv: any) => inv.status === 'paid');
    const totalInvoiceValue = allPaidInvoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
    const totalPlatformRevenue = allPaidInvoices.reduce((sum: number, inv: any) => sum + (inv.paymentDetails?.platformFee || 0), 0);
    const totalFreelancerPayouts = allPaidInvoices.reduce((sum: number, inv: any) => sum + (inv.paymentDetails?.freelancerAmount || 0), 0);

    return NextResponse.json({
      success: true,
      message: 'Invoice fee migration completed successfully',
      migration: {
        invoicesUpdated: updatedCount,
        platformFeesAdded: Math.round(totalPlatformFees * 100) / 100
      },
      summary: {
        totalPaidInvoices: allPaidInvoices.length,
        totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100,
        totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
        totalFreelancerPayouts: Math.round(totalFreelancerPayouts * 100) / 100,
        platformFeePercentage: totalInvoiceValue > 0 ? Math.round((totalPlatformRevenue / totalInvoiceValue) * 100 * 100) / 100 : 0
      }
    });

  } catch (error) {
    console.error('Error migrating invoice fees:', error);
    return NextResponse.json({ error: 'Failed to migrate invoice fees' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Load invoices using hierarchical storage
    const invoices = await getAllInvoices();

    // Analyze current state
    const allInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');
    const paidWithFees = paidInvoices.filter((inv: any) => inv.paymentDetails);
    const paidWithoutFees = paidInvoices.filter((inv: any) => !inv.paymentDetails);

    const totalInvoiceValue = paidInvoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
    const currentPlatformRevenue = paidWithFees.reduce((sum: number, inv: any) => sum + (inv.paymentDetails?.platformFee || 0), 0);
    const missingPlatformRevenue = paidWithoutFees.reduce((sum: number, inv: any) => sum + (inv.totalAmount * 0.052666), 0);

    return NextResponse.json({
      analysis: {
        totalInvoices: allInvoices,
        paidInvoices: paidInvoices.length,
        paidWithPlatformFees: paidWithFees.length,
        paidWithoutPlatformFees: paidWithoutFees.length,
        migrationNeeded: paidWithoutFees.length > 0
      },
      revenue: {
        totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100,
        currentPlatformRevenue: Math.round(currentPlatformRevenue * 100) / 100,
        missingPlatformRevenue: Math.round(missingPlatformRevenue * 100) / 100,
        potentialTotalRevenue: Math.round((currentPlatformRevenue + missingPlatformRevenue) * 100) / 100
      },
      invoicesNeedingMigration: paidWithoutFees.map((inv: any) => ({
        invoiceNumber: inv.invoiceNumber,
        projectTitle: inv.projectTitle,
        totalAmount: inv.totalAmount,
        missingPlatformFee: Math.round(inv.totalAmount * 0.05 * 100) / 100
      }))
    });

  } catch (error) {
    console.error('Error analyzing invoice fees:', error);
    return NextResponse.json({ error: 'Failed to analyze invoice fees' }, { status: 500 });
  }
}
