import { NextResponse } from 'next/server';
import { getAllInvoices, updateInvoice } from '@/lib/invoice-storage';
import { requireAdminAuth } from '@/lib/admin-auth';

/**
 * Retroactive Migration API for Milestone-Based Invoice Platform Fees
 * 
 * This endpoint identifies and updates all existing paid milestone-based invoices
 * to include proper platform fee calculations in their paymentDetails.
 */

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return the error response
    }

    console.log('🔄 Starting retroactive migration for milestone-based invoice platform fees...');
    
    // Load all invoices using hierarchical storage
    const invoices = await getAllInvoices();
    
    // Filter for paid milestone-based invoices that need platform fee updates
    const milestoneInvoices = invoices.filter((inv: any) => {
      const isPaid = inv.status === 'paid';
      const isMilestone = inv.invoicingMethod === 'milestone' || inv.invoiceType === 'auto_milestone';
      const needsUpdate = !inv.paymentDetails || inv.paymentDetails.platformFee === 0 || !inv.paymentDetails.platformFee;
      
      return isPaid && isMilestone && needsUpdate;
    });

    console.log(`📊 Found ${milestoneInvoices.length} milestone-based invoices requiring platform fee updates`);

    let updatedCount = 0;
    let totalPlatformFeesAdded = 0;
    const errors: string[] = [];

    // Process each milestone invoice
    for (const invoice of milestoneInvoices) {
      try {
        // Calculate 5.2666% platform fee
        const platformFee = Math.round(invoice.totalAmount * 0.052666 * 100) / 100;
        const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;

        // Update the invoice with proper payment details
        const updatedPaymentDetails = {
          paymentId: invoice.paymentDetails?.paymentId || 'migrated',
          paymentMethod: invoice.paymentDetails?.paymentMethod || 'milestone',
          platformFee: platformFee,
          freelancerAmount: freelancerAmount,
          currency: invoice.paymentDetails?.currency || 'USD',
          processedAt: invoice.paymentDetails?.processedAt || new Date().toISOString(),
          migratedAt: new Date().toISOString(),
          migrationNote: 'Retroactively added 5.2666% platform fee for milestone-based invoice'
        };

        await updateInvoice(invoice.invoiceNumber, {
          paymentDetails: updatedPaymentDetails,
          updatedAt: new Date().toISOString()
        });

        updatedCount++;
        totalPlatformFeesAdded += platformFee;

        console.log(`✅ Updated invoice ${invoice.invoiceNumber}: $${invoice.totalAmount} → Platform Fee: $${platformFee}, Freelancer: $${freelancerAmount}`);

      } catch (error) {
        const errorMsg = `Failed to update invoice ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Calculate summary statistics
    const totalMilestoneInvoices = invoices.filter((inv: any) => 
      inv.invoicingMethod === 'milestone' || inv.invoiceType === 'auto_milestone'
    ).length;
    
    const paidMilestoneInvoices = invoices.filter((inv: any) => 
      inv.status === 'paid' && (inv.invoicingMethod === 'milestone' || inv.invoiceType === 'auto_milestone')
    ).length;

    const totalMilestoneValue = invoices
      .filter((inv: any) => inv.status === 'paid' && (inv.invoicingMethod === 'milestone' || inv.invoiceType === 'auto_milestone'))
      .reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);

    console.log(`🎉 Migration completed! Updated ${updatedCount} invoices, added $${totalPlatformFeesAdded.toFixed(2)} in platform fees`);

    return NextResponse.json({
      success: true,
      message: 'Milestone invoice platform fee migration completed successfully',
      migration: {
        invoicesProcessed: milestoneInvoices.length,
        invoicesUpdated: updatedCount,
        platformFeesAdded: Math.round(totalPlatformFeesAdded * 100) / 100,
        errors: errors
      },
      summary: {
        totalMilestoneInvoices,
        paidMilestoneInvoices,
        totalMilestoneValue: Math.round(totalMilestoneValue * 100) / 100,
        estimatedPlatformRevenue: Math.round(totalMilestoneValue * 0.052666 * 100) / 100,
        newPlatformFeeRate: '5.2666%'
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return the error response
    }

    // Load invoices using hierarchical storage
    const invoices = await getAllInvoices();

    // Analyze current state of milestone invoices
    const allMilestoneInvoices = invoices.filter((inv: any) => 
      inv.invoicingMethod === 'milestone' || inv.invoiceType === 'auto_milestone'
    );
    
    const paidMilestoneInvoices = allMilestoneInvoices.filter((inv: any) => inv.status === 'paid');
    const milestonesWithFees = paidMilestoneInvoices.filter((inv: any) => inv.paymentDetails?.platformFee > 0);
    const milestonesWithoutFees = paidMilestoneInvoices.filter((inv: any) => !inv.paymentDetails?.platformFee || inv.paymentDetails.platformFee === 0);

    const totalMilestoneValue = paidMilestoneInvoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
    const currentPlatformRevenue = milestonesWithFees.reduce((sum: number, inv: any) => sum + (inv.paymentDetails?.platformFee || 0), 0);
    const missingPlatformRevenue = milestonesWithoutFees.reduce((sum: number, inv: any) => sum + (inv.totalAmount * 0.052666), 0);

    return NextResponse.json({
      analysis: {
        totalMilestoneInvoices: allMilestoneInvoices.length,
        paidMilestoneInvoices: paidMilestoneInvoices.length,
        milestonesWithPlatformFees: milestonesWithFees.length,
        milestonesWithoutPlatformFees: milestonesWithoutFees.length,
        totalMilestoneValue: Math.round(totalMilestoneValue * 100) / 100,
        currentPlatformRevenue: Math.round(currentPlatformRevenue * 100) / 100,
        missingPlatformRevenue: Math.round(missingPlatformRevenue * 100) / 100,
        potentialTotalRevenue: Math.round((currentPlatformRevenue + missingPlatformRevenue) * 100) / 100
      },
      needsMigration: milestonesWithoutFees.length > 0,
      platformFeeRate: '5.2666%',
      message: milestonesWithoutFees.length > 0 
        ? `${milestonesWithoutFees.length} milestone invoices need platform fee migration`
        : 'All milestone invoices have proper platform fees applied'
    });

  } catch (error) {
    console.error('Error analyzing milestone invoices:', error);
    return NextResponse.json({ error: 'Failed to analyze milestone invoices' }, { status: 500 });
  }
}
