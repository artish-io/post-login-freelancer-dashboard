'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type Invoice = {
  invoiceNumber: string;
  freelancerId: number;
  projectId: number | null;
  commissionerId: number;
  projectTitle: string;
  milestoneDescription: string;
  milestoneNumber: number;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  milestones: {
    description: string;
    rate: number;
  }[];
  isCustomProject?: boolean;
  isManualInvoice?: boolean;
  parentInvoiceNumber: string;
};

type InvoiceWithFreelancer = Invoice & {
  freelancer: {
    id: number;
    name: string;
    avatar: string;
    title: string;
  };
};

const statusColors = {
  draft: 'bg-blue-100 text-blue-800',
  sent: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800'
};

const statusLabels = {
  draft: 'Processing',
  sent: 'On Hold',
  paid: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  pending: 'Pending',
  processing: 'Processing'
};

// Format timestamp to relative time
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

interface InvoiceHistoryPanelProps {
  commissionerId: number;
}

export default function InvoiceHistoryPanel({ commissionerId }: InvoiceHistoryPanelProps) {
  const [invoices, setInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);

        // Fetch invoices and users data
        const [invoicesRes, usersRes] = await Promise.all([
          fetch('/api/invoices?userType=commissioner'),
          fetch('/api/users')
        ]);

        if (!invoicesRes.ok || !usersRes.ok) {
          console.error('Failed to fetch invoices or users data');
          setInvoices([]);
          return;
        }

        const [invoicesData, usersData] = await Promise.all([
          invoicesRes.json(),
          usersRes.json()
        ]);

        // Filter invoices for this commissioner and enrich with freelancer data
        const commissionerInvoices = invoicesData
          .filter((invoice: Invoice) => invoice.commissionerId === commissionerId)
          .map((invoice: Invoice) => {
            const freelancer = usersData.find((user: any) => user.id === invoice.freelancerId);
            return {
              ...invoice,
              freelancer: freelancer ? {
                id: freelancer.id,
                name: freelancer.name,
                avatar: freelancer.avatar,
                title: freelancer.title
              } : {
                id: invoice.freelancerId,
                name: 'Unknown Freelancer',
                avatar: '/default-avatar.png',
                title: 'Freelancer'
              }
            };
          })
          .sort((a: Invoice, b: Invoice) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

        setInvoices(commissionerInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [commissionerId]);

  const handleInvoiceClick = (invoice: InvoiceWithFreelancer) => {
    // Navigate to commissioner invoice preview page
    window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices?invoice=${invoice.invoiceNumber}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm px-6 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Invoice History</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
            <button
              onClick={() => window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices/invoice-history?commissionerId=${commissionerId}`}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
            >
              View All
            </button>
          </div>
        </div>
      </div>

      {/* Invoice List - Fixed height for exactly 3 visible invoices */}
      <div className="px-6 py-4">
        <div className="space-y-3 h-[270px] overflow-y-auto">
          <AnimatePresence>
            {invoices.map((invoice: InvoiceWithFreelancer) => (
              <motion.div
                key={invoice.invoiceNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => handleInvoiceClick(invoice)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
              >
                {/* Freelancer Avatar */}
                <div className="flex-shrink-0">
                  <Image
                    src={invoice.freelancer.avatar}
                    alt={invoice.freelancer.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                </div>

                {/* Invoice Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {invoice.milestoneDescription}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      ${invoice.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {invoice.freelancer.name} • Milestone {invoice.milestoneNumber}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(invoice.issueDate)}
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status as keyof typeof statusColors]}`}>
                      {statusLabels[invoice.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {invoices.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>No invoices yet</p>
            <p className="text-sm mt-1">Invoices from your projects will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
