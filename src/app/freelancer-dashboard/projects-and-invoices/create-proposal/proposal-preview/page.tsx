'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import ProposalPreviewHeader from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-preview-header';
import ProposalTimeline from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-timeline';
import ProposalProjectIdentity from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity';
import PreviewRightColumn from '../../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/preview/preview-right-column';

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
    <div className="px-6 md:px-12 pt-6 pb-12 bg-white">
      <div className="max-w-[1440px] mx-auto relative">

        {/* Back Link */}
        <Link href="/freelancer-dashboard/projects-and-invoices/create-proposal">
          <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
            ← Back
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
            <PreviewRightColumn
              totalBid={calculated.totalBid}
              paymentCycle={data.paymentCycle || '—'}
              depositRate={
                data.paymentCycle === 'Fixed Amount' && data.depositRate !== undefined
                  ? Number(data.depositRate)
                  : undefined
              }
              hourlyRate={
                data.paymentCycle === 'Hourly Rate' && data.rate !== undefined
                  ? Number(data.rate)
                  : undefined
              }
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
              data={calculated}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}