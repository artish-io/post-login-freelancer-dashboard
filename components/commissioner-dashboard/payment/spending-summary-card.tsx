'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import CurrencyDisplay from '../../ui/currency-display';

type SpendingSummary = {
  currentTotal: number;
  lastWeekTotal: number;
  monthlyGrowthPercent: number;
};

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range?: RangeOption;
  onToggleChart?: () => void;
  showChart?: boolean;
  isCleanVersion?: boolean;
};

export default function SpendingSummaryCard({
  range = 'month',
  onToggleChart,
  showChart = false,
  isCleanVersion = false
}: Props) {
  const [totalSpending, setTotalSpending] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const fetchSpendingSummary = async () => {
      try {
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const res = await fetch(`/api/commissioner-dashboard/payments/spending-summary?range=${range}&t=${timestamp}`);
        const data: SpendingSummary = await res.json();

        setTotalSpending(data.currentTotal);
        setSummary(data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading spending summary', err);
        setTotalSpending(0);
      }
    };
    fetchSpendingSummary();
  }, [range, refreshKey]);

  // Auto-refresh every 30 seconds to catch new payments
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyWithSeparateDollar = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(amount);
    return formatted;
  };

  const getGrowthColor = (percent: number) => {
    if (percent > 0) return 'text-red-600'; // Spending increase is concerning
    if (percent < 0) return 'text-green-600'; // Spending decrease is good
    return 'text-gray-600';
  };

  const getGrowthText = (percent: number) => {
    if (percent === 0) return '0%';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  if (isCleanVersion) {
    return (
      <div
        className="w-full rounded-3xl border border-white/20 bg-white px-6 py-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-2xl font-extrabold text-black">
            Total Spending
          </h3>
          {onToggleChart && (
            <button
              onClick={onToggleChart}
              className="p-2 hover:bg-gray-100 rounded-lg transition backdrop-blur-sm border border-white/10 shadow-sm"
            >
              <ArrowUpRight className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-4xl font-semibold text-black font-bodoni-moda">
            <CurrencyDisplay
              amount={totalSpending}
              className="text-4xl leading-none"
              currencySymbolSize="text-[23px]"
            />
          </div>

          {summary && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">vs last period:</span>
              <span className={summary.monthlyGrowthPercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                {summary.monthlyGrowthPercent >= 0 ? '+' : ''}{summary.monthlyGrowthPercent.toFixed(1)}%
              </span>
            </div>
          )}

          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated {format(lastUpdated, 'MMM d, h:mm a')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-3xl border border-white/20 bg-white px-6 py-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-extrabold text-black">
          Total Spending
        </h3>
        
        <div className="flex items-center gap-2">
          {showChart && (
            <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-gray-600" />
            </div>
          )}
          
          <button className="p-2 hover:bg-gray-100 rounded-lg transition backdrop-blur-sm border border-white/10 shadow-sm">
            <ArrowUpRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="text-4xl font-semibold text-black font-bodoni-moda">
          <CurrencyDisplay
            amount={totalSpending}
            className="text-4xl leading-none"
            currencySymbolSize="text-[23px]"
          />
        </div>
        
        {summary && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">vs last period:</span>
            <span className={getGrowthColor(summary.monthlyGrowthPercent)}>
              {getGrowthText(summary.monthlyGrowthPercent)}
            </span>
          </div>
        )}
        
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated {format(lastUpdated, 'MMM d, h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}
