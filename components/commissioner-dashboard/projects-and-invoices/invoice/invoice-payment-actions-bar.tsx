'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../../../ui/button';
import { Download, CreditCard, CornerUpLeft } from 'lucide-react';

type Props = {
  invoiceData: any;
  onPay: () => void;
  onDownload: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function InvoicePaymentActionsBar({ 
  invoiceData, 
  onPay, 
  onDownload, 
  disabled = false,
  loading = false 
}: Props) {
  const router = useRouter();

  const handleBack = () => {
    // Navigate back to invoice history
    router.push('/commissioner-dashboard/projects-and-invoices/invoices/invoice-history');
  };

  const isPaymentDisabled = disabled || loading || invoiceData?.status === 'paid';

  return (
    <div className="pt-8 border-t border-zinc-200 w-full max-w-md mx-auto space-y-5">
      {/* Pay Invoice */}
      <div className="w-full">
        <Button
          onClick={onPay}
          variant="primary"
          disabled={isPaymentDisabled}
          className={`w-full px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            isPaymentDisabled 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {loading ? 'Processing...' :
           invoiceData?.status === 'paid' ? 'Already Paid' :
           (invoiceData?.paidAmount && invoiceData?.paidAmount > 0) ? 'Pay Remaining' :
           'Pay Invoice'}
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
