'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

type Props = {
  invoices: InvoiceWithFreelancer[];
  onInvoiceClick: (invoice: InvoiceWithFreelancer) => void;
  loading: boolean;
};

const PER_PAGE = 10;

import { getInvoiceStatusConfig } from '@/lib/invoice-status-definitions';

// Use the centralized status configuration
const getStatusDisplay = (status: string) => {
  const config = getInvoiceStatusConfig(status as any);
  return {
    color: `${config.bgColor} ${config.color}`,
    label: config.label
  };
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

export default function InvoiceHistoryTable({ invoices, onInvoiceClick, loading }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(invoices.length / PER_PAGE);
  const startIndex = (currentPage - 1) * PER_PAGE;
  const endIndex = startIndex + PER_PAGE;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Table Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="px-6 py-3">
          <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Task</div>
            <div>Date</div>
            <div>Status</div>
            <div>Amount</div>
            <div>Freelancer</div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        <AnimatePresence mode="wait">
          {currentInvoices.map((invoice, index) => (
            <motion.div
              key={`invoice-table-${invoice.invoiceNumber}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onInvoiceClick(invoice)}
            >
              <div className="grid grid-cols-5 gap-4 items-center">
                {/* Task Column */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {invoice.milestoneDescription}
                  </span>
                  <span className="text-xs text-gray-500">
                    {invoice.invoiceNumber} • Project #{invoice.projectId || 'Custom'}
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
                    ${invoice.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Milestone {invoice.milestoneNumber}
                  </span>
                </div>

                {/* Freelancer Column */}
                <div className="flex items-center gap-3">
                  <Image
                    src={invoice.freelancer.avatar}
                    alt={invoice.freelancer.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {invoice.freelancer.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {invoice.freelancer.title}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, invoices.length)} of {invoices.length} invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
