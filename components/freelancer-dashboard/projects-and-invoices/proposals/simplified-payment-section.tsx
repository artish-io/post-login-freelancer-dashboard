'use client';

import CompletionPaymentForm from './completion-payment-form';
import MilestonePaymentForm from './milestone-payment-form';

type Props = {
  executionMethod: 'completion' | 'milestone';
  totalAmount: string;
  onTotalAmountChange: (val: string) => void;
  milestoneCount: number;
};

export default function SimplifiedPaymentSection({
  executionMethod,
  totalAmount,
  onTotalAmountChange,
  milestoneCount,
}: Props) {
  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      {executionMethod === 'completion' ? (
        <CompletionPaymentForm
          totalAmount={totalAmount}
          onTotalAmountChange={onTotalAmountChange}
          executionMethod={executionMethod}
        />
      ) : (
        <MilestonePaymentForm
          totalBudget={totalAmount}
          onTotalBudgetChange={onTotalAmountChange}
          executionMethod={executionMethod}
          milestoneCount={milestoneCount}
        />
      )}
    </div>
  );
}
