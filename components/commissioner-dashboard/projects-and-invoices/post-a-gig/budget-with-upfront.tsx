'use client';

import { useState, useEffect } from 'react';

type Props = {
  executionMethod: 'completion' | 'milestone';
  lowerBudget: string;
  onLowerBudgetChange: (val: string) => void;
  upperBudget: string;
  onUpperBudgetChange: (val: string) => void;
};

export default function BudgetWithUpfront({
  executionMethod,
  lowerBudget,
  onLowerBudgetChange,
  upperBudget,
  onUpperBudgetChange,
}: Props) {
  const [lowerUpfront, setLowerUpfront] = useState<number>(0);
  const [upperUpfront, setUpperUpfront] = useState<number>(0);

  // Auto-calculate upfront commitments for completion-based payment
  useEffect(() => {
    if (executionMethod === 'completion') {
      const lower = Number(lowerBudget) || 0;
      const upper = Number(upperBudget) || 0;
      setLowerUpfront(lower * 0.12); // 12% upfront
      setUpperUpfront(upper * 0.12); // 12% upfront
    } else {
      setLowerUpfront(0);
      setUpperUpfront(0);
    }
  }, [lowerBudget, upperBudget, executionMethod]);

  return (
    <div className="space-y-6">
      {/* Budget Range */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Estimated budget range (Lower Limit)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={lowerBudget}
              onChange={(e) => onLowerBudgetChange(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Estimated budget range (Upper Limit)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={upperBudget}
              onChange={(e) => onUpperBudgetChange(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
            />
          </div>
        </div>
      </div>

      {/* Upfront Commitment Display for Completion-based Payment */}
      {executionMethod === 'completion' && (Number(lowerBudget) > 0 || Number(upperBudget) > 0) && (
        <div className="bg-[#FCD5E3] rounded-xl p-4 border border-[#eb1966]/20">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Upfront Commitment (12% of budget range)
          </h4>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Lower Range Upfront:</span>
              <span className="text-sm font-semibold text-[#eb1966]">
                ${lowerUpfront.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Upper Range Upfront:</span>
              <span className="text-sm font-semibold text-[#eb1966]">
                ${upperUpfront.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-600">
            💡 When you accept a proposal, 12% of the agreed amount will be automatically paid upfront to the freelancer.
          </div>
        </div>
      )}

      {/* Milestone Payment Info */}
      {executionMethod === 'milestone' && (Number(lowerBudget) > 0 || Number(upperBudget) > 0) && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Milestone-based Payment
          </h4>
          <div className="text-xs text-gray-600">
            💡 Payment will be distributed evenly across project milestones. You'll pay upon milestone completion and approval.
          </div>
        </div>
      )}
    </div>
  );
}
