'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSuccessToast, useErrorToast } from '../../../../../../components/ui/toast';

import ProposalPreviewHeader from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-preview-header';
import ProposalTimeline from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-timeline';
import ProposalProjectIdentity from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity';
import ProposalSummaryBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-summary-box';
import CommissionerProposalActions from '../../../../../../components/commissioner-dashboard/projects-and-invoices/received-proposals/commissioner-proposal-actions';

import { generateDraftProposal } from '@/lib/proposals/generate-draft';
import { DraftProposal, ProposalInput } from '@/lib/proposals/types';
import { LoadingInline } from '../../../../../../components/shared/loading-ellipsis';

export default function ReceivedProposalPage() {
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
      console.log(`🚀 FRONTEND: Starting proposal acceptance for ${proposalId}`);
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`📡 FRONTEND: Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ FRONTEND: Request failed with status ${res.status}:`, errorText);
        throw new Error(`Failed to accept proposal (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      console.log('✅ FRONTEND: Proposal accepted successfully:', result);

      // Update the local state to reflect the acceptance
      setData(prev => prev ? { ...prev, status: 'accepted' } : null);

      showSuccessToast('Proposal Accepted!', 'The project has been created and is now active.');

      // Redirect immediately - toast will show during transition
      if (result.projectId) {
        router.push(`/commissioner-dashboard/projects-and-invoices/project-tracking/${result.projectId}`);
      } else {
        // Fallback to active projects tab
        router.push('/commissioner-dashboard/projects-and-invoices?tab=active-projects');
      }
    } catch (err) {
      console.error('❌ FRONTEND: Failed to accept proposal:', err);
      showErrorToast('Failed to Accept Proposal', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const handleReject = async () => {
    try {
      console.log(`🚀 FRONTEND: Starting proposal rejection for ${proposalId}`);
      const res = await fetch(`/api/proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`📡 FRONTEND: Rejection response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ FRONTEND: Rejection failed with status ${res.status}:`, errorText);
        throw new Error(`Failed to reject proposal (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      console.log('✅ FRONTEND: Proposal rejected successfully:', result);

      // Update the local state to reflect the rejection
      setData(prev => prev ? { ...prev, status: 'rejected' } : null);

      showSuccessToast('Proposal Rejected', 'The proposal has been declined.');

      // Redirect immediately - toast will show during transition
      router.push('/commissioner-dashboard/projects-and-invoices?tab=received-proposals');
    } catch (err) {
      console.error('❌ FRONTEND: Failed to reject proposal:', err);
      showErrorToast('Failed to Reject Proposal', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  if (loading) {
    return <LoadingInline />;
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
    <main className="flex flex-col min-h-screen w-full max-w-6xl mx-auto bg-white">
      {/* Back Link */}
      <div className="px-4 md:px-12 pt-4">
        <Link href="/commissioner-dashboard/projects-and-invoices/recieved-proposals-list">
          <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
            ← Back to Received Proposals
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

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-12 pb-8 bg-white">
          {/* Timeline Section - Full width on mobile, flex-1 on desktop */}
          <div className="flex-1 order-1 lg:order-1">
            <ProposalTimeline />
          </div>

          {/* Action Buttons - Below timeline on mobile, sidebar on desktop */}
          <div className="w-full lg:w-[320px] shrink-0 order-2 lg:order-2">
            <div className="lg:sticky lg:top-[200px] flex flex-col gap-4">
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
              {data.status === 'sent' && (
                <CommissionerProposalActions
                  onAccept={handleAccept}
                  onReject={handleReject}
                  proposalData={calculated}
                />
              )}
            </div>
          </div>
        </div>
    </main>
  );
}