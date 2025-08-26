'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../../../../ui/button';
import { Download, Send, CornerUpLeft } from 'lucide-react';

type Props = {
  invoiceData: any;
  onSend: () => void;
  onDownload: () => void;
  sending?: boolean;
  disabled?: boolean;
};

export default function InvoiceActionsBar({ invoiceData, onSend, onDownload, sending = false, disabled = false }: Props) {
  const router = useRouter();

  console.log('[INVOICE_ACTIONS_BAR] Rendering with props:', {
    invoiceNumber: invoiceData?.invoiceNumber,
    sending,
    disabled,
    hasOnSend: !!onSend,
    hasOnDownload: !!onDownload,
    invoiceStatus: invoiceData?.status
  });

  const handleBack = () => {
    if (!invoiceData?.invoiceNumber) {
      console.warn('⚠️ Missing invoice number for back navigation');
      return;
    }

    router.push(
      `/freelancer-dashboard/projects-and-invoices/create-invoice?pageState=resume&invoiceNumber=${invoiceData.invoiceNumber}`
    );
  };

  // Determine if send button should be disabled
  const isSendDisabled = sending || disabled || (invoiceData?.status && invoiceData.status.toLowerCase() !== 'draft');

  // Get button text based on status
  const getButtonText = () => {
    if (sending) return 'Sending...';
    if (invoiceData?.status === 'sent') return 'Already Sent';
    if (invoiceData?.status === 'paid') return 'Already Paid';
    if (invoiceData?.status === 'on hold') return 'On Hold';
    if (invoiceData?.status === 'cancelled') return 'Cancelled';
    return 'Send Invoice';
  };

  return (
    <div className="pt-8 border-t border-zinc-200 w-full max-w-md mx-auto space-y-5">
      {/* Send Invoice */}
      <div className="w-full">
        {/* Security Warning for non-draft invoices */}
        {invoiceData?.status && invoiceData.status.toLowerCase() !== 'draft' && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ This invoice has status: <strong>{invoiceData.status}</strong>. No further actions are allowed.
            </p>
          </div>
        )}

        <Button
          onClick={() => {
            if (isSendDisabled) {
              console.log('[INVOICE_ACTIONS_BAR] Send button clicked but disabled - status:', invoiceData?.status);
              return;
            }
            console.log('[INVOICE_ACTIONS_BAR] Send button clicked');
            onSend();
          }}
          variant="primary"
          disabled={isSendDisabled}
          className={`w-full px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            isSendDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {getButtonText()}
            </>
          )}
        </Button>
      </div>

      {/* Back & Download buttons */}
      <div className="flex flex-row gap-3 w-full">
        <Button
          onClick={handleBack}
          variant="secondary"
          className="w-1/2 px-3 py-2 text-xs flex items-center justify-center gap-1 rounded-xl"
        >
          <CornerUpLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={onDownload}
          variant="secondary"
          className="w-1/2 px-3 py-2 text-xs flex items-center justify-center gap-1 rounded-xl"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>
    </div>
  );
}