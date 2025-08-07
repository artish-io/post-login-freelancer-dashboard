'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CommissionerHeader from '../../../../../../../components/commissioner-dashboard/commissioner-header';
import InvoicePreview from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-preview';

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

export default function CommissionerInvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceNumber = params.invoiceNumber as string;

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
          if (invoiceRes.status === 404) {
            setError('Invoice not found');
          } else {
            throw new Error('Failed to load invoice');
          }
          setLoading(false);
          return;
        }
        const invoice = await invoiceRes.json();
        
        // Verify the current user has access to this invoice
        const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;
        if (currentUserId && invoice.commissionerId !== currentUserId) {
          setError('Access denied - you can only view your own invoices');
          setLoading(false);
          return;
        }
        
        setInvoiceData(invoice);

      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [invoiceNumber, session]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-center">
          <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
          <button
            onClick={() => router.push('/commissioner-dashboard/projects-and-invoices/invoices')}
            className="px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
      <CommissionerHeader />
      
      {/* Navigation breadcrumb */}
      <div className="mt-6 mb-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => router.push('/commissioner-dashboard/projects-and-invoices')}
            className="hover:text-[#eb1966] transition-colors"
          >
            Projects & Invoices
          </button>
          <span>›</span>
          <button
            onClick={() => router.push('/commissioner-dashboard/projects-and-invoices/invoices')}
            className="hover:text-[#eb1966] transition-colors"
          >
            Invoices
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">{invoiceNumber}</span>
        </nav>
      </div>

      {/* Invoice Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <InvoicePreview 
          invoice={invoiceData} 
          userType="commissioner"
        />
      </div>
    </div>
  );
}
