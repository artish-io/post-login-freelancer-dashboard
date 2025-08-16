'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownToLine, BarChart3 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import CurrencyDisplay from '../ui/currency-display';

type WalletData = {
  availableBalance: number;
  lifetimeEarnings: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  currency: string;
  updatedAt: string;
};

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
  const { data: session } = useSession();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchWalletData = async () => {
      try {
        setLoading(true);

        if (userType === 'freelancer') {
          // Use new wallet API for freelancers
          const response = await fetch(`/api/payments/wallet/${session.user.id}?userType=freelancer`);
          const data = await response.json();

          if (data.success && data.wallet) {
            setWalletData(data.wallet);
            setTotalBalance(data.wallet.availableBalance);
            setLastUpdated(new Date(data.wallet.updatedAt));
          } else {
            console.error('Failed to fetch wallet data:', data.error);
            setTotalBalance(0);
          }
        } else {
          // Fallback to existing commissioner endpoint
          const currentRange = range || 'month';
          const response = await fetch(`/api/commissioner-dashboard/payments/revenue-summary?range=${currentRange}`);
          const data = await response.json();
          setTotalBalance(data.currentTotal || 0);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Error loading wallet data', err);
        setTotalBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [session?.user?.id, userType, range]);

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
      <div
        className="bg-[#FCD5E3] rounded-3xl p-6 w-full shadow-lg border border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        <div className="text-center">
          <div
            className="cursor-pointer"
            onClick={onToggleChart}
          >
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight font-bodoni-moda">
              {totalBalance !== null ? (
                <CurrencyDisplay
                  amount={totalBalance}
                  className="text-4xl leading-none"
                  currencySymbolSize="text-[23px]"
                />
              ) : '—'}
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
    <div
      className="bg-[#FCD5E3] rounded-3xl p-6 w-full shadow-lg border border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          {userType === 'freelancer' ? 'Available Balance' : 'Digital Sales Earnings'}
        </p>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <>
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight font-bodoni-moda">
              {totalBalance !== null ? (
                <CurrencyDisplay
                  amount={totalBalance}
                  className="text-4xl leading-none"
                  currencySymbolSize="text-[23px]"
                />
              ) : '—'}
            </h2>
            {/* Enhanced freelancer wallet details */}
            {userType === 'freelancer' && walletData && (
              <div className="mt-0 space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Lifetime Earnings:</span>
                  <CurrencyDisplay
                    amount={walletData.lifetimeEarnings}
                    className="text-xs"
                    currencySymbolSize="text-[8px]"
                  />
                </div>
                {walletData.pendingWithdrawals > 0 && (
                  <div className="flex justify-between text-xs text-yellow-600">
                    <span>Pending Withdrawals:</span>
                    <CurrencyDisplay
                      amount={walletData.pendingWithdrawals}
                      className="text-xs text-yellow-600"
                      currencySymbolSize="text-[8px]"
                    />
                  </div>
                )}
                {walletData.totalWithdrawn > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total Withdrawn:</span>
                    <CurrencyDisplay
                      amount={walletData.totalWithdrawn}
                      className="text-xs text-gray-500"
                      currencySymbolSize="text-[8px]"
                    />
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-gray-500 mt-2">
              {lastUpdated ? format(lastUpdated, 'do MMMM yyyy \'at\' h:mmaaa') : ''}
            </p>
          </>
        )}

        {/* Show withdraw button for both freelancers and commissioners for UX consistency */}
        <button
          className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
          disabled={loading || (userType === 'freelancer' && (totalBalance || 0) <= 0)}
        >
          <ArrowDownToLine size={16} />
          Withdraw earnings
        </button>
      </div>
    </div>
  );
}
