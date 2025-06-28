'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import FreelancerInfoBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/freelancer-info-box';
import ClientDetailsBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceMetaBlock from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import InvoiceTaskList from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
import InvoiceActionsBar from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-actions-bar';
import InvoiceDatesDisplay from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';

export default function PreviewInvoicePage() {
  const { data: session } = useSession();
  const { invoiceNumber } = useParams();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [billToDetails, setBillToDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(
          `/api/invoices/preview-meta/invoice-preview-cache/${invoiceNumber}`,
          { cache: 'no-store' }
        );
        const data = await res.json();

        if (res.ok && data.invoiceNumber) {
          setInvoiceData(data);

          if (typeof data.billTo === 'string') {
            const billToRes = await fetch(
              `/api/invoices/preview-meta/bill-to-details/email/${encodeURIComponent(data.billTo)}`
            );
            const billToData = await billToRes.json();

            if (billToRes.ok) {
              setBillToDetails({
                name: billToData.name,
                email: billToData.email,
                organization: billToData.organization,
                organizationLogo: billToData.logo,
                address: billToData.address,
              });
            } else {
              console.warn('⚠️ Could not fetch bill-to details:', billToData.error);
            }
          }
        } else {
          setInvoiceData(null);
        }
      } catch (error) {
        console.error('❌ Error loading invoice:', error);
        setInvoiceData(null);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceNumber) fetchInvoice();
  }, [invoiceNumber]);

  if (loading) return <div className="p-10 text-gray-500">Loading invoice preview...</div>;
  if (!invoiceData) return <div className="p-10 text-red-500">Failed to load invoice preview.</div>;

  const {
    invoiceNumber: invNo,
    issueDate,
    dueDate,
    project,
    milestones,
    total,
  } = invoiceData;

  console.log('🗓️ Invoice Dates Preview:', { issueDate, dueDate });

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12 space-y-10">
      <FreelancerHeader />

      {/* Project Title */}
      <h1 className="text-2xl font-semibold text-gray-800">
        {project?.title || 'Untitled Project'}
      </h1>

      {/* Top Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <FreelancerInfoBox
            name={session?.user?.name ?? '—'}
            email={session?.user?.email ?? '—'}
            address="133 Grey Fox Farm Road, Hidden Leaf village, Land of fire."
          />
          <InvoiceMetaBlock
            invoiceNumber={invNo}
            billedToName={billToDetails?.name}
            billedToAddress={billToDetails?.address}
          />
        </div>
        <div>
          <ClientDetailsBox
            organizationName={billToDetails?.organization}
            organizationLogo={billToDetails?.organizationLogo}
            clientName={billToDetails?.name}
            clientEmail={billToDetails?.email}
            clientAddress={billToDetails?.address}
          />
        </div>
      </div>

      {/* Main Body: Tasks + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Work Details</h3>
          <InvoiceTaskList tasks={milestones} readOnly={true} />
          <div className="flex justify-end pt-4 text-lg font-semibold text-gray-800 border-t">
            Total: ${total?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="space-y-8">
          <InvoiceDatesDisplay invoiceDate={issueDate} dueDate={dueDate} />
          <InvoiceActionsBar
  invoiceData={invoiceData}
  onSend={() => console.log('Send Invoice')}
  onDownload={() => console.log('Download PDF')}
/>
        </div>
      </div>
    </div>
  );
}