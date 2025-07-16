'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

type TalentFiltersProps = {
  selectedTimeZone: string;
  setSelectedTimeZone: (timeZone: string) => void;
  minRate: string;
  setMinRate: (rate: string) => void;
  maxRate: string;
  setMaxRate: (rate: string) => void;
  onFiltersClick: () => void;
};

const timeZones = [
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'India',
  'Germany',
  'Ireland',
  'Spain',
  'Baker Island',
  'American Samoa',
  'Hawaii',
  'Alaska',
  'Mexico',
  'Guatemala',
  'Barbados',
  'Argentina',
  'South Georgia and the South Sandwich Islands',
  'Cabo Verde',
  'South Africa',
  'Saudi Arabia',
  'United Arab Emirates',
  'Pakistan',
  'Bangladesh',
  'Thailand',
  'China',
  'Japan',
  'Papua New Guinea',
  'Solomon Islands',
  'New Zealand',
];

export default function TalentFilters({
  selectedTimeZone,
  setSelectedTimeZone,
  minRate,
  setMinRate,
  maxRate,
  setMaxRate,
  onFiltersClick,
}: TalentFiltersProps) {
  const [showTimeZoneDropdown, setShowTimeZoneDropdown] = useState(false);
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const timeZoneRef = useRef<HTMLDivElement>(null);
  const rateRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeZoneRef.current && !timeZoneRef.current.contains(event.target as Node)) {
        setShowTimeZoneDropdown(false);
      }
      if (rateRef.current && !rateRef.current.contains(event.target as Node)) {
        setShowRateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimeZoneSelect = (timeZone: string) => {
    setSelectedTimeZone(timeZone);
    setShowTimeZoneDropdown(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Time Zone Dropdown */}
        <div className="relative" ref={timeZoneRef}>
          <button
            onClick={() => setShowTimeZoneDropdown(!showTimeZoneDropdown)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors min-w-[140px] justify-between"
          >
            <span className="text-gray-700">
              {selectedTimeZone || 'Time Zone'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showTimeZoneDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-64 max-h-64 overflow-y-auto">
              <div className="p-2">
                {selectedTimeZone && (
                  <button
                    onClick={() => handleTimeZoneSelect('')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
                  >
                    Clear selection
                  </button>
                )}
                {timeZones.map((timeZone) => (
                  <button
                    key={timeZone}
                    onClick={() => handleTimeZoneSelect(timeZone)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors ${
                      selectedTimeZone === timeZone ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {timeZone}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rate Dropdown */}
        <div className="relative" ref={rateRef}>
          <button
            onClick={() => setShowRateDropdown(!showRateDropdown)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors min-w-[100px] justify-between"
          >
            <span className="text-gray-700">
              {minRate || maxRate ? `$${minRate || '0'}-${maxRate || '∞'}` : 'Rate'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showRateDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-72 p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate Range
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minRate}
                        onChange={(e) => setMinRate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-gray-400">to</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxRate}
                        onChange={(e) => setMaxRate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setMinRate('');
                      setMaxRate('');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowRateDropdown(false)}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* All Filters Button */}
        <button
          onClick={onFiltersClick}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">All Filters</span>
        </button>
      </div>
    </div>
  );
}
