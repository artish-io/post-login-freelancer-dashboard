import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readJson, writeJsonAtomic, fileExists } from '../../../../lib/fs-json';

/**
 * TEST ENDPOINT: Pay invoice (bypasses authentication for testing)
 * This endpoint simulates invoice payment for completion invoicing testing
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing and should be removed in production
 */

interface Invoice {
  invoiceNumber: string;
  projectId: number;
  freelancerId: number;
  method?: 'completion' | 'milestone';
  type?: 'upfront' | 'completion' | 'auto_milestone';
  amount?: number;
  totalAmount?: number;
  status: 'unpaid' | 'paid' | 'sent';
  issuedAt?: string;
  issueDate?: string;
  paidDate?: string;
  paymentDetails?: {
    paymentId: string;
    paymentMethod: string;
    platformFee: number;
    freelancerAmount: number;
    currency: string;
    processedAt: string;
  };
}

async function findInvoice(invoiceNumber: string): Promise<Invoice | null> {
  try {
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const currentDate = new Date();
    const year = currentDate.getFullYear();

    // Check current year and previous year
    for (const checkYear of [year, year - 1]) {
      const yearPath = path.join(invoicesDir, String(checkYear));
      if (!await fileExists(yearPath)) continue;

      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const monthPath = path.join(yearPath, monthStr);
        if (!await fileExists(monthPath)) continue;

        for (let day = 1; day <= 31; day++) {
          const dayStr = String(day).padStart(2, '0');
          const invoicePath = path.join(monthPath, dayStr, `${invoiceNumber}.json`);

          if (await fileExists(invoicePath)) {
            const invoice = await readJson<Invoice>(invoicePath, {} as Invoice);
            return { ...invoice, filePath: invoicePath } as Invoice & { filePath: string };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding invoice:', error);
    return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const {
      invoiceNumber,
      commissionerId,
      amount,
      paymentMethodId = 'test_payment_method',
      currency = 'USD'
    } = await req.json();

    console.log('🧪 TEST: Processing payment for invoice:', invoiceNumber);

    // Validate required fields
    if (!invoiceNumber || !commissionerId || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: invoiceNumber, commissionerId, amount'
      }, { status: 400 });
    }

    // Find the invoice
    const invoiceWithPath = await findInvoice(invoiceNumber) as Invoice & { filePath?: string };
    if (!invoiceWithPath) {
      return NextResponse.json({
        success: false,
        error: `Invoice ${invoiceNumber} not found`
      }, { status: 404 });
    }

    const invoice = invoiceWithPath;

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Invoice is already paid'
      }, { status: 400 });
    }

    // Get invoice amount (handle both amount and totalAmount fields)
    const invoiceAmount = invoice.totalAmount || invoice.amount || 0;

    // Validate payment amount matches invoice amount
    if (Math.abs(amount - invoiceAmount) > 0.01) {
      return NextResponse.json({
        success: false,
        error: 'Payment amount does not match invoice amount',
        expected: invoiceAmount,
        received: amount
      }, { status: 400 });
    }

    // SIMULATION: Process payment
    const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const platformFee = Math.round(invoiceAmount * 0.05 * 100) / 100; // 5% platform fee
    const freelancerAmount = Math.round((invoiceAmount - platformFee) * 100) / 100;

    // Update invoice status to 'paid'
    const updatedInvoice: Invoice = {
      ...invoice,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentDetails: {
        paymentId: simulatedPaymentId,
        paymentMethod: 'simulation',
        platformFee: platformFee,
        freelancerAmount: freelancerAmount,
        currency: currency,
        processedAt: new Date().toISOString()
      }
    };

    // Remove filePath before saving
    const { filePath, ...invoiceToSave } = updatedInvoice as any;

    // Save updated invoice
    if (invoiceWithPath.filePath) {
      await writeJsonAtomic(invoiceWithPath.filePath, invoiceToSave);
    }

    // Credit freelancer wallet
    try {
      const { creditWallet } = await import('@/lib/wallets/wallet-store');
      await creditWallet(invoice.freelancerId, freelancerAmount, currency);
      console.log(`💰 Credited freelancer ${invoice.freelancerId} wallet with $${freelancerAmount}`);
    } catch (walletError) {
      console.error('Error crediting freelancer wallet:', walletError);
      // Continue with payment success even if wallet crediting fails
    }

    console.log('✅ TEST: Payment processed successfully:', {
      paymentId: simulatedPaymentId,
      amount: amount,
      freelancerAmount: freelancerAmount,
      platformFee: platformFee
    });

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully (SIMULATION MODE)',
      paymentId: simulatedPaymentId,
      invoiceNumber,
      amountPaid: amount,
      freelancerAmount: freelancerAmount,
      platformFee: platformFee,
      currency: currency
    });

  } catch (error) {
    console.error('❌ TEST: Error processing payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process payment',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
