'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSuccessToast, useErrorToast } from '../../../../../components/ui/toast';

interface Proposal {
  id: string;
  title: string;
  proposalTitle?: string;
  status: 'sent' | 'accepted' | 'rejected';
  budget: number;
  totalBid?: number;
  commissionerEmail: string;
  organizationName?: string;
  sentAt: string;
  createdAt: string;
  milestones?: Array<{
    title: string;
    amount: number;
    dueDate: string;
  }>;
}

export default function FreelancerProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/proposals');
      if (!response.ok) throw new Error('Failed to fetch proposals');
      
      const data = await response.json();
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      showErrorToast('Failed to Load Proposals', 'Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    switch (activeTab) {
      case 'pending':
        return proposal.status === 'sent';
      case 'accepted':
        return proposal.status === 'accepted';
      case 'rejected':
        return proposal.status === 'rejected';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Proposals</h1>
          <p className="mt-2 text-gray-600">Track and manage your submitted proposals</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'pending', label: 'Pending', count: proposals.filter(p => p.status === 'sent').length },
              { key: 'accepted', label: 'Accepted', count: proposals.filter(p => p.status === 'accepted').length },
              { key: 'rejected', label: 'Rejected', count: proposals.filter(p => p.status === 'rejected').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} proposals
            </h3>
            <p className="text-gray-500">
              {activeTab === 'pending' 
                ? "You haven't sent any proposals yet." 
                : `You don't have any ${activeTab} proposals.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {proposal.title || proposal.proposalTitle}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                        {getStatusLabel(proposal.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Client:</span> {proposal.commissionerEmail}
                      </div>
                      <div>
                        <span className="font-medium">Budget:</span> {formatCurrency(proposal.budget || proposal.totalBid || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Sent:</span> {formatDate(proposal.sentAt || proposal.createdAt)}
                      </div>
                    </div>

                    {proposal.milestones && proposal.milestones.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">
                          {proposal.milestones.length} milestone{proposal.milestones.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <a
                      href={`/freelancer-dashboard/projects-and-invoices/proposals/${proposal.id}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create New Proposal Button */}
        <div className="mt-8 text-center">
          <a
            href="/freelancer-dashboard/projects-and-invoices/create-proposal"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            Create New Proposal
          </a>
        </div>
      </div>
    </div>
  );
}
