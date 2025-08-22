'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSuccessToast, useErrorToast } from '@/components/ui/toast';
import InvoiceActionsBar from './invoice-preview/invoice-actions-bar';

interface SendInvoiceClientActionsProps {
  invoiceData: any;
  invoiceNumber: string;
}

export default function SendInvoiceClientActions({
  invoiceData,
  invoiceNumber
}: SendInvoiceClientActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const handleSendInvoice = async () => {
    if (!invoiceData || !session?.user?.id) {
      showErrorToast('Send Failed', 'Missing invoice data or user session');
      return;
    }

    console.log('[INVGEN:UI:NAVIGATE] Sending invoice:', invoiceNumber);
    setSending(true);
    
    try {
      const sendData = {
        invoiceNumber: invoiceData.invoiceNumber,
        freelancerId: Number(session.user.id),
        commissionerId: invoiceData.commissionerId
      };

      const sendRes = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      });

      const sendResult = await sendRes.json();

      if (sendRes.ok) {
        showSuccessToast('Invoice Sent', 'Invoice sent successfully!');
        setTimeout(() => {
          router.push('/freelancer-dashboard/projects-and-invoices/invoices');
        }, 2000);
      } else {
        throw new Error(sendResult.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      showErrorToast('Send Failed', `Failed to send invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <InvoiceActionsBar
      invoiceData={invoiceData}
      onSend={handleSendInvoice}
      onDownload={() => console.log('Download PDF')}
      sending={sending}
    />
  );
}
