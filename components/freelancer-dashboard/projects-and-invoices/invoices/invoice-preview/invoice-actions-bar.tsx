'use client';

import { useState } from 'react';
import { Button } from '../../../../ui/button';
import { Download, Save, Send } from 'lucide-react';

type Props = {
  invoiceData: any;
  onSend: () => void;
  onDownload: () => void;
};

export default function InvoiceActionsBar({ invoiceData, onSend, onDownload }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/invoices/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      const result = await res.json();

      if (!res.ok) {
        console.error('❌ Save draft failed:', result?.error || result);
      } else {
        console.log('✅ Draft saved:', result);
      }
    } catch (err) {
      console.error('❌ Error saving draft:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pt-8 border-t border-zinc-200 w-full max-w-md mx-auto space-y-5">
      {/* Send Invoice */}
      <div className="w-full">
        <Button
          onClick={onSend}
          variant="primary"
          className="w-full px-5 py-3 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send Invoice
        </Button>
      </div>

      {/* Compact Save Draft & Download buttons */}
      <div className="flex flex-row gap-3 w-full">
        <Button
          onClick={handleSaveDraft}
          variant="secondary"
          className="w-1/2 px-3 py-2 text-xs flex items-center justify-center gap-1 rounded-xl"
          disabled={isSaving}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save'}
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