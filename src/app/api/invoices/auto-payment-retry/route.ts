import { NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice } from '@/lib/invoice-storage';
import { AUTO_MILESTONE_CONFIG, isValidStatusTransition } from '@/lib/invoice-status-definitions';

/**
 * Auto-Payment Retry System for Milestone Invoices
 * 
 * This endpoint handles automatic retry of failed milestone payments.
 * It should be called by a cron job or scheduled task every day.
 * 
 * Business Logic:
 * 1. Find all 'on_hold' invoices that are ready for retry
 * 2. Attempt automatic payment processing
 * 3. If payment succeeds, mark as 'paid'
 * 4. If payment fails and retry limit reached, keep as 'on_hold' for manual intervention
 * 5. If payment fails but retries remain, schedule next retry
 */

export async function POST(request: Request) {
  try {
    console.log('🔄 Starting auto-payment retry process...');

    // Get all invoices that are on hold and ready for retry
    const allInvoices = await getAllInvoices();
    const onHoldInvoices = allInvoices.filter(invoice => 
      invoice.status === 'on_hold' && 
      invoice.invoiceType === 'auto_milestone'
    );

    console.log(`📊 Found ${onHoldInvoices.length} on-hold milestone invoices`);

    const now = new Date();
    const retryResults = [];

    for (const invoice of onHoldInvoices) {
      const invoiceNumber = invoice.invoiceNumber;
      const attempts = invoice.autoPaymentAttempts || 0;
      const nextRetryDate = invoice.nextRetryDate ? new Date(invoice.nextRetryDate) : null;

      // Check if it's time to retry
      if (nextRetryDate && now < nextRetryDate) {
        console.log(`⏳ Invoice ${invoiceNumber}: Not yet time to retry (next: ${nextRetryDate.toISOString()})`);
        continue;
      }

      // Check if retry limit exceeded
      if (attempts >= AUTO_MILESTONE_CONFIG.retryAttempts) {
        console.log(`⚠️ Invoice ${invoiceNumber}: Retry limit exceeded (${attempts}/${AUTO_MILESTONE_CONFIG.retryAttempts})`);
        retryResults.push({
          invoiceNumber,
          status: 'retry_limit_exceeded',
          message: 'Manual intervention required'
        });
        continue;
      }

      console.log(`🔄 Attempting retry ${attempts + 1}/${AUTO_MILESTONE_CONFIG.retryAttempts} for invoice ${invoiceNumber}`);

      try {
        // Attempt automatic payment processing
        const paymentResult = await attemptAutoPayment(invoice);

        if (paymentResult.success) {
          // Payment succeeded - mark as paid
          const updatedInvoice = {
            ...invoice,
            status: 'paid' as const,
            paidDate: new Date().toISOString().split('T')[0],
            paymentDetails: paymentResult.paymentDetails,
            autoPaymentAttempts: attempts + 1,
            lastPaymentAttempt: new Date().toISOString(),
            nextRetryDate: undefined,
            paymentFailureReason: undefined,
            updatedAt: new Date().toISOString()
          };

          await saveInvoice(updatedInvoice);

          retryResults.push({
            invoiceNumber,
            status: 'payment_successful',
            attempt: attempts + 1,
            amount: invoice.totalAmount
          });

          console.log(`✅ Invoice ${invoiceNumber}: Payment successful on attempt ${attempts + 1}`);

        } else {
          // Payment failed - schedule next retry or mark for manual intervention
          const nextAttempts = attempts + 1;
          const shouldRetry = nextAttempts < AUTO_MILESTONE_CONFIG.retryAttempts;
          
          const updatedInvoice = {
            ...invoice,
            autoPaymentAttempts: nextAttempts,
            lastPaymentAttempt: new Date().toISOString(),
            nextRetryDate: shouldRetry
              ? new Date(Date.now() + AUTO_MILESTONE_CONFIG.retryDelayDays * 24 * 60 * 60 * 1000).toISOString()
              : undefined,
            paymentFailureReason: paymentResult.error,
            updatedAt: new Date().toISOString()
          };

          await saveInvoice(updatedInvoice);

          retryResults.push({
            invoiceNumber,
            status: shouldRetry ? 'retry_scheduled' : 'retry_limit_reached',
            attempt: nextAttempts,
            error: paymentResult.error,
            nextRetry: updatedInvoice.nextRetryDate
          });

          console.log(`❌ Invoice ${invoiceNumber}: Payment failed on attempt ${nextAttempts} - ${paymentResult.error}`);
        }

      } catch (error) {
        console.error(`💥 Invoice ${invoiceNumber}: Retry attempt failed:`, error);
        
        retryResults.push({
          invoiceNumber,
          status: 'retry_error',
          attempt: attempts + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      totalProcessed: retryResults.length,
      successful: retryResults.filter(r => r.status === 'payment_successful').length,
      retryScheduled: retryResults.filter(r => r.status === 'retry_scheduled').length,
      retryLimitReached: retryResults.filter(r => r.status === 'retry_limit_reached').length,
      errors: retryResults.filter(r => r.status === 'retry_error').length
    };

    console.log('📊 Auto-payment retry summary:', summary);

    return NextResponse.json({
      success: true,
      message: 'Auto-payment retry process completed',
      summary,
      results: retryResults
    });

  } catch (error) {
    console.error('❌ Auto-payment retry process failed:', error);
    return NextResponse.json({ 
      error: 'Auto-payment retry process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Attempt automatic payment for a milestone invoice
 * This is a placeholder for actual payment gateway integration
 */
async function attemptAutoPayment(invoice: any): Promise<{
  success: boolean;
  paymentDetails?: any;
  error?: string;
}> {
  try {
    // TODO: Replace with actual payment gateway logic
    // For now, simulate payment attempt with 70% success rate
    const simulatedSuccess = Math.random() > 0.3;

    if (simulatedSuccess) {
      const platformFee = Math.round(invoice.totalAmount * 0.05 * 100) / 100;
      const freelancerAmount = Math.round((invoice.totalAmount - platformFee) * 100) / 100;

      return {
        success: true,
        paymentDetails: {
          paymentId: `auto_retry_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          paymentMethod: 'auto_milestone',
          platformFee,
          freelancerAmount,
          currency: 'USD',
          processedAt: new Date().toISOString()
        }
      };
    } else {
      // Simulate various failure reasons
      const failureReasons = [
        'Insufficient funds',
        'Payment method expired',
        'Bank declined transaction',
        'Network timeout',
        'Commissioner account suspended'
      ];
      
      return {
        success: false,
        error: failureReasons[Math.floor(Math.random() * failureReasons.length)]
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing error'
    };
  }
}

/**
 * Manual trigger endpoint for immediate retry
 */
export async function PUT(request: Request) {
  try {
    const { invoiceNumber } = await request.json();

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'Invoice number required' }, { status: 400 });
    }

    const allInvoices = await getAllInvoices();
    const invoice = allInvoices.find(inv => inv.invoiceNumber === invoiceNumber);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'on_hold') {
      return NextResponse.json({ 
        error: 'Invoice must be on hold to trigger manual retry',
        currentStatus: invoice.status 
      }, { status: 400 });
    }

    console.log(`🔄 Manual retry triggered for invoice ${invoiceNumber}`);

    const paymentResult = await attemptAutoPayment(invoice);

    if (paymentResult.success) {
      const updatedInvoice = {
        ...invoice,
        status: 'paid' as const,
        paidDate: new Date().toISOString().split('T')[0],
        paymentDetails: paymentResult.paymentDetails,
        autoPaymentAttempts: (invoice.autoPaymentAttempts || 0) + 1,
        lastPaymentAttempt: new Date().toISOString(),
        nextRetryDate: undefined,
        paymentFailureReason: undefined,
        updatedAt: new Date().toISOString()
      };

      await saveInvoice(updatedInvoice);

      return NextResponse.json({
        success: true,
        message: 'Manual payment retry successful',
        invoiceNumber,
        status: 'paid',
        amount: invoice.totalAmount
      });

    } else {
      // Update attempt count but don't change status
      const updatedInvoice = {
        ...invoice,
        autoPaymentAttempts: (invoice.autoPaymentAttempts || 0) + 1,
        lastPaymentAttempt: new Date().toISOString(),
        paymentFailureReason: paymentResult.error,
        updatedAt: new Date().toISOString()
      };

      await saveInvoice(updatedInvoice);

      return NextResponse.json({
        success: false,
        message: 'Manual payment retry failed',
        invoiceNumber,
        error: paymentResult.error,
        attempts: updatedInvoice.autoPaymentAttempts
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Manual retry failed:', error);
    return NextResponse.json({ 
      error: 'Manual retry failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
