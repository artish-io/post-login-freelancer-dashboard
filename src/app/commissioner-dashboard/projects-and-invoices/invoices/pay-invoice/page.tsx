'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import CommissionerHeader from '../../../../../../components/commissioner-dashboard/commissioner-header';
import FreelancerInfoBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/freelancer-info-box';
import ClientDetailsBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box';
import InvoiceMetaBlock from '../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-meta-block';
import InvoiceTaskList from '../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-task-list';
import InvoiceDatesDisplay from '../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-dates-display';
import InvoicePaymentActionsBar from '../../../../../../components/commissioner-dashboard/projects-and-invoices/invoice/invoice-payment-actions-bar';

type Invoice = {
  invoiceNumber: string;
  freelancerId: number;
  projectId: number;
  commissionerId: number;
  projectTitle: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  milestones: {
    description: string;
    rate: number;
  }[];
  freelancer?: {
    id: number;
    name: string;
    email: string;
    avatar: string;
    title: string;
    address: string;
  };
  commissioner?: {
    id: number;
    name: string;
    email: string;
    organizationId?: number;
    organization?: {
      name: string;
      logo: string;
      address: string;
    };
  };
};

export default function PayInvoicePage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get('invoice');

  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!invoiceNumber) {
        setError('No invoice number provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch enhanced invoice details (includes freelancer and commissioner info)
        const invoiceRes = await fetch(`/api/invoices/details/${invoiceNumber}`);
        if (!invoiceRes.ok) {
          throw new Error('Invoice not found');
        }
        const invoice = await invoiceRes.json();
        setInvoiceData(invoice);

      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [invoiceNumber]);

  const handlePayInvoice = async () => {
    if (!invoiceData || !session?.user?.id) {
      alert('Unable to process payment. Please try again.');
      return;
    }

    if (invoiceData.status === 'paid') {
      alert('This invoice has already been paid.');
      return;
    }

    setPaying(true);
    try {
      // Here you would integrate with your payment processor
      // For now, we'll simulate payment by updating the invoice status
      const response = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceData.invoiceNumber,
          commissionerId: session.user.id,
          amount: invoiceData.totalAmount
        })
      });

      if (response.ok) {
        alert('Payment processed successfully!');

        // Update local invoice data to reflect paid status
        setInvoiceData(prev => prev ? { ...prev, status: 'paid' } : null);
      } else {
        const error = await response.json();
        alert(`Payment failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadInvoice = () => {
    console.log('Download invoice functionality to be implemented');
    alert('Download functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load invoice'}</p>
          <Link href="/commissioner-dashboard/projects-and-invoices/invoices/invoice-history">
            <span className="text-sm text-gray-600 hover:text-pink-600">← Back to Invoice History</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12 space-y-10">
      <CommissionerHeader />

      {/* Back Link */}
      <Link href="/commissioner-dashboard/projects-and-invoices/invoices/invoice-history">
        <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
          ← Back to Invoice History
        </span>
      </Link>

      {/* Project Title */}
      <h1 className="text-2xl font-semibold text-gray-800">
        Pay Invoice: {invoiceData.projectTitle || 'Untitled Project'}
      </h1>

      {/* Top Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Freelancer Info */}
          <FreelancerInfoBox
            name={invoiceData.freelancer?.name ?? 'Unknown Freelancer'}
            email={invoiceData.freelancer?.email ?? '—'}
            address={invoiceData.freelancer?.address ?? '—'}
          />
          {/* Invoice Meta */}
          <InvoiceMetaBlock
            invoiceNumber={invoiceData.invoiceNumber}
            billedToName={invoiceData.commissioner?.name}
            billedToAddress={invoiceData.commissioner?.organization?.address || '—'}
          />
        </div>
        <div>
          {/* Commissioner/Client Details */}
          <ClientDetailsBox
            organizationName={invoiceData.commissioner?.organization?.name || 'Organization'}
            organizationLogo={invoiceData.commissioner?.organization?.logo || '/default-logo.png'}
            clientName={invoiceData.commissioner?.name || 'Commissioner'}
            clientEmail={invoiceData.commissioner?.email || '—'}
            clientAddress={invoiceData.commissioner?.organization?.address || '—'}
          />
        </div>
      </div>

      {/* Main Body: Tasks + Payment Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Work Details</h3>
          <InvoiceTaskList
            tasks={invoiceData.milestones.map((milestone, index) => ({
              id: index + 1,
              title: milestone.description,
              order: `Milestone ${index + 1}`,
              rate: milestone.rate
            }))}
            readOnly={true}
          />
          <div className="flex justify-end pt-4 text-lg font-semibold text-gray-800 border-t">
            Total: ${invoiceData.totalAmount?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="space-y-8">
          <InvoiceDatesDisplay
            invoiceDate={invoiceData.issueDate}
            dueDate={invoiceData.dueDate}
          />

          {/* Status Display */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Status</h4>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                invoiceData.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : invoiceData.status === 'sent'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {invoiceData.status === 'paid' ? 'Paid' : invoiceData.status === 'sent' ? 'Awaiting Payment' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Payment Actions */}
          <InvoicePaymentActionsBar
            invoiceData={invoiceData}
            onPay={handlePayInvoice}
            onDownload={handleDownloadInvoice}
            loading={paying}
            disabled={invoiceData.status !== 'sent'}
          />
        </div>
      </div>
    </div>
  );
}