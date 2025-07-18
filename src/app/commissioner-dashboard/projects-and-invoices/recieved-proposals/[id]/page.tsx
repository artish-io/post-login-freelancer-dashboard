'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import ProposalPreviewHeader from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-preview-header';
import ProposalTimeline from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-timeline';
import ProposalProjectIdentity from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity';
import ProposalSummaryBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-summary-box';
import CommissionerProposalActions from '../../../../../../components/commissioner-dashboard/projects-and-invoices/received-proposals/commissioner-proposal-actions';

import { generateDraftProposal } from '@/lib/proposals/generate-draft';
import { DraftProposal, ProposalInput } from '@/lib/proposals/types';

export default function ReceivedProposalPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [data, setData] = useState<ProposalInput | null>(null);
  const [calculated, setCalculated] = useState<DraftProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposal() {
      try {
        const res = await fetch(`/api/proposals/${proposalId}`);
        if (!res.ok) {
          throw new Error('Proposal not found');
        }
        const json = await res.json();
        setData(json);
        const draft = generateDraftProposal(json);
        setCalculated(draft);
      } catch (err) {
        console.error('Failed to load proposal:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    }

    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to accept proposal');

      // Redirect to project dashboard or success page
      router.push('/commissioner-dashboard/projects-and-invoices?tab=active-projects');
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      alert('Failed to accept proposal. Please try again.');
    }
  };

  const handleReject = async () => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to reject proposal');

      // Redirect back to received proposals list
      router.push('/commissioner-dashboard/projects-and-invoices?tab=received-proposals');
    } catch (err) {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal. Please try again.');
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-500 text-sm">Loading proposal...</p>;
  }

  if (error || !data || !calculated) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm mb-4">{error || 'Failed to load proposal'}</p>
        <Link href="/commissioner-dashboard/projects-and-invoices?tab=received-proposals">
          <span className="text-sm text-gray-600 hover:text-pink-600">← Back to Received Proposals</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-12 pt-6 pb-12 bg-white">
      <div className="max-w-[1440px] mx-auto relative">

        {/* Back Link */}
        <Link href="/commissioner-dashboard/projects-and-invoices?tab=received-proposals">
          <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
            ← Back to Received Proposals
          </span>
        </Link>

        {/* Sticky Project Identity */}
        <div className="sticky top-[80px] z-50 bg-white pb-4">
          <ProposalPreviewHeader
            projectId={calculated.projectId ?? ''}
            tags={data.typeTags ?? []}
          />
          <ProposalProjectIdentity
            logoUrl={data.logoUrl ?? ''}
            title={data.title ?? ''}
            summary={data.summary ?? ''}
          />
        </div>

        {/* Main Flex Layout */}
        <div className="relative w-full overflow-visible">
        <div className="mt-6 flex flex-col md:flex-row gap-12 items-start">

          {/* Timeline Scrollable Column */}
          <div className="flex-1 min-w-0 relative z-10 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
            <ProposalTimeline />
          </div>

          {/* Sticky Right Column */}
          <div className="w-full md:w-[320px] shrink-0 relative z-20">
            <aside className="w-full md:w-[320px] shrink-0">
              <div className="relative h-fit w-full md:max-w-xs md:sticky md:top-[136px] flex flex-col gap-4">
                <ProposalSummaryBox
                  totalBid={calculated.totalBid}
                  executionMethod={data.executionMethod}
                  upfrontAmount={calculated.upfrontAmount}
                  upfrontPercentage={calculated.upfrontPercentage}
                  startDate={
                    data.customStartDate
                      ? typeof data.customStartDate === 'string'
                        ? data.customStartDate
                        : data.customStartDate.toISOString()
                      : new Date().toISOString()
                  }
                  endDate={
                    data.endDate
                      ? typeof data.endDate === 'string'
                        ? data.endDate
                        : data.endDate.toISOString()
                      : undefined
                  }
                />
                <CommissionerProposalActions
                  onAccept={handleAccept}
                  onReject={handleReject}
                  proposalData={calculated}
                />
              </div>
            </aside>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}