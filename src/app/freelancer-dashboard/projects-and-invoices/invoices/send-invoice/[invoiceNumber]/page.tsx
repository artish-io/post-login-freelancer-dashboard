'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FreelancerHeader from '../../../../../../../components/freelancer-dashboard/freelancer-header';
import InvoicePreview from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/invoice-preview';
import SendInvoiceClientActions from '../../../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/send-invoice-client-actions';

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
  invoiceType?: string; // Added to support completion project detection
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

export default function SendInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);

  const invoiceNumber = params.invoiceNumber as string;

  useEffect(() => {
    const fetchInvoiceData = async () => {
      console.log('[SEND_INVOICE_PAGE] Loading invoice:', invoiceNumber);
      console.log('[SEND_INVOICE_PAGE] Session:', session?.user?.id);

      if (!invoiceNumber) {
        console.error('[SEND_INVOICE_PAGE] No invoice number provided');
        setError('No invoice number provided');
        setLoading(false);
        return;
      }

      try {
        console.log('[SEND_INVOICE_PAGE] Fetching invoice details from API...');
        // Fetch enhanced invoice details (includes freelancer and commissioner info)
        const invoiceRes = await fetch(`/api/invoices/details/${invoiceNumber}`);
        console.log('[SEND_INVOICE_PAGE] API response status:', invoiceRes.status);

        if (!invoiceRes.ok) {
          if (invoiceRes.status === 404) {
            console.error('[SEND_INVOICE_PAGE] Invoice not found');
            setError('Invoice not found');
          } else {
            console.error('[SEND_INVOICE_PAGE] Failed to load invoice, status:', invoiceRes.status);
            throw new Error('Failed to load invoice');
          }
          setLoading(false);
          return;
        }
        const invoice = await invoiceRes.json();
        console.log('[SEND_INVOICE_PAGE] Invoice data loaded:', invoice);

        // Verify the current user has access to this invoice
        const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;
        if (currentUserId && invoice.freelancerId !== currentUserId) {
          console.error('[SEND_INVOICE_PAGE] Access denied - user ID mismatch');
          setError('Access denied - you can only view your own invoices');
          setLoading(false);
          return;
        }

        console.log('[SEND_INVOICE_PAGE] Setting invoice data');
        setInvoiceData(invoice);

        // SECURITY: Validate invoice status on page load
        const isNonDraftStatus = ['sent', 'paid', 'on hold', 'cancelled'].includes(invoice.status?.toLowerCase());
        if (isNonDraftStatus) {
          console.log('[SECURITY] Non-draft invoice accessed via send-invoice page:', {
            invoiceNumber,
            status: invoice.status,
            userId: session?.user?.id
          });

          setStatusWarning(`This invoice has already been ${invoice.status}. No further actions are allowed.`);

          // Auto-redirect to appropriate page after 3 seconds
          setTimeout(() => {
            console.log('[SECURITY] Auto-redirecting from non-draft invoice page');

            // Check if this is a completion project invoice
            const isCompletionInvoice = invoice.invoiceType === 'completion' ||
                                      invoice.invoiceType?.startsWith('completion_');

            if (isCompletionInvoice) {
              // For completion projects, redirect to project tracking
              console.log('[SECURITY] Completion project - redirecting to project tracking:', invoice.projectId);
              router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${invoice.projectId}`);
            } else {
              // For milestone projects, redirect to invoices list
              console.log('[SECURITY] Milestone project - redirecting to invoices list');
              router.push('/freelancer-dashboard/projects-and-invoices/invoices');
            }
          }, 3000);
        }

      } catch (err) {
        console.error('[SEND_INVOICE_PAGE] Error fetching invoice data:', err);
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
        <FreelancerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <FreelancerHeader />
        <div className="mt-10 p-10 text-center">
          <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
          <button
            onClick={() => {
              // Check if this is a completion project invoice for better redirect
              const isCompletionInvoice = invoiceData?.invoiceType === 'completion' ||
                                        invoiceData?.invoiceType?.startsWith('completion_');

              if (isCompletionInvoice && invoiceData?.projectId) {
                router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${invoiceData.projectId}`);
              } else {
                router.push('/freelancer-dashboard/projects-and-invoices/invoices');
              }
            }}
            className="px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors"
          >
            {(invoiceData?.invoiceType === 'completion' || invoiceData?.invoiceType?.startsWith('completion_'))
              ? 'Back to Project'
              : 'Back to Invoices'}
          </button>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <FreelancerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
      <FreelancerHeader />

      {/* Navigation breadcrumb */}
      <div className="mt-6 mb-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => router.push('/freelancer-dashboard/projects-and-invoices')}
            className="hover:text-[#eb1966] transition-colors"
          >
            Projects & Invoices
          </button>
          <span>›</span>
          <button
            onClick={() => router.push('/freelancer-dashboard/projects-and-invoices/invoices')}
            className="hover:text-[#eb1966] transition-colors"
          >
            Invoices
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Send Invoice</span>
        </nav>
      </div>

      {/* Status Warning for non-draft invoices */}
      {statusWarning && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Action Not Allowed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{statusWarning}</p>
                <p className="mt-1">
                  You will be redirected to the {
                    (invoiceData?.invoiceType === 'completion' || invoiceData?.invoiceType?.startsWith('completion_'))
                      ? 'project tracking page'
                      : 'invoices page'
                  } in a few seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview with Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <InvoicePreview
          invoice={invoiceData}
          userType="freelancer"
          actionButtons={
            <SendInvoiceClientActions
              invoiceData={invoiceData}
              invoiceNumber={invoiceNumber}
            />
          }
        />
      </div>
    </div>
  );
}