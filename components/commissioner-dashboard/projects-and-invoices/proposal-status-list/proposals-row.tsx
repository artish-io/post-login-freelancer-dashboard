'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

type Proposal = {
  id: string;
  title: string;
  summary: string;
  totalBid: number;
  status: 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  sentAt?: string;
  freelancerId?: number;
  commissionerId?: number;
  typeTags?: string[];
  executionMethod?: 'completion' | 'milestone';
};

type User = {
  id: number;
  name: string;
  type: 'freelancer' | 'commissioner';
};

type Props = {
  proposals: Proposal[];
  users: User[];
  filterStatus: 'sent' | 'accepted' | 'rejected';
};

export default function ProposalsRow({ proposals, users, filterStatus }: Props) {
  const router = useRouter();

  // Filter proposals by status
  const filteredProposals = proposals.filter(proposal => proposal.status === filterStatus);

  const handleProposalClick = (proposalId: string) => {
    router.push(`/commissioner-dashboard/projects-and-invoices/recieved-proposals/${proposalId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
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
        return 'New';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (filteredProposals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No {filterStatus === 'sent' ? 'new' : filterStatus} proposals
        </h3>
        <p className="text-sm text-gray-500">
          {filterStatus === 'sent' 
            ? 'New proposals will appear here when freelancers send them to you.'
            : `You haven't ${filterStatus} any proposals yet.`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredProposals.map((proposal) => {
        const freelancer = users.find(user => user.id === proposal.freelancerId);
        
        return (
          <div
            key={proposal.id}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gray-300"
            onClick={() => handleProposalClick(proposal.id)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {proposal.title || 'Untitled Proposal'}
                </h3>
                {proposal.typeTags && proposal.typeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {proposal.typeTags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {proposal.typeTags.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        +{proposal.typeTags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${getStatusColor(proposal.status)}`}>
                {getStatusLabel(proposal.status)}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {proposal.summary || 'No description provided'}
            </p>
            
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  From: {freelancer?.name || 'Unknown Freelancer'}
                </span>
                <span className="font-medium text-gray-900">
                  ${proposal.totalBid?.toLocaleString() || 'N/A'}
                </span>
                {proposal.executionMethod && (
                  <span className="capitalize">
                    {proposal.executionMethod} based
                  </span>
                )}
              </div>
              <span>
                {proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : 
                 new Date(proposal.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
