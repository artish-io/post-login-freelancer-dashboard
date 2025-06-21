'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoiceMetaBlock from './invoice-meta-block';
import ClientInfoBox from './client-info-box';

type Party = {
  name: string;
  email: string;
  address: string;
  title: string;
};

type InvoiceMeta = {
  invoiceId: number;
  projectTitle: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  freelancer: Party | null;
  client: Party | null;
};

export default function InvoicePreviewHeader() {
  const { invoiceId } = useParams();
  const [meta, setMeta] = useState<InvoiceMeta | null>(null);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/invoices/preview-meta/${invoiceId}`);
        const data = await res.json();
        setMeta(data);
      } catch (err) {
        console.error('Failed to load invoice meta', err);
      }
    };

    if (invoiceId) fetchMeta();
  }, [invoiceId]);

  if (!meta) return <div className="p-4 text-sm text-gray-500">Loading invoice...</div>;

  return (
    <div className="w-full px-4 md:px-6">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg border-b border-gray-200 space-y-6">
        {/* Freelancer Header */}
        {meta.freelancer && (
          <div className="flex justify-between items-start bg-zinc-900 text-white rounded-md p-4">
            <div>
              <p className="text-base font-semibold">{meta.freelancer.name}</p>
              <p className="text-sm text-zinc-300">{meta.freelancer.email}</p>
            </div>
            <p className="text-right text-sm text-zinc-400">{meta.freelancer.address}</p>
          </div>
        )}

        {/* Invoice Details */}
        <div className="flex justify-between items-start gap-8">
          <InvoiceMetaBlock
            invoiceNumber={`MGL${meta.invoiceId}`}
            projectId={`MAG ${meta.invoiceId}`}
            issueDate={meta.issueDate}
            dueDate={meta.dueDate}
          />
          {meta.client && (
            <ClientInfoBox
              client={{
                companyName: meta.client.title,
                contactName: meta.client.name,
                email: meta.client.email,
                address: meta.client.address,
              }}
            />
          )}
        </div>

        {/* Summary Section */}
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-pink-700">${meta.totalAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">Status: {meta.status}</p>
        </div>
      </div>
    </div>
  );
}