'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../../../../ui/button';
import { Download, Send, CornerUpLeft } from 'lucide-react';

type Props = {
  invoiceData: any;
  onSend: () => void;
  onDownload: () => void;
  sending?: boolean;
};

export default function InvoiceActionsBar({ invoiceData, onSend, onDownload, sending = false }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (!invoiceData?.invoiceNumber) {
      console.warn('⚠️ Missing invoice number for back navigation');
      return;
    }

    router.push(
      `/freelancer-dashboard/projects-and-invoices/create-invoice?pageState=resume&invoiceNumber=${invoiceData.invoiceNumber}`
    );
  };

  return (
    <div className="pt-8 border-t border-zinc-200 w-full max-w-md mx-auto space-y-5">
      {/* Send Invoice */}
      <div className="w-full">
        <Button
          onClick={onSend}
          variant="primary"
          disabled={sending}
          className="w-full px-5 py-3 text-sm font-medium flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Invoice
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