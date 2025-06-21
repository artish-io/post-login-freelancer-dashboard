'use client';

import { Button } from '../../../../ui/button';
import { Eye, Download } from 'lucide-react';

type Props = {
  onSend: () => void;
  onPreview: () => void;
  onDownload: () => void;
};

export default function InvoiceActionsBar({ onSend, onPreview, onDownload }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 pt-6 mt-6">
      <Button
        onClick={onSend}
        variant="primary"
        className="w-full sm:w-auto px-12 py-4 text-base font-semibold"
      >
        Send Invoice
      </Button>

      <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">
        <Button
          onClick={onPreview}
          variant="secondary"
          className="w-full sm:w-auto px-10 py-4 text-base"
        >
          <Eye className="w-5 h-5" />
          Preview
        </Button>

        <Button
          onClick={onDownload}
          variant="secondary"
          className="w-full sm:w-auto px-10 py-4 text-base"
        >
          <Download className="w-5 h-5" />
          Download
        </Button>
      </div>
    </div>
  );
}