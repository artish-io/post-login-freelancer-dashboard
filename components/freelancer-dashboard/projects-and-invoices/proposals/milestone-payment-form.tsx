'use client';

import { useState, useEffect } from 'react';

type Props = {
  totalBudget: string;
  onTotalBudgetChange: (val: string) => void;
  executionMethod: 'completion' | 'milestone';
  milestoneCount: number;
};

export default function MilestonePaymentForm({
  totalBudget,
  onTotalBudgetChange,
  executionMethod,
  milestoneCount,
}: Props) {
  const [amountPerMilestone, setAmountPerMilestone] = useState<number>(0);

  // Auto-calculate amount per milestone
  useEffect(() => {
    const total = Number(totalBudget) || 0;
    if (total > 0 && milestoneCount > 0 && executionMethod === 'milestone') {
      const perMilestone = total / milestoneCount;
      setAmountPerMilestone(perMilestone);
    } else {
      setAmountPerMilestone(0);
    }
  }, [totalBudget, milestoneCount, executionMethod]);

  if (executionMethod !== 'milestone') {
    return null;
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <label className="text-sm text-black font-medium">
        Milestone-based Payment Details
      </label>

      {/* Total Budget Input */}
      <div className="flex flex-col gap-1">
        <label className="text-black text-xs font-normal pl-1">
          Total Project Budget
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            $
          </span>
          <input
            type="number"
            value={totalBudget}
            onChange={(e) => onTotalBudgetChange(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
          />
        </div>
      </div>

      {/* Auto-calculated Milestone Breakdown Display */}
      {Number(totalBudget) > 0 && milestoneCount > 0 && (
        <div className="bg-[#FCD5E3] rounded-xl p-4 border border-[#eb1966]/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Number of Milestones
            </span>
            <span className="text-sm font-semibold text-[#eb1966]">
              {milestoneCount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Amount per Milestone
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ${amountPerMilestone.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            💡 The total budget will be evenly distributed across all milestones. Payment is executed upon milestone completion and approval.
          </div>
        </div>
      )}

      {milestoneCount === 0 && Number(totalBudget) > 0 && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <div className="text-sm text-yellow-800">
            ⚠️ Please add milestones below to see the payment breakdown.
          </div>
        </div>
      )}
    </div>
  );
}
