'use client';

import { useState, useEffect } from 'react';

type Props = {
  totalAmount: string;
  onTotalAmountChange: (val: string) => void;
  executionMethod: 'completion' | 'milestone';
};

export default function CompletionPaymentForm({
  totalAmount,
  onTotalAmountChange,
  executionMethod,
}: Props) {
  const [upfrontAmount, setUpfrontAmount] = useState<number>(0);
  const [upfrontPercentage, setUpfrontPercentage] = useState<number>(0);

  // Auto-calculate upfront commitment (12% of total amount)
  useEffect(() => {
    const total = Number(totalAmount) || 0;
    if (total > 0 && executionMethod === 'completion') {
      const upfront = total * 0.12; // 12% upfront commitment
      setUpfrontAmount(upfront);
      setUpfrontPercentage(12);
    } else {
      setUpfrontAmount(0);
      setUpfrontPercentage(0);
    }
  }, [totalAmount, executionMethod]);

  if (executionMethod !== 'completion') {
    return null;
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <label className="text-sm text-black font-medium">
        Completion-based Payment Details
      </label>

      {/* Total Amount Input */}
      <div className="flex flex-col gap-1">
        <label className="text-black text-xs font-normal pl-1">
          Total Project Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            $
          </span>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => onTotalAmountChange(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
          />
        </div>
      </div>

      {/* Auto-calculated Upfront Commitment Display */}
      {Number(totalAmount) > 0 && (
        <div className="bg-[#FCD5E3] rounded-xl p-4 border border-[#eb1966]/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Upfront Commitment (12%)
            </span>
            <span className="text-sm font-semibold text-[#eb1966]">
              ${upfrontAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Remaining on Completion
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ${(Number(totalAmount) - upfrontAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            💡 The upfront commitment (12% of total amount) will be automatically executed when the commissioner accepts your proposal.
          </div>
        </div>
      )}
    </div>
  );
}
