'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { ArrowUpLeft, ArrowDownRight } from 'lucide-react';

type Props = {
  name: string;
  company: string;
  commissioner?: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
};

export default function WalletHistoryItem({
  name,
  company,
  commissioner,
  type,
  amount,
  currency
}: Props) {
  const isCredit = type === 'credit';
  const Icon = isCredit ? ArrowUpLeft : ArrowDownRight;
  const sign = isCredit ? '+' : '−';

  return (
    <div className="flex items-center justify-between text-sm text-gray-700">
      <div className="flex items-center gap-3">
        {/* Dynamic logo if available */}
        {company.toLowerCase().includes('amazon') ? (
          <Image
            src="/icons/companies/amazon.png"
            alt="Amazon"
            width={20}
            height={20}
            className="rounded"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold">
            {company[0] || '?'}
          </div>
        )}

        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-gray-400 text-xs">
            {commissioner ? `${company} • ${commissioner}` : company}
          </span>
        </div>
      </div>

      <div className={clsx('font-semibold flex items-center gap-1', isCredit ? 'text-green-600' : 'text-red-500')}>
        <Icon size={12} />
        {sign}${amount.toFixed(2)}
        <span className="text-gray-400 text-xs">{currency}</span>
      </div>
    </div>
  );
}