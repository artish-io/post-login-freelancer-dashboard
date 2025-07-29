'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import FreelancerInfoBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/freelancer-info-box';
import ClientDetailsBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceMetaBlock from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import InvoiceTaskList from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
import InvoiceDatesDisplay from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';
import InvoiceReminderActions from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-reminder-actions';

export default function InvoicesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get('invoiceNumber');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [billToDetails, setBillToDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
      if (!invoiceNumber) {
        setLoading(false);
        return;
      }

      try {
        // First try to get from invoices.json directly
        const res = await fetch(`/api/invoices/details/${invoiceNumber}`);
        const data = await res.json();

        if (res.ok && data.invoiceNumber) {
          setInvoiceData(data);

          // Get commissioner details
          if (data.commissionerId) {
            const userRes = await fetch(`/api/users/${data.commissionerId}`);
            const userData = await userRes.json();

            if (userRes.ok) {
              setBillToDetails({
                name: userData.name,
                email: userData.email,
                organization: userData.organization || 'Unknown Organization',
                organizationLogo: userData.organizationLogo || '/logos/default-org.png',
                address: userData.address || 'Address not provided',
              });
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

  useEffect(() => {
    fetchInvoice();
  }, [invoiceNumber]);

  if (!invoiceNumber) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12 space-y-10">
        <FreelancerHeader />
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Invoice History</h1>
          <p className="text-gray-600">Select an invoice from the history list to view details.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-gray-500">Loading invoice...</div>;
  if (!invoiceData) return <div className="p-10 text-red-500">Failed to load invoice.</div>;

  const {
    invoiceNumber: invNo,
    issueDate,
    dueDate,
    projectTitle,
    milestones,
    totalAmount,
  } = invoiceData;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12 space-y-10">
      <FreelancerHeader />

      {/* Project Title */}
      <h1 className="text-2xl font-semibold text-gray-800">
        {projectTitle || 'Untitled Project'}
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

      {/* Main Body: Tasks + Dates (No Actions Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Work Details</h3>
          <InvoiceTaskList
            tasks={milestones?.map((milestone: any, index: number) => ({
              id: index + 1,
              title: milestone.description,
              order: `Milestone ${index + 1}`,
              rate: milestone.rate
            })) || []}
            readOnly={true}
          />
          <div className="flex justify-end pt-4 text-lg font-semibold text-gray-800 border-t">
            Total: ${totalAmount?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="space-y-8">
          <InvoiceDatesDisplay invoiceDate={issueDate} dueDate={dueDate} />
          <InvoiceReminderActions
            invoiceData={invoiceData}
            onReminderSent={fetchInvoice}
            onUserReported={fetchInvoice}
          />
        </div>
      </div>
    </div>
  );
}