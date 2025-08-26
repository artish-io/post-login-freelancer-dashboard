'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import InvoiceHistoryTable from '../../../../../../components/commissioner-dashboard/projects-and-invoices/invoice-history/invoice-history-table';

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

type InvoiceWithFreelancer = Invoice & {
  freelancer: {
    id: number;
    name: string;
    avatar: string;
    title: string;
  };
};

export default function InvoiceHistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [invoices, setInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'draft' | 'on_hold'>('all');


  // Get commissioner ID from URL params, session, or default to 32
  const urlCommissionerId = searchParams.get('commissionerId');
  const sessionCommissionerId = session?.user?.id;
  const commissionerId = parseInt(urlCommissionerId || sessionCommissionerId || '32');

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        if (!commissionerId || sessionStatus === 'loading') {
          return;
        }

        setLoading(true);

        // Load invoices and users data
        const [invoicesResponse, usersResponse] = await Promise.all([
          fetch('/api/invoices?userType=commissioner'),
          fetch('/api/users')
        ]);

        if (!invoicesResponse.ok || !usersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const invoicesData = await invoicesResponse.json();
        const usersData = await usersResponse.json();

        // Filter invoices for this commissioner and enrich with freelancer data
        const commissionerInvoices = invoicesData
          .filter((invoice: Invoice) => Number(invoice.commissionerId) === Number(commissionerId))
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
          });

        setInvoices(commissionerInvoices);
        setFilteredInvoices(commissionerInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
        setInvoices([]);
        setFilteredInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [commissionerId, session, sessionStatus]);

  // Apply filters whenever filters or invoices change
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
  }, [invoices, activeTab]);

  const handleInvoiceClick = (invoice: InvoiceWithFreelancer) => {
    // Navigate to invoice detail page
    router.push(`/commissioner-dashboard/projects-and-invoices/invoices/invoice/${invoice.invoiceNumber}`);
  };



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage all your payments and invoices
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
              { key: 'all', label: 'All Invoices', count: invoices.length },
              { key: 'paid', label: 'Paid', count: invoices.filter(inv => inv.status === 'paid').length },
              { key: 'draft', label: 'Draft', count: invoices.filter(inv => inv.status === 'draft').length },
              { key: 'on_hold', label: 'Processing', count: invoices.filter(inv => inv.status === 'on_hold' || inv.status === 'sent').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'border-[#eb1966] text-[#eb1966]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
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
          <InvoiceHistoryTable
            invoices={filteredInvoices as any}
            onInvoiceClick={handleInvoiceClick}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}