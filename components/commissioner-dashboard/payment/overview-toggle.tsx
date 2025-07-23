'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Summary = {
  currentTotal: number;
  monthlyGrowthPercent: number;
};

type Props = {
  range: RangeOption;
  onRangeChange: (range: RangeOption) => void;
  mode: 'spending' | 'revenue';
};

export default function OverviewToggle({ range, onRangeChange, mode }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch summary data based on mode and range
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const endpoint = mode === 'spending'
          ? `/api/commissioner-dashboard/payments/spending-summary?range=${range}`
          : `/api/commissioner-dashboard/payments/revenue-summary?range=${range}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error('Error loading summary data', err);
        setSummary(null);
      }
    };
    fetchSummary();
  }, [range, mode]);

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

  const getCurrentLabel = () => {
    const option = rangeOptions.find(opt => opt.value === range);
    return option?.label || 'This Month';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button - Right Aligned with rounded-full styling */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-full px-4 py-2 shadow-sm text-sm font-medium hover:bg-gray-50"
        >
          <span>{getCurrentLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-500`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="py-1">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onRangeChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                  range === option.value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Amount and Percentage Display - Right Aligned */}
      {summary && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="text-black font-semibold text-lg">
            ${summary.currentTotal?.toLocaleString() || '0'}
          </span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${(summary.monthlyGrowthPercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(summary.monthlyGrowthPercent || 0) >= 0 ? '+' : ''}{summary.monthlyGrowthPercent || 0}%
            </span>
            {(summary.monthlyGrowthPercent || 0) >= 0 ? (
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
      )}
    </div>
  );
}
