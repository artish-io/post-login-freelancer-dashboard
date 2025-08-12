'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSuccessToast, useErrorToast } from '../../../../../components/ui/toast';

import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import FreelancerInfoBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/freelancer-info-box';
import ClientDetailsBox from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceMetaBlock from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import InvoiceTaskList from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
import InvoiceActionsBar from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-actions-bar';
import InvoiceDatesDisplay from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';

export default function PreviewInvoicePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { invoiceNumber } = useParams();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [billToDetails, setBillToDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

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

          // Enhanced bill-to information enrichment
          if (typeof data.billTo === 'string') {
            const billToRes = await fetch(
              `/api/invoices/preview-meta/bill-to-details/email/${encodeURIComponent(data.billTo)}`
            );
            const billToData = await billToRes.json();

            if (billToRes.ok) {
              setBillToDetails({
                id: billToData.id,
                name: billToData.name,
                email: billToData.email,
                organization: billToData.organization,
                organizationLogo: billToData.logo,
                address: billToData.address,
              });
            } else {
              console.warn('⚠️ Could not fetch bill-to details:', billToData.error);
            }
          } else if (data.commissionerId) {
            // Fallback: use commissionerId to get commissioner details
            const commissionerRes = await fetch(
              `/api/invoices/preview-meta/bill-to-details/${data.commissionerId}`
            );
            const commissionerData = await commissionerRes.json();

            if (commissionerRes.ok) {
              setBillToDetails({
                id: data.commissionerId,
                name: commissionerData.name,
                email: commissionerData.email,
                organization: commissionerData.organization,
                organizationLogo: commissionerData.logo,
                address: commissionerData.address,
              });
            } else {
              console.warn('⚠️ Could not fetch commissioner details:', commissionerData.error);
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

  const handleSendInvoice = async () => {
    if (!invoiceData || !session?.user?.id) {
      alert('Missing invoice data or user session');
      return;
    }

    setSending(true);
    try {
      // First, create the invoice in the database
      const createInvoiceData = {
        invoiceNumber: invoiceData.invoiceNumber,
        freelancerId: Number(session.user.id),
        commissionerId: billToDetails?.id || invoiceData.commissionerId,
        projectId: invoiceData.project?.projectId || null,
        projectTitle: invoiceData.project?.title || 'Custom Project',
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        totalAmount: invoiceData.total,
        status: 'draft',
        milestones: invoiceData.milestones || [],
        isCustomProject: !invoiceData.project?.projectId
      };

      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInvoiceData),
      });

      if (!createRes.ok) {
        const createResult = await createRes.json();
        throw new Error(createResult.error || 'Failed to create invoice');
      }

      // Then send the invoice
      const sendData = {
        invoiceNumber: invoiceData.invoiceNumber,
        freelancerId: Number(session.user.id),
        commissionerId: billToDetails?.id || invoiceData.commissionerId
      };

      const sendRes = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      });

      const sendResult = await sendRes.json();

      if (sendRes.ok) {
        showSuccessToast('Invoice Sent', 'Invoice sent successfully!');
        router.push('/freelancer-dashboard/projects-and-invoices/invoices');
      } else {
        throw new Error(sendResult.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      showErrorToast(
        'Failed to Send Invoice',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setSending(false);
    }
  };

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
            onSend={handleSendInvoice}
            onDownload={() => console.log('Download PDF')}
            sending={sending}
          />
        </div>
      </div>
    </div>
  );
}