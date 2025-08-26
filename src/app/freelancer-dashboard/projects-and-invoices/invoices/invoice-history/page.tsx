'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import FreelancerHeader from '../../../../../../components/freelancer-dashboard/freelancer-header';

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
  status: 'draft' | 'sent' | 'paid' | 'on_hold' | 'cancelled' | 'overdue';
  milestones: {
    description: string;
    rate: number;
  }[];
  isCustomProject?: boolean;
  isManualInvoice?: boolean;
  parentInvoiceNumber: string;
};

type InvoiceWithCommissioner = Invoice & {
  commissioner: {
    id: number;
    name: string;
    avatar: string;
    organization: string;
  };
};

export default function FreelancerInvoiceHistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [invoices, setInvoices] = useState<InvoiceWithCommissioner[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithCommissioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'draft' | 'on_hold'>('all');

  // Get freelancer ID from session
  const freelancerId = session?.user?.id ? parseInt(session.user.id) : null;

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        if (!freelancerId || sessionStatus === 'loading') {
          return;
        }

        setLoading(true);

        // Load invoices and users data
        const [invoicesResponse, usersResponse] = await Promise.all([
          fetch('/api/invoices?userType=freelancer'),
          fetch('/api/users')
        ]);

        if (!invoicesResponse.ok || !usersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [invoicesData, usersData] = await Promise.all([
          invoicesResponse.json(),
          usersResponse.json()
        ]);

        // Filter invoices for current freelancer
        const freelancerInvoices = invoicesData.filter((invoice: Invoice) => 
          invoice.freelancerId === freelancerId
        );

        // Enrich with commissioner data
        const enrichedInvoices = freelancerInvoices.map((invoice: Invoice) => {
          const commissioner = usersData.find((user: any) => user.id === invoice.commissionerId);
          return {
            ...invoice,
            commissioner: {
              id: commissioner?.id || 0,
              name: commissioner?.name || 'Unknown Commissioner',
              avatar: commissioner?.avatar || '/default-avatar.png',
              organization: commissioner?.organization || 'Unknown Organization'
            }
          };
        });

        setInvoices(enrichedInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [freelancerId, sessionStatus]);

  // Filter invoices based on active tab
  useEffect(() => {
    let filtered = [...invoices];

    // Filter by tab
    if (activeTab !== 'all') {
      if (activeTab === 'on_hold') {
        // Include both 'on_hold' and 'sent' statuses for processing tab
        filtered = filtered.filter(invoice => 
          invoice.status === 'on_hold' || invoice.status === 'sent'
        );
      } else {
        filtered = filtered.filter(invoice => invoice.status === activeTab);
      }
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.issueDate).getTime();
      const bDate = new Date(b.issueDate).getTime();
      return bDate - aDate;
    });

    setFilteredInvoices(filtered);
  }, [activeTab, invoices]);

  const handleInvoiceClick = (invoice: InvoiceWithCommissioner) => {
    // Navigate to invoice detail page
    router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoice.invoiceNumber}`);
  };

  const getStatusDisplay = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      sent: { color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      on_hold: { color: 'bg-orange-100 text-orange-800', label: 'On Hold' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Calculate tab counts
  const tabCounts = {
    all: invoices.length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    draft: invoices.filter(inv => inv.status === 'draft').length,
    on_hold: invoices.filter(inv => inv.status === 'on_hold' || inv.status === 'sent').length
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-2">
          <FreelancerHeader />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-gray-600">Loading invoices...</span>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-2">
          <FreelancerHeader />
        </div>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to view invoice history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-2">
        <FreelancerHeader />
      </div>

      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Invoice History</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage all your invoices
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredInvoices.length} invoices
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { key: 'all', label: 'All Invoices', count: tabCounts.all },
              { key: 'paid', label: 'Paid', count: tabCounts.paid },
              { key: 'draft', label: 'Draft', count: tabCounts.draft },
              { key: 'on_hold', label: 'Processing', count: tabCounts.on_hold }
            ].map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'border-[#eb1966] text-[#eb1966]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                  >
                    {tab.count}
                  </motion.span>
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {activeTab === 'all' && 'No invoices found'}
              {activeTab === 'paid' && 'No paid invoices found'}
              {activeTab === 'draft' && 'No draft invoices found'}
              {activeTab === 'on_hold' && 'No processing invoices found'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="px-6 py-3">
                <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>Task</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div>Amount</div>
                  <div>Commissioner</div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice, index) => (
                <motion.div
                  key={`invoice-${invoice.invoiceNumber}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleInvoiceClick(invoice)}
                >
                  <div className="grid grid-cols-5 gap-4 items-center">
                    {/* Task Column */}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.milestoneDescription}
                      </span>
                      <span className="text-xs text-gray-500">
                        {invoice.invoiceNumber} • {invoice.projectTitle}
                      </span>
                    </div>

                    {/* Date Column */}
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {formatTimeAgo(invoice.issueDate)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Status Column */}
                    <div>
                      {(() => {
                        const statusDisplay = getStatusDisplay(invoice.status);
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                            {statusDisplay.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Amount Column */}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        ${invoice.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Commissioner Column */}
                    <div className="flex items-center gap-3">
                      <img
                        src={invoice.commissioner.avatar}
                        alt={invoice.commissioner.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.commissioner.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {invoice.commissioner.organization}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
