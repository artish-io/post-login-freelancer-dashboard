'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import FreelancerHeader from '../../../../../../../components/freelancer-dashboard/freelancer-header';
import FreelancerInfoBox from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/freelancer-info-box';
import ClientDetailsBox from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceMetaBlock from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import InvoiceTaskList from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
import InvoiceActionsBar from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-actions-bar';
import InvoiceDatesDisplay from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';

export default function SendInvoicePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { invoiceNumber } = useParams();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [billToDetails, setBillToDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        // Fetch invoice from invoices.json
        const res = await fetch('/api/invoices');
        const allInvoices = await res.json();

        const invoice = allInvoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);

        if (!invoice) {
          console.error('Invoice not found');
          setInvoiceData(null);
          return;
        }

        setInvoiceData(invoice);

        // Fetch commissioner details
        if (invoice.commissionerId) {
          const usersRes = await fetch('/api/users');
          const users = await usersRes.json();
          const commissioner = users.find((user: any) => user.id === invoice.commissionerId);

          if (commissioner) {
            setBillToDetails({
              name: commissioner.name,
              email: commissioner.email,
              organization: commissioner.organization || 'N/A',
              organizationLogo: commissioner.avatar,
              address: commissioner.address || 'N/A',
            });
          }
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
      const sendData = {
        invoiceNumber: invoiceData.invoiceNumber,
        freelancerId: Number(session.user.id),
        commissionerId: invoiceData.commissionerId
      };

      const sendRes = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      });

      const sendResult = await sendRes.json();

      if (sendRes.ok) {
        alert('Invoice sent successfully!');
        router.push('/freelancer-dashboard/projects-and-invoices/invoices');
      } else {
        throw new Error(sendResult.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert(`Failed to send invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-gray-500">Loading invoice...</div>;
  if (!invoiceData) return <div className="p-10 text-red-500">Invoice not found.</div>;

  const {
    invoiceNumber: invNo,
    issueDate,
    dueDate,
    milestones,
    totalAmount
  } = invoiceData;

  const total = totalAmount || milestones?.reduce((sum: number, m: any) => sum + (m.rate || 0), 0) || 0;

  return (
    <section className="p-4 md:p-8">
      <FreelancerHeader />

      <div className="max-w-4xl mx-auto mt-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Send Invoice</h1>
          <p className="text-gray-600">Review and send your invoice to the client</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {session?.user && (
              <FreelancerInfoBox
                name={session.user.name || 'Freelancer'}
                email={session.user.email || 'freelancer@example.com'}
                address="Address not available"
              />
            )}

            {billToDetails && (
              <ClientDetailsBox
                organizationName={billToDetails.organization}
                organizationLogo={billToDetails.organizationLogo}
                clientName={billToDetails.name}
                clientEmail={billToDetails.email}
                clientAddress={billToDetails.address}
              />
            )}

            <InvoiceMetaBlock
              invoiceNumber={invNo}
              billedToName={billToDetails?.name}
              billedToAddress={billToDetails?.address}
            />

            {milestones && milestones.length > 0 && (
              <InvoiceTaskList
                tasks={milestones.map((m: any, index: number) => ({
                  id: index + 1,
                  title: m.title || m.description,
                  order: `${index + 1}`,
                  rate: m.rate || 0
                }))}
                readOnly={true}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                Total: ${total?.toFixed(2) || '0.00'}
              </div>
            </div>

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
    </section>
  );
}