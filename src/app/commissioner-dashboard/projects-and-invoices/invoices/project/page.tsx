'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import CommissionerHeader from '../../../../../../components/commissioner-dashboard/commissioner-header';

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

export default function ProjectInvoiceOverviewPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [projectInvoices, setProjectInvoices] = useState<InvoiceWithFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = searchParams.get('projectId');
  const parentInvoiceNumber = searchParams.get('parentInvoice');

  useEffect(() => {
    const loadProjectInvoices = async () => {
      try {
        if (!projectId && !parentInvoiceNumber) {
          setError('No project identifier provided');
          setLoading(false);
          return;
        }

        setLoading(true);

        // Load invoices and users data
        const [invoicesResponse, usersResponse] = await Promise.all([
          fetch('/api/invoices'),
          fetch('/api/users')
        ]);

        if (!invoicesResponse.ok || !usersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const invoicesData = await invoicesResponse.json();
        const usersData = await usersResponse.json();

        // Filter invoices for this project
        let filteredInvoices = invoicesData;
        
        if (parentInvoiceNumber) {
          filteredInvoices = invoicesData.filter((invoice: Invoice) => 
            invoice.parentInvoiceNumber === parentInvoiceNumber
          );
        } else if (projectId) {
          filteredInvoices = invoicesData.filter((invoice: Invoice) => 
            invoice.projectId === parseInt(projectId)
          );
        }

        // Enrich with freelancer data
        const enrichedInvoices = filteredInvoices.map((invoice: Invoice) => {
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

        // Sort by milestone number
        enrichedInvoices.sort((a, b) => a.milestoneNumber - b.milestoneNumber);

        setProjectInvoices(enrichedInvoices);
      } catch (error) {
        console.error('Error loading project invoices:', error);
        setError('Failed to load project invoices');
      } finally {
        setLoading(false);
      }
    };

    loadProjectInvoices();
  }, [projectId, parentInvoiceNumber]);

  const handleInvoiceClick = (invoice: InvoiceWithFreelancer) => {
    window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices?invoice=${invoice.invoiceNumber}`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-gray-500 text-center">Loading project invoices...</div>
      </div>
    );
  }

  if (error || projectInvoices.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
        <CommissionerHeader />
        <div className="mt-10 p-10 text-center">
          <p className="text-red-500 mb-4">{error || 'No invoices found for this project'}</p>
          <Link href="/commissioner-dashboard/projects-and-invoices/invoices/invoice-history">
            <span className="text-sm text-gray-600 hover:text-pink-600">← Back to Invoice History</span>
          </Link>
        </div>
      </div>
    );
  }

  const projectTitle = projectInvoices[0]?.projectTitle || 'Unknown Project';
  const totalProjectAmount = projectInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidAmount = projectInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const pendingAmount = totalProjectAmount - paidAmount;
  const completionPercentage = totalProjectAmount > 0 ? Math.round((paidAmount / totalProjectAmount) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12">
      <CommissionerHeader />
      
      {/* Back Navigation */}
      <div className="mt-6 mb-8">
        <Link href="/commissioner-dashboard/projects-and-invoices/invoices/invoice-history">
          <span className="text-sm text-gray-600 hover:text-pink-600">← Back to Invoice History</span>
        </Link>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={projectInvoices[0]?.freelancer.avatar || '/default-avatar.png'}
              alt={projectInvoices[0]?.freelancer.name || 'Freelancer'}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{projectTitle}</h1>
              <p className="text-sm text-gray-500 mb-1">
                Project ID: #{projectInvoices[0]?.projectId || 'Custom'} •
                {projectInvoices.length} milestone{projectInvoices.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-600">
                Freelancer: {projectInvoices[0]?.freelancer.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-gray-900">${totalProjectAmount.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Project Value</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Project Progress</span>
            <span className="text-sm text-gray-500">{completionPercentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-800">${totalProjectAmount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-green-800">${paidAmount.toLocaleString()}</div>
            <div className="text-sm text-green-600">Paid</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-yellow-800">${pendingAmount.toLocaleString()}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Milestones & Payments</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {projectInvoices.map((invoice) => (
            <div
              key={invoice.invoiceNumber}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleInvoiceClick(invoice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src={invoice.freelancer.avatar}
                    alt={invoice.freelancer.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      Milestone {invoice.milestoneNumber}: {invoice.milestoneDescription.replace(/^Milestone \d+ for /, '')}
                    </div>
                    <div className="text-sm text-gray-500">
                      Invoice #{invoice.invoiceNumber} • Issued: {new Date(invoice.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">${invoice.totalAmount.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'sent'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Sent' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
