'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoiceMetaBlock from './invoice-meta-block';

// No longer importing ClientInfoBox since layout doesn't use it

export type ClientInfo = {
  companyName?: string;
  contactName?: string;
  email?: string;
  address?: string;
  logo?: string;
};

type Party = {
  name: string;
  email: string;
  address: string;
};

type InvoiceMeta = {
  invoiceNumber: string;
  projectTitle: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  status?: string;
  freelancer: Party | null;
  client: Party | null;
};

export default function InvoicePreviewHeader() {
  const { invoiceId } = useParams();
  const [meta, setMeta] = useState<InvoiceMeta | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientInfo | null>(null);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/invoices/preview-meta/invoice-preview-cache/${invoiceId}`);
        if (!res.ok) throw new Error('Failed to fetch preview meta');
        const data = await res.json();
        setMeta(data);

        if (data.client?.id) {
          const clientRes = await fetch(`/api/invoices/preview-meta/bill-to-details/${data.client.id}`);
          const clientData = await clientRes.json();
          setClientDetails({
            companyName: clientData.organization?.name,
            logo: clientData.organization?.logo,
            contactName: clientData.user?.name,
            email: clientData.user?.email,
            address: clientData.user?.address,
          });
        }
      } catch (err) {
        console.error('⚠️ Failed to load invoice preview meta:', err);
      }
    };

    if (invoiceId) fetchMeta();
  }, [invoiceId]);

  if (!meta) {
    return <div className="p-4 text-sm text-gray-500">Loading invoice preview...</div>;
  }

  return (
    <div className="w-full px-4 md:px-6">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg border-b border-gray-200 space-y-6">
        {/* Project Title */}
        <h1 className="text-xl font-semibold text-gray-900">
          {meta.projectTitle || 'Untitled Project'}
        </h1>

        {/* Freelancer Header - Black Box */}
        {meta.freelancer && (
          <div className="flex justify-between bg-zinc-900 text-white p-4 rounded-md">
            <div>
              <p className="text-base font-semibold">{meta.freelancer.name}</p>
              <p className="text-sm text-zinc-300">{meta.freelancer.email}</p>
            </div>
            <p className="text-sm text-zinc-400 text-right">{meta.freelancer.address}</p>
          </div>
        )}

        {/* Invoice Info Block - Stacked only */}
        <InvoiceMetaBlock
          invoiceNumber={meta.invoiceNumber || '—'}
          billedToName={clientDetails?.contactName || '—'}
          billedToAddress={clientDetails?.address || '—'}
        />
      </div>
    </div>
  );
}