'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import InvoiceHistoryTable from '../../../../../../components/commissioner-dashboard/projects-and-invoices/invoice-history/invoice-history-table';
import AccountHistoryTable from '../../../../../../components/commissioner-dashboard/projects-and-invoices/invoice-history/account-history-table';
import InvoiceHistoryFilters from '../../../../../../components/commissioner-dashboard/projects-and-invoices/invoice-history/invoice-history-filters';

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

export default function InvoiceHistoryPage() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [invoices, setInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'date-desc'
  });

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

    // If we're on the Account History tab, aggregate by project
    if (activeTab === 'account-history') {
      // Group invoices by parentInvoiceNumber (project)
      const projectGroups = filtered.reduce((acc, invoice) => {
        const projectKey = invoice.parentInvoiceNumber;

        if (!acc[projectKey]) {
          acc[projectKey] = {
            invoiceNumber: projectKey,
            freelancerId: invoice.freelancerId,
            projectId: invoice.projectId,
            commissionerId: invoice.commissionerId,
            projectTitle: invoice.projectTitle,
            milestoneDescription: `Project #${invoice.projectId}`,
            milestoneNumber: 0,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            totalAmount: 0,
            status: 'paid' as const,
            milestones: [],
            parentInvoiceNumber: projectKey,
            freelancer: invoice.freelancer,
            invoiceCount: 0,
            completedInvoices: 0
          };
        }

        // Aggregate data
        acc[projectKey].totalAmount += invoice.totalAmount;
        acc[projectKey].invoiceCount++;
        if (invoice.status === 'paid') {
          acc[projectKey].completedInvoices++;
        }

        // Update dates to show project span
        if (new Date(invoice.issueDate) < new Date(acc[projectKey].issueDate)) {
          acc[projectKey].issueDate = invoice.issueDate;
        }
        if (new Date(invoice.dueDate) > new Date(acc[projectKey].dueDate)) {
          acc[projectKey].dueDate = invoice.dueDate;
        }

        return acc;
      }, {} as any);

      // Convert to array and determine project status
      filtered = Object.values(projectGroups).map((project: any) => {
        // Determine overall project status
        if (project.completedInvoices === project.invoiceCount) {
          project.status = 'paid'; // All milestones completed
        } else if (project.completedInvoices > 0) {
          project.status = 'sent'; // Partially completed
        } else {
          project.status = 'draft'; // Not started
        }

        return project;
      });
    }

    // Filter by status - map UI filter values to actual data values
    if (filters.status !== 'all') {
      // Map UI filter values to actual invoice status values
      const statusMapping: { [key: string]: string } = {
        'paid': 'paid',        // Completed -> paid
        'cancelled': 'cancelled', // Cancelled -> cancelled (doesn't exist in current data)
        'sent': 'sent',        // On Hold -> sent
        'failed': 'failed',    // Failed -> failed (doesn't exist in current data)
        'pending': 'pending',  // Pending -> pending (doesn't exist in current data)
        'draft': 'draft'       // Processing -> draft
      };

      const actualStatus = statusMapping[filters.status] || filters.status;
      filtered = filtered.filter(invoice => invoice.status === actualStatus);
    }

    // Sort invoices
    switch (filters.sortBy) {
      case 'order':
        filtered.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
        break;
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        break;
      case 'amount-desc':
        filtered.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'name':
        filtered.sort((a, b) => a.freelancer.name.localeCompare(b.freelancer.name));
        break;
      default:
        filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        break;
    }

    setFilteredInvoices(filtered);
  }, [filters, invoices, activeTab]);

  const handleInvoiceClick = (invoice: InvoiceWithFreelancer) => {
    // Navigate to invoice detail page
    window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices?invoice=${invoice.invoiceNumber}`;
  };

  const handleProjectClick = (project: any) => {
    // Navigate to project-level invoice overview page
    const projectId = project.projectId;
    const parentInvoiceNumber = project.parentInvoiceNumber;

    if (parentInvoiceNumber) {
      window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices/project?parentInvoice=${parentInvoiceNumber}`;
    } else if (projectId) {
      window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices/project?projectId=${projectId}`;
    } else {
      // Fallback to individual invoice view
      window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices?invoice=${project.invoiceNumber}`;
    }
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
              {filteredInvoices.length} {activeTab === 'invoices' ? 'invoices' : 'projects'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('account-history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'account-history'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Account History
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <>
        {/* Filters */}
        <div className="border-b border-gray-200 bg-white">
          <div className="px-6 py-4">
            <InvoiceHistoryFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white">
          {activeTab === 'invoices' ? (
            <InvoiceHistoryTable
              invoices={filteredInvoices}
              onInvoiceClick={handleInvoiceClick}
              loading={loading}
            />
          ) : (
            <AccountHistoryTable
              projects={filteredInvoices as any}
              onProjectClick={handleProjectClick}
              loading={loading}
            />
          )}
        </div>
      </>
    </div>
  );
}