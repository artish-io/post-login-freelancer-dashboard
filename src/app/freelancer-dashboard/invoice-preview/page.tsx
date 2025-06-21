'use client';

import { useEffect, useState } from 'react';

import FreelancerHeader from '../../../../components/freelancer-dashboard/freelancer-header';
import InvoiceMetaBlock from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import ClientInfoBox from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-info-box';
import ClientDetailsBox from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceDatesDisplay from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';
import InvoiceTaskList from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
console.log('InvoiceTaskList is:', InvoiceTaskList);
import InvoiceActionsBar from '../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-actions-bar';

export default function InvoicePreviewPage() {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // TEMP — Replace with dynamic route param later
  const invoiceId = 'MGL524874';

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices/preview-meta/${invoiceId}`);
        const data = await res.json();
        setInvoiceData(data);
      } catch (error) {
        console.error('Failed to fetch invoice data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handleSend = () => {
    console.log('Sending invoice...');
  };

  const handlePreview = () => {
    console.log('Previewing PDF...');
  };

  const handleDownload = () => {
    console.log('Downloading PDF...');
  };

  if (loading) return <div className="p-10 text-gray-500">Loading invoice preview...</div>;
  if (!invoiceData) return <div className="p-10 text-red-500">Failed to load invoice.</div>;

  const {
    invoiceNumber,
    projectId,
    issueDate,
    dueDate,
    client,
    organizationName,
    clientName,
    clientEmail,
    clientAddress,
  } = invoiceData;

  return (
    <div className="flex flex-col gap-6 px-4 md:px-10 py-6 w-full">
      <FreelancerHeader />

      <h1 className="text-2xl font-semibold text-zinc-900">
        Lagos Parks Services website re–design
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <InvoiceMetaBlock
            invoiceNumber={invoiceNumber}
            projectId={projectId}
            issueDate={issueDate}
            dueDate={dueDate}
          />
          <InvoiceTaskList />
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <ClientInfoBox client={client} />
          <ClientDetailsBox
            organizationName={organizationName}
            clientName={clientName}
            clientEmail={clientEmail}
            clientAddress={clientAddress}
          />
          <InvoiceDatesDisplay invoiceDate={issueDate} dueDate={dueDate} />
        </div>
      </div>

      <InvoiceActionsBar
        onSend={handleSend}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />
    </div>
  );
}