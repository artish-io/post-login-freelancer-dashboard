'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import CurrencyDisplay from '../../ui/currency-display';

type WalletSummary = {
  currentTotal: number;
  lastWeekTotal: number;
  monthlyGrowthPercent: number;
};

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range: RangeOption;
  onRangeChange: (newRange: RangeOption) => void;
};

export default function WalletDropDownToggle({ range, onRangeChange }: Props) {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/dashboard/wallet/summary?range=${range}`);
        const json = await res.json();
        setSummary(json);
      } catch (err) {
        console.error('Error loading wallet summary:', err);
      }
    }

    fetchData();
  }, [range]);

  const getRangeLabel = () => {
    if (range === 'month') return 'This Month';
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
    if (range === 'year') return 'This Year';
    return 'Last 5 Years';
  };

  if (!summary) return null;

  return (
    <div className="relative">
      {/* Toggle Button - Right Aligned */}
      <div className="flex justify-end">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-full px-4 py-2 shadow-sm text-sm font-medium hover:bg-gray-50"
        >
          <span>{getRangeLabel()}</span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute z-20 mt-2 w-48 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Current period options */}
          {(['month', 'year', 'all'] as RangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onRangeChange(opt);
                setMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                range === opt ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
              }`}
            >
              {opt === 'month' && 'This Month'}
              {opt === 'year' && 'This Year'}
              {opt === 'all' && 'Last 5 Years'}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* Individual months */}
          {(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as RangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onRangeChange(opt);
                setMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                range === opt ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Current Earnings Display - Right Aligned */}
      <div className="mt-2 flex items-center justify-end gap-2">
        <CurrencyDisplay
          amount={summary?.currentTotal || 0}
          className="text-lg leading-none"
          currencySymbolSize="text-[12px]"
        />
        <div className="flex items-center gap-1">
          <span className={`text-sm font-medium ${(summary?.monthlyGrowthPercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(summary?.monthlyGrowthPercent || 0)}%
          </span>
          {(summary?.monthlyGrowthPercent || 0) >= 0 ? (
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 12 12">
              <path d="M6 2l4 4H8v4H4V6H2l4-4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 12 12">
              <path d="M6 10L2 6h2V2h4v4h2l-4 4z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}