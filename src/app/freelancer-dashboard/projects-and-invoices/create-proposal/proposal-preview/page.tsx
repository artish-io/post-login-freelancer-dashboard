'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import ProposalPreviewHeader from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-preview-header';
import ProposalTimeline from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-timeline';
import ProposalProjectIdentity from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity';
import ProposalSummaryBox from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-summary-box';

import { generateDraftProposal } from '@/lib/proposals/generate-draft';
import { DraftProposal, ProposalInput } from '@/lib/proposals/types';

export default function ProposalPreviewPage() {
  const [data, setData] = useState<ProposalInput | null>(null);
  const [calculated, setCalculated] = useState<DraftProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch('/api/proposals/preview-cache');
        const json = await res.json();
        setData(json);
        const draft = generateDraftProposal(json);
        setCalculated(draft);
      } catch (err) {
        console.error('Failed to load preview cache:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, []);

  if (loading) {
    return <p className="p-6 text-gray-500 text-sm">Loading proposal preview...</p>;
  }

  if (!data || !calculated) {
    return <p className="p-6 text-red-500 text-sm">Failed to load preview</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-12 py-4">
        <Link href="/freelancer-dashboard/projects-and-invoices/create-proposal">
          <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
            ← Back to Create Proposal
          </span>
        </Link>
      </div>

      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white px-4 md:px-12 pt-4 pb-6">
        <div className="flex flex-col gap-6">
          <ProposalPreviewHeader
            projectId={calculated.projectId ?? 'PREVIEW'}
            tags={data.typeTags ?? []}
            isProposal={true}
          />
          <ProposalProjectIdentity
            logoUrl={data.logoUrl ?? ''}
            title={data.title ?? ''}
            summary={data.summary ?? ''}
          />
        </div>
      </div>

      {/* Preview Banner */}
      <div className="px-4 md:px-12 mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Proposal Preview</h3>
              <p className="text-sm mt-1 text-blue-800">
                This is how your proposal will appear to the client. Review all details before sending.
              </p>
            </div>
            <Link
              href="/freelancer-dashboard/projects-and-invoices/create-proposal"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Edit Proposal
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2">
            <ProposalTimeline />
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <ProposalSummaryBox
                totalBid={calculated.totalBid}
                executionMethod={calculated.executionMethod}
                upfrontAmount={calculated.upfrontAmount}
                upfrontPercentage={calculated.upfrontPercentage}
                startDate={
                  calculated.startDate
                    ? typeof calculated.startDate === 'string'
                      ? calculated.startDate
                      : calculated.startDate.toISOString()
                    : null
                }
                endDate={
                  calculated.endDate
                    ? typeof calculated.endDate === 'string'
                      ? calculated.endDate
                      : calculated.endDate.toISOString()
                    : null
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}