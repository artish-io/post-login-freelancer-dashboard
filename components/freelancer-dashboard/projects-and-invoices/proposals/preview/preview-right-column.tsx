'use client';

import ProposalSummaryBox from './proposal-summary-box';
import PreviewActionButtons from './preview-action-buttons';

type Props = {
  totalBid: number;
  paymentCycle: string;
  depositRate?: number;
  hourlyRate?: number;
  startDate?: string | null;
  endDate?: string | null;
  data: any;
};

export default function PreviewRightColumn({
  totalBid,
  paymentCycle,
  depositRate,
  hourlyRate,
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
          paymentCycle={paymentCycle}
          depositRate={depositRate}
          hourlyRate={hourlyRate}
          startDate={startDate}
          endDate={endDate}
        />
        <PreviewActionButtons data={data} />
      </div>
    </aside>
  );
}