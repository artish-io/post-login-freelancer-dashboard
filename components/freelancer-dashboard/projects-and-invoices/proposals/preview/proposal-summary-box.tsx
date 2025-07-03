'use client';

import { differenceInCalendarWeeks, parseISO } from 'date-fns';

type Props = {
  totalBid: number;
  paymentCycle: string;
  depositRate?: number;
  hourlyRate?: number;
  startDate?: string | null;
  endDate?: string | null;
};

export default function ProposalSummaryBox({
  totalBid,
  paymentCycle,
  depositRate,
  hourlyRate,
  startDate,
  endDate,
}: Props) {
  let durationInWeeks: number | null = null;

  if (startDate && endDate) {
    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
      durationInWeeks = differenceInCalendarWeeks(end, start);
    } catch {
      durationInWeeks = null;
    }
  }

  return (
    <div className="bg-white border border-gray-300 rounded-2xl px-5 py-4 w-full max-w-xs">
      <div className="flex justify-between text-sm text-gray-800 mb-2">
        <span className="font-medium">Proposed Bid:</span>
        <span className="font-semibold">${totalBid.toLocaleString()}</span>
      </div>

      <div className="flex justify-between text-sm text-gray-800 mb-2">
        <span className="font-medium">Payment Cycle:</span>
        <span className="font-semibold">{paymentCycle}</span>
      </div>

      {paymentCycle === 'Hourly Rate' && hourlyRate !== undefined && (
        <div className="flex justify-between text-sm text-gray-800 mb-2">
          <span className="font-medium">Hourly Rate:</span>
          <span className="font-semibold">${hourlyRate}/hr</span>
        </div>
      )}

      {paymentCycle === 'Fixed Amount' && depositRate !== undefined && (
        <div className="flex justify-between text-sm text-gray-800 mb-2">
          <span className="font-medium">Upfront Commitment:</span>
          <span className="font-semibold">{depositRate}%</span>
        </div>
      )}

      {durationInWeeks !== null && (
        <div className="flex justify-between text-sm text-gray-800">
          <span className="font-medium">Project Duration:</span>
          <span className="font-semibold">{durationInWeeks} week{durationInWeeks !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}