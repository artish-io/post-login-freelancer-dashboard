'use client';

import { useRouter } from 'next/navigation';
import { Presentation, FileText } from 'lucide-react';

export default function ProposalInvoiceButtons() {
  const router = useRouter();

  return (
    <div className="space-y-4 w-full">
      <button
        className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-gray-900 hover:shadow-lg transition duration-200"
        onClick={() => console.log('Open proposal modal')}
      >
        <Presentation className="w-5 h-5" />
        Create a proposal
      </button>

      <button
        className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-gray-900 hover:shadow-lg transition duration-200"
        onClick={() =>
          router.push('/freelancer-dashboard/projects-and-invoices/create-invoice')
        }
      >
        <FileText className="w-5 h-5" />
        Generate a quick invoice
      </button>
    </div>
  );
}