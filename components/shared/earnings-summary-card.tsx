'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownToLine, BarChart3 } from 'lucide-react';

type WalletTransaction = {
  id: number;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  date: string;
};

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range?: RangeOption;
  onToggleChart?: () => void;
  showChart?: boolean;
  isCleanVersion?: boolean;
  userType?: 'freelancer' | 'commissioner';
};

export default function EarningsSummaryCard({
  range,
  onToggleChart,
  showChart,
  isCleanVersion,
  userType = 'freelancer'
}: Props = {}) {
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        // Use different API endpoints based on user type
        const currentRange = range || 'month';
        const endpoint = userType === 'freelancer'
          ? '/api/dashboard/wallet/history'
          : `/api/commissioner-dashboard/payments/revenue-summary?range=${currentRange}`;

        const res = await fetch(endpoint);

        if (userType === 'freelancer') {
          const transactions: WalletTransaction[] = await res.json();
          // Calculate total balance: credits minus debits
          const balance = transactions.reduce((total, transaction) => {
            if (transaction.type === 'credit') {
              return total + transaction.amount;
            } else {
              return total - transaction.amount;
            }
          }, 0);
          setTotalBalance(balance);
        } else {
          const data = await res.json();
          setTotalBalance(data.currentTotal || 0);
        }

        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading wallet balance', err);
        setTotalBalance(0);
      }
    };
    fetchWalletBalance();
  }, [userType, range]);

  const getRangeLabel = () => {
    if (!range) return '';
    if (range === 'month') return 'this month';
    if (range === 'january') return 'January';
    if (range === 'february') return 'February';
    if (range === 'march') return 'March';
    if (range === 'april') return 'April';
    if (range === 'may') return 'May';
    if (range === 'june') return 'June';
    if (range === 'july') return 'July';
    if (range === 'august') return 'August';
    if (range === 'september') return 'September';
    if (range === 'october') return 'October';
    if (range === 'november') return 'November';
    if (range === 'december') return 'December';
    if (range === 'year') return 'this year';
    return 'the last 5 years';
  };

  // Clean version for mobile/desktop with chart toggle capability
  if (isCleanVersion && range) {
    return (
      <div className="bg-[#FCD5E3] rounded-2xl p-6 w-full shadow-sm">
        <div className="text-center">
          <div
            className="cursor-pointer"
            onClick={onToggleChart}
          >
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
              {totalBalance !== null ? `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
            </h2>
            {isCleanVersion ? (
              // Clean version - just the range with chart icon
              <p className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                Total revenue for {getRangeLabel()}
                <BarChart3 size={14} className="text-gray-400" />
              </p>
            ) : (
              // Original version with rotation
              <p className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                Total revenue for {getRangeLabel()}
                <BarChart3 size={14} className={`transition-transform ${showChart ? 'rotate-180' : ''}`} />
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-2">
            {lastUpdated ? format(lastUpdated, 'do MMMM yyyy \'at\' h:mmaaa') : ''}
          </p>

          {/* Show withdraw button for both freelancers and commissioners for UX consistency */}
          <button
            className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
          >
            <ArrowDownToLine size={16} />
            Withdraw earnings
          </button>
        </div>
      </div>
    );
  }

  // Desktop version (original)
  return (
    <div className="bg-[#FCD5E3] rounded-2xl p-6 w-full max-w-sm shadow-sm">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          {userType === 'freelancer' ? 'Total Wallet Balance' : 'Digital Sales Earnings'}
        </p>
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
          {totalBalance !== null ? `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          {lastUpdated ? format(lastUpdated, 'do MMMM yyyy \'at\' h:mmaaa') : ''}
        </p>

        {/* Show withdraw button for both freelancers and commissioners for UX consistency */}
        <button
          className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
        >
          <ArrowDownToLine size={16} />
          Withdraw earnings
        </button>
      </div>
    </div>
  );
}
