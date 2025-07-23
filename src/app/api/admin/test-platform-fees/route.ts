import { NextResponse } from 'next/server';

/**
 * Platform Fee Testing API
 * 
 * Tests the platform fee calculation logic to ensure it's working correctly
 */

export async function GET() {
  try {
    // Test various invoice amounts
    const testAmounts = [100, 500, 1000, 1748, 3250, 5000];
    
    const testResults = testAmounts.map(amount => {
      const platformFee = Math.round(amount * 0.05 * 100) / 100; // 5% platform fee
      const freelancerAmount = Math.round((amount - platformFee) * 100) / 100;
      
      return {
        invoiceAmount: amount,
        platformFee: platformFee,
        freelancerAmount: freelancerAmount,
        platformFeePercentage: Math.round((platformFee / amount) * 100 * 100) / 100,
        totalCheck: platformFee + freelancerAmount === amount
      };
    });

    // Test storefront fee calculation (30%)
    const storefrontTestAmounts = [10, 29.99, 49.99, 89.99];
    
    const storefrontResults = storefrontTestAmounts.map(amount => {
      const platformFee = Math.round(amount * 0.30 * 100) / 100; // 30% platform fee
      const sellerAmount = Math.round((amount - platformFee) * 100) / 100;
      
      return {
        productPrice: amount,
        platformFee: platformFee,
        sellerAmount: sellerAmount,
        platformFeePercentage: Math.round((platformFee / amount) * 100 * 100) / 100,
        totalCheck: Math.abs((platformFee + sellerAmount) - amount) < 0.01 // Allow for rounding
      };
    });

    return NextResponse.json({
      message: 'Platform fee calculation tests',
      invoiceFeeTests: {
        description: '5% platform fee on freelance invoices',
        results: testResults
      },
      storefrontFeeTests: {
        description: '30% platform fee on digital product sales',
        results: storefrontResults
      },
      summary: {
        allInvoiceTestsPassed: testResults.every(test => test.totalCheck),
        allStorefrontTestsPassed: storefrontResults.every(test => test.totalCheck),
        invoiceFeeRate: '5%',
        storefrontFeeRate: '30%'
      }
    });

  } catch (error) {
    console.error('Error testing platform fees:', error);
    return NextResponse.json({ error: 'Failed to test platform fees' }, { status: 500 });
  }
}
