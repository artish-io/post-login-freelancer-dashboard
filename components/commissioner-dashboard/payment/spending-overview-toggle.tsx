'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type SpendingSummary = {
  currentTotal: number;
  lastWeekTotal: number;
  monthlyGrowthPercent: number;
};

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range: RangeOption;
  onRangeChange: (newRange: RangeOption) => void;
};

export default function SpendingOverviewToggle({ range, onRangeChange }: Props) {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/commissioner-dashboard/payments/spending-summary?range=${range}`);
        const json = await res.json();
        setSummary(json);
      } catch (err) {
        console.error('Error loading spending summary:', err);
      }
    }

    fetchData();
  }, [range]);

  const rangeOptions: { value: RangeOption; label: string }[] = [
    { value: 'month', label: 'This Month' },
    { value: 'january', label: 'January' },
    { value: 'february', label: 'February' },
    { value: 'march', label: 'March' },
    { value: 'april', label: 'April' },
    { value: 'may', label: 'May' },
    { value: 'june', label: 'June' },
    { value: 'july', label: 'July' },
    { value: 'august', label: 'August' },
    { value: 'september', label: 'September' },
    { value: 'october', label: 'October' },
    { value: 'november', label: 'November' },
    { value: 'december', label: 'December' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  const currentLabel = rangeOptions.find(opt => opt.value === range)?.label || 'This Month';



  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
      >
        <span>{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onRangeChange(option.value);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Current Spending Display - Right Aligned */}
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="text-black font-semibold text-lg">
          ${summary?.currentTotal?.toLocaleString() || '0'}
        </span>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-medium ${(summary?.monthlyGrowthPercent || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {(summary?.monthlyGrowthPercent || 0) >= 0 ? '+' : ''}{summary?.monthlyGrowthPercent || 0}%
          </span>
          {(summary?.monthlyGrowthPercent || 0) >= 0 ? (
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 12 12">
              <path d="M6 2l4 4H8v4H4V6H2l4-4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 12 12">
              <path d="M6 10L2 6h2V2h4v4h2l-4 4z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
