'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSuccessToast, useErrorToast } from '@/components/ui/toast';
import InvoicePaymentActionsBar from '../invoice/invoice-payment-actions-bar';

interface PayInvoiceClientActionsProps {
  invoiceData: any;
  invoiceNumber: string;
}

export default function PayInvoiceClientActions({ 
  invoiceData, 
  invoiceNumber 
}: PayInvoiceClientActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

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
          amount: invoiceData.totalAmount
        })
      });

      if (response.ok) {
        showSuccessToast('Payment Successful', 'Payment processed successfully!');
        // Navigate back to project list after successful payment
        setTimeout(() => {
          router.push('/commissioner-dashboard/projects-and-invoices/project-list');
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

  return (
    <InvoicePaymentActionsBar
      invoiceData={invoiceData}
      onPay={handlePayInvoice}
      onDownload={handleDownloadInvoice}
      loading={paying}
    />
  );
}
