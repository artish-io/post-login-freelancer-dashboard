'use client';

import ProposalSummaryBox from './proposal-summary-box';
import PreviewActionButtons from './preview-action-buttons';

type Props = {
  totalBid: number;
  executionMethod?: 'completion' | 'milestone';
  upfrontAmount?: number;
  upfrontPercentage?: number;
  startDate?: string | null;
  endDate?: string | null;
  data: any;
};

export default function PreviewRightColumn({
  totalBid,
  executionMethod,
  upfrontAmount,
  upfrontPercentage,
  startDate,
  endDate,
  data,
}: Props) {
  return (
    <aside className="w-full md:w-[320px] shrink-0">
      <div className="relative h-fit w-full md:max-w-xs md:sticky md:top-[136px] flex flex-col gap-4">
        {/* ↑ top-[136px] = nav (80px) + project header/summary (~56px buffer) */}
        <ProposalSummaryBox
          totalBid={totalBid}
          executionMethod={executionMethod}
          upfrontAmount={upfrontAmount}
          upfrontPercentage={upfrontPercentage}
          startDate={startDate}
          endDate={endDate}
        />
        <PreviewActionButtons data={data} />
      </div>
    </aside>
  );
}