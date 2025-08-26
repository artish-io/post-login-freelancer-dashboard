import { NextResponse } from 'next/server';
import { getAllInvoices } from '@/lib/invoice-storage';
import { requireAdminAuth } from '@/lib/admin-auth';

/**
 * Platform Fees Data API
 * 
 * Provides comprehensive data about all platform fee deductions across
 * project invoices, storefront sales, and paywall subscriptions
 */

interface PlatformFeeData {
  invoiceNumber: string;
  projectId: string;
  projectTitle: string;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
  paidDate: string;
  invoicingMethod: 'milestone' | 'completion';
  type: 'project-invoice' | 'storefront' | 'paywall-subscription';
}

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return the error response
    }

    console.log('📊 Fetching platform fees data...');
    
    // Load all invoices
    const invoices = await getAllInvoices();
    
    // Filter for paid invoices with platform fees
    const paidInvoicesWithFees = invoices.filter((inv: any) => 
      inv.status === 'paid' && 
      inv.paymentDetails?.platformFee && 
      inv.paymentDetails.platformFee > 0
    );

    console.log(`Found ${paidInvoicesWithFees.length} paid invoices with platform fees`);

    // Transform invoice data to platform fee data
    const projectInvoiceFees: PlatformFeeData[] = paidInvoicesWithFees.map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber,
      projectId: inv.projectId?.toString() || 'N/A',
      projectTitle: inv.projectTitle || 'Untitled Project',
      freelancerId: inv.freelancerId,
      commissionerId: inv.commissionerId,
      totalAmount: inv.totalAmount,
      platformFee: inv.paymentDetails.platformFee,
      freelancerAmount: inv.paymentDetails.freelancerAmount,
      paidDate: inv.paidDate || inv.paymentDetails?.processedAt?.split('T')[0] || 'Unknown',
      invoicingMethod: inv.invoicingMethod || (inv.invoiceType === 'auto_milestone' ? 'milestone' : 'completion'),
      type: 'project-invoice' as const
    }));

    // Sort by paid date (most recent first)
    projectInvoiceFees.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());

    // TODO: Add storefront fees when storefront system is implemented
    const storefrontFees: PlatformFeeData[] = [];

    // TODO: Add paywall subscription fees when paywall system is implemented
    const paywallFees: PlatformFeeData[] = [];

    // Combine all platform fees
    const allPlatformFees = [...projectInvoiceFees, ...storefrontFees, ...paywallFees];

    // Calculate summary statistics
    const totalRevenue = allPlatformFees.reduce((sum, fee) => sum + fee.platformFee, 0);
    const projectInvoiceRevenue = projectInvoiceFees.reduce((sum, fee) => sum + fee.platformFee, 0);
    const storefrontRevenue = storefrontFees.reduce((sum, fee) => sum + fee.platformFee, 0);
    const paywallRevenue = paywallFees.reduce((sum, fee) => sum + fee.platformFee, 0);
    const totalTransactions = allPlatformFees.length;
    const averageFee = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Additional analytics
    const milestoneInvoices = projectInvoiceFees.filter(fee => fee.invoicingMethod === 'milestone');
    const completionInvoices = projectInvoiceFees.filter(fee => fee.invoicingMethod === 'completion');
    
    const analytics = {
      byInvoicingMethod: {
        milestone: {
          count: milestoneInvoices.length,
          totalRevenue: milestoneInvoices.reduce((sum, fee) => sum + fee.platformFee, 0),
          averageFee: milestoneInvoices.length > 0 ? milestoneInvoices.reduce((sum, fee) => sum + fee.platformFee, 0) / milestoneInvoices.length : 0
        },
        completion: {
          count: completionInvoices.length,
          totalRevenue: completionInvoices.reduce((sum, fee) => sum + fee.platformFee, 0),
          averageFee: completionInvoices.length > 0 ? completionInvoices.reduce((sum, fee) => sum + fee.platformFee, 0) / completionInvoices.length : 0
        }
      },
      recentActivity: {
        last30Days: projectInvoiceFees.filter(fee => {
          const feeDate = new Date(fee.paidDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return feeDate >= thirtyDaysAgo;
        }).length,
        last7Days: projectInvoiceFees.filter(fee => {
          const feeDate = new Date(fee.paidDate);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return feeDate >= sevenDaysAgo;
        }).length
      }
    };

    console.log(`📈 Platform fees summary: Total Revenue: $${totalRevenue.toFixed(2)}, Transactions: ${totalTransactions}`);

    return NextResponse.json({
      success: true,
      platformFees: allPlatformFees,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        projectInvoiceRevenue: Math.round(projectInvoiceRevenue * 100) / 100,
        storefrontRevenue: Math.round(storefrontRevenue * 100) / 100,
        paywallRevenue: Math.round(paywallRevenue * 100) / 100,
        totalTransactions,
        averageFee: Math.round(averageFee * 100) / 100
      },
      analytics,
      breakdown: {
        projectInvoices: {
          count: projectInvoiceFees.length,
          revenue: Math.round(projectInvoiceRevenue * 100) / 100,
          feeRate: '5.2666%'
        },
        storefront: {
          count: storefrontFees.length,
          revenue: Math.round(storefrontRevenue * 100) / 100,
          feeRate: '30%',
          status: 'Not implemented'
        },
        paywall: {
          count: paywallFees.length,
          revenue: Math.round(paywallRevenue * 100) / 100,
          feeRate: 'Variable',
          status: 'Not implemented'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching platform fees data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch platform fees data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
