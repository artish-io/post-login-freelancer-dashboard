import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Invoice Fee Migration API
 * 
 * This endpoint backfills platform fee calculations for all paid invoices
 * that are missing paymentDetails. Ensures all transactions have proper
 * 5% platform fee deductions.
 */

export async function POST() {
  try {
    const invoicesPath = path.join(process.cwd(), 'data/invoices.json');
    
    // Load invoices
    const invoicesFile = await fs.readFile(invoicesPath, 'utf-8');
    const invoices = JSON.parse(invoicesFile);

    let updatedCount = 0;
    let totalPlatformFees = 0;

    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      
      // Only process paid invoices that don't have paymentDetails
      if (invoice.status === 'paid' && !invoice.paymentDetails) {
        // Calculate 5% platform fee
        const platformFee = Math.round(invoice.totalAmount * 0.05 * 100) / 100;
        const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;
        
        // Add payment details
        invoices[i].paymentDetails = {
          paymentId: `pay_migrated_${invoice.invoiceNumber}`,
          paymentMethod: 'stripe', // Default to stripe for historical data
          platformFee: platformFee,
          freelancerAmount: freelancerAmount,
          currency: 'USD',
          processedAt: invoice.paidDate ? `${invoice.paidDate}T12:00:00Z` : new Date().toISOString(),
          migrated: true // Flag to indicate this was backfilled
        };

        // Ensure paidDate exists
        if (!invoices[i].paidDate) {
          // Use issue date + 7 days as estimated paid date
          const issueDate = new Date(invoice.issueDate);
          issueDate.setDate(issueDate.getDate() + 7);
          invoices[i].paidDate = issueDate.toISOString().split('T')[0];
        }

        updatedCount++;
        totalPlatformFees += platformFee;
      }
    }

    // Save updated invoices
    await fs.writeFile(invoicesPath, JSON.stringify(invoices, null, 2));

    // Calculate summary statistics
    const allPaidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalInvoiceValue = allPaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPlatformRevenue = allPaidInvoices.reduce((sum, inv) => sum + (inv.paymentDetails?.platformFee || 0), 0);
    const totalFreelancerPayouts = allPaidInvoices.reduce((sum, inv) => sum + (inv.paymentDetails?.freelancerAmount || 0), 0);

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
    const invoicesPath = path.join(process.cwd(), 'data/invoices.json');
    
    // Load invoices
    const invoicesFile = await fs.readFile(invoicesPath, 'utf-8');
    const invoices = JSON.parse(invoicesFile);

    // Analyze current state
    const allInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const paidWithFees = paidInvoices.filter(inv => inv.paymentDetails);
    const paidWithoutFees = paidInvoices.filter(inv => !inv.paymentDetails);

    const totalInvoiceValue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const currentPlatformRevenue = paidWithFees.reduce((sum, inv) => sum + (inv.paymentDetails?.platformFee || 0), 0);
    const missingPlatformRevenue = paidWithoutFees.reduce((sum, inv) => sum + (inv.totalAmount * 0.05), 0);

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
      invoicesNeedingMigration: paidWithoutFees.map(inv => ({
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
