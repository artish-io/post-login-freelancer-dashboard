'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSuccessToast, useErrorToast } from '../../../../../../components/ui/toast';

import ProposalPreviewHeader from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-preview-header';
import ProposalTimeline from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-timeline';
import ProposalProjectIdentity from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity';
import ProposalSummaryBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-summary-box';

import { generateDraftProposal } from '@/lib/proposals/generate-draft';
import { DraftProposal, ProposalInput } from '@/lib/proposals/types';
import { LoadingPage } from '../../../../../../components/shared/loading-ellipsis';

export default function FreelancerProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const [data, setData] = useState<ProposalInput | null>(null);
  const [calculated, setCalculated] = useState<DraftProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  const fetchProposal = async () => {
    try {
      console.log(`🚀 FRONTEND: Fetching proposal ${proposalId}`);
      const response = await fetch(`/api/proposals/${proposalId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch proposal: ${response.status}`);
      }

      const proposalData = await response.json();
      console.log('✅ FRONTEND: Proposal data received:', proposalData);
      
      setData(proposalData);
      
      // Generate calculated proposal for display
      const draft = generateDraftProposal(proposalData);
      setCalculated(draft);
      
    } catch (err) {
      console.error('❌ FRONTEND: Failed to fetch proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      showErrorToast('Failed to Load Proposal', 'Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Pending Review';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (error || !data || !calculated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The proposal you are looking for does not exist.'}</p>
          <Link
            href="/freelancer-dashboard/projects-and-invoices/proposals"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
          >
            Back to Proposals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-12 py-4">
        <Link href="/freelancer-dashboard/projects-and-invoices/proposals">
          <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
            ← Back to My Proposals
          </span>
        </Link>
      </div>

      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white px-4 md:px-12 pt-4 pb-6">
        <div className="flex flex-col gap-6">
          <ProposalPreviewHeader
            projectId={data.status === 'accepted' ? (data.projectId ?? data.id ?? '') : (data.id ?? '')}
            tags={data.typeTags ?? []}
            isProposal={data.status !== 'accepted'}
          />
          <ProposalProjectIdentity
            logoUrl={data.logoUrl ?? ''}
            title={data.title ?? ''}
            summary={data.summary ?? ''}
          />
        </div>
      </div>

      {/* Status Banner */}
      {data.status && (
        <div className="px-4 md:px-12 mb-6">
          <div className={`rounded-lg border p-4 ${getStatusColor(data.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Status: {getStatusLabel(data.status)}</h3>
                <p className="text-sm mt-1">
                  {data.status === 'sent' && 'Your proposal is under review by the client.'}
                  {data.status === 'accepted' && 'Congratulations! Your proposal has been accepted and the project is now active.'}
                  {data.status === 'rejected' && 'Unfortunately, your proposal was not selected for this project.'}
                </p>
              </div>
              {data.status === 'accepted' && data.projectId && (
                <Link
                  href={`/freelancer-dashboard/projects-and-invoices?tab=active-projects`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  View Project
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 md:px-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2">
            <ProposalTimeline
              milestones={calculated.milestones}
              startDate={calculated.startDate}
              endDate={calculated.endDate}
              executionMethod={calculated.executionMethod}
            />
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <ProposalSummaryBox
                totalBid={calculated.totalBid}
                timeline={calculated.timeline}
                executionMethod={calculated.executionMethod}
                milestones={calculated.milestones}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
