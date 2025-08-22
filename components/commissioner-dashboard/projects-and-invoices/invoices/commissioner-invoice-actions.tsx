'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSuccessToast, useErrorToast } from '@/components/ui/toast';
import InvoicePaymentActionsBar from '../invoice/invoice-payment-actions-bar';

interface CommissionerInvoiceActionsProps {
  invoiceData: any;
  invoiceNumber: string;
}

export default function CommissionerInvoiceActions({ 
  invoiceData, 
  invoiceNumber 
}: CommissionerInvoiceActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [isPayable, setIsPayable] = useState(false);
  const [amountDue, setAmountDue] = useState(0);
  
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  useEffect(() => {
    if (!invoiceData || !session?.user?.id) return;

    const sessionUserId = parseInt(session.user.id);
    const isOwner = invoiceData.commissionerId === sessionUserId;
    const isUnpaid = invoiceData.status !== 'paid' && invoiceData.status !== 'cancelled' && invoiceData.status !== 'void';
    const hasAmount = (invoiceData.totalAmount || 0) > 0;
    const isValidStatus = ['sent', 'draft'].includes(invoiceData.status);
    
    // Calculate amount due (handle partial payments if they exist)
    const totalAmount = invoiceData.totalAmount || 0;
    const paidAmount = invoiceData.paidAmount || 0;
    const calculatedAmountDue = totalAmount - paidAmount;
    
    const shouldShowPayButton = isOwner && isUnpaid && isValidStatus && calculatedAmountDue > 0;
    
    setIsPayable(shouldShowPayButton);
    setAmountDue(calculatedAmountDue);

    // Log invoice view event
    if (shouldShowPayButton) {
      console.log(`[INVOICE_VIEW_PAYABLE] ${JSON.stringify({
        invoiceNumber,
        projectId: invoiceData.projectId,
        amount_due: calculatedAmountDue,
        approved_tasks: (invoiceData.milestones || []).filter((m: any) => m.approvedAt || m.taskId === 'upfront').length
      })}`);
    }

    // Log resume draft event if applicable
    if (invoiceData.status === 'draft' && shouldShowPayButton) {
      console.log(`[INVOICE_RESUME_DRAFT] ${JSON.stringify({
        invoiceNumber,
        projectId: invoiceData.projectId,
        amount_due: calculatedAmountDue,
        approved_tasks: (invoiceData.milestones || []).filter((m: any) => m.approvedAt || m.taskId === 'upfront').length
      })}`);
    }
  }, [invoiceData, session, invoiceNumber]);

  const handlePayInvoice = async () => {
    if (!invoiceData || !session?.user?.id) {
      showErrorToast('Payment Failed', 'Missing invoice data or user session');
      return;
    }

    console.log('[PAYINV:UI:NAVIGATE] Processing payment for invoice:', invoiceNumber);
    setPaying(true);
    
    try {
      const response = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceData.invoiceNumber,
          commissionerId: session.user.id,
          amount: amountDue
        })
      });

      if (response.ok) {
        showSuccessToast('Payment Successful', 'Payment processed successfully!');
        // Refresh the page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await response.json();
        showErrorToast('Payment Failed', error.error || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showErrorToast('Payment Failed', 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadInvoice = () => {
    console.log('Download invoice functionality to be implemented');
  };

  // Don't render anything if not payable
  if (!isPayable) {
    return null;
  }

  return (
    <InvoicePaymentActionsBar
      invoiceData={{
        ...invoiceData,
        totalAmount: amountDue // Use amount due for display
      }}
      onPay={handlePayInvoice}
      onDownload={handleDownloadInvoice}
      loading={paying}
    />
  );
}
