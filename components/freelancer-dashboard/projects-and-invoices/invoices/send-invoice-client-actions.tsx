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

    // SECURITY CHECK: Prevent sending non-draft invoices
    if (invoiceData.status && invoiceData.status.toLowerCase() !== 'draft') {
      showErrorToast('Action Not Allowed', `Cannot send invoice with status: ${invoiceData.status}`);
      console.log('[SECURITY] Prevented sending non-draft invoice:', {
        invoiceNumber,
        status: invoiceData.status,
        userId: session.user.id
      });
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
          // Check if this is a completion project invoice
          const isCompletionInvoice = invoiceData.invoiceType?.includes('completion') ||
                                    invoiceData.invoiceType === 'auto_completion' ||
                                    invoiceData.projectInvoicingMethod === 'completion';

          console.log('[NAVIGATION] Invoice type detection:', {
            invoiceType: invoiceData.invoiceType,
            projectInvoicingMethod: invoiceData.projectInvoicingMethod,
            isCompletionInvoice,
            projectId: invoiceData.projectId
          });

          if (isCompletionInvoice) {
            // For completion projects, navigate to project tracking
            const projectTrackingUrl = `/freelancer-dashboard/projects-and-invoices/project-tracking/${invoiceData.projectId}`;
            console.log('[NAVIGATION] Completion project - redirecting to project tracking:', projectTrackingUrl);
            try {
              router.push(projectTrackingUrl);
              console.log('[NAVIGATION] Project tracking navigation initiated successfully');
            } catch (navError) {
              console.error('[NAVIGATION] Project tracking navigation failed:', navError);
              showErrorToast('Navigation Failed', 'Could not return to project tracking. Please navigate manually.');
            }
          } else {
            // For milestone projects, navigate to invoices list
            console.log('[NAVIGATION] Milestone project - redirecting to invoices list');
            try {
              router.push('/freelancer-dashboard/projects-and-invoices/invoices');
              console.log('[NAVIGATION] Invoices list navigation initiated successfully');
            } catch (navError) {
              console.error('[NAVIGATION] Invoices list navigation failed:', navError);
              showErrorToast('Navigation Failed', 'Could not return to invoices list. Please navigate manually.');
            }
          }
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

  // Determine if actions should be disabled based on invoice status
  const isNonDraftStatus = invoiceData?.status && invoiceData.status.toLowerCase() !== 'draft';

  return (
    <InvoiceActionsBar
      invoiceData={invoiceData}
      onSend={handleSendInvoice}
      onDownload={() => console.log('Download PDF')}
      sending={sending}
      disabled={isNonDraftStatus}
    />
  );
}
