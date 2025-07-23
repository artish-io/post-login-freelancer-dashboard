'use client';

import { useState, useRef, useEffect } from 'react';
import { Gig } from '../../types/gig'; // ✅ Fixed path
import gigCategories from '../../data/gigs/gig-categories.json';

type SidebarFiltersProps = {
  gigCards: Gig[];
  allCardsCount: number;
  onCategoryChange: (category: string | null) => void;
  onTagToggle: (tag: string) => void;
  onSortChange: (value: string) => void;
  selectedTags: string[];
  minRate: string;
  maxRate: string;
  onMinRateChange: (value: string) => void;
  onMaxRateChange: (value: string) => void;
  isFiltered: boolean;
  selectedRating: string;
  onRatingChange: (value: string) => void;
};

const sortOptions = [
  { value: 'skill', label: 'Skill' },
  { value: 'tools', label: 'Tools' },
  { value: 'rateLowToHigh', label: 'Rates (Low to High)' },
  { value: 'rateHighToLow', label: 'Rates (High to Low)' }
];

const DollarIcon = () => (
  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
    <svg width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" stroke="black" strokeWidth="2" fill="none" />
      <text x="16" y="22" textAnchor="middle" fontWeight="bold" fontSize="20" fill="black">$</text>
    </svg>
  </span>
);

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center mr-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill={i <= rating ? "black" : "none"}
          stroke="black"
          strokeWidth="2"
          className="inline-block"
        >
          <polygon
            points="12,2 15,9 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,9"
            style={{
              fill: i <= rating ? "#000" : "none",
            }}
          />
        </svg>
      ))}
    </span>
  );
}

export default function SidebarFilters({
  gigCards,
  allCardsCount,
  onCategoryChange,
  onTagToggle,
  onSortChange,
  selectedTags,
  minRate,
  maxRate,
  onMinRateChange,
  onMaxRateChange,
  isFiltered,
  selectedRating,
  onRatingChange,
}: SidebarFiltersProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(gigCategories[0]?.label || null);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState(sortOptions[0].value);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen]);

  // Convert gig-categories.json data to the expected format
  const categories: Record<string, string[]> = gigCategories.reduce((acc, category) => {
    acc[category.label] = category.subcategories.map(sub => sub.name);
    return acc;
  }, {} as Record<string, string[]>);

  const toggleCategory = (category: string) => {
    const next = expandedCategory === category ? null : category;
    setExpandedCategory(next);
    onCategoryChange(next);
  };

  const resetFilters = () => {
    setExpandedCategory(null);
    onCategoryChange(null);
    selectedTags.forEach(tag => onTagToggle(tag));
  };

  const handleSortSelect = (option: string) => {
    setSortValue(option);
    onSortChange(option);
    setSortOpen(false);
  };

  const sectionLabel = "font-bold text-[18px] mb-2";
  const mainCategoryLabel = "text-[15px] font-normal text-black flex w-full text-left justify-between items-center";
  const subCategoryLabel = "text-[14px] font-normal text-gray-600 hover:underline cursor-pointer";

  const resultsLabel = !isFiltered
    ? "Showing All"
    : gigCards.length === 0
      ? "No matching results"
      : `Showing ${gigCards.length} result${gigCards.length > 1 ? 's' : ''}`;

  return (
    <aside className="w-full max-w-xs bg-white border rounded-lg p-6 text-sm">
      {/* Result Summary */}
      <div>
        <p className="font-semibold text-[22px] mb-2 leading-tight">
          {resultsLabel}
        </p>
        <div className="border-b border-black/80 my-4" />
      </div>

      {/* Category Filter */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className={sectionLabel + " cursor-pointer hover:underline"} onClick={resetFilters}>
            All
          </h3>
          {selectedTags.length > 0 && (
            <button className="text-xs text-red-600 underline" onClick={resetFilters}>
              Reset Filters
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {Object.entries(categories).map(([main, subs]) => (
            <li key={main}>
              <button
                onClick={() => toggleCategory(main)}
                className={mainCategoryLabel}
                style={{ fontWeight: 400 }}
              >
                {main}
                <span className="ml-1">{expandedCategory === main ? '▾' : '▸'}</span>
              </button>
              {expandedCategory === main && (
                <ul className="ml-4 mt-1 space-y-1">
                  {subs.map((sub) => (
                    <li
                      key={sub}
                      className={subCategoryLabel + (selectedTags.includes(sub) ? " text-black underline" : "")}
                      onClick={() => onTagToggle(sub)}
                    >
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="border-b border-black/80 my-6" />

      {/* Sort by Section */}
      <div className="mb-6">
        <label className={sectionLabel}>Sort by</label>
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white border border-black/30 text-black font-medium focus:outline-none"
            onClick={() => setSortOpen((open) => !open)}
            style={{ boxShadow: 'none', fontSize: 16 }}
          >
            {sortOptions.find(opt => opt.value === sortValue)?.label}
            <svg className="w-6 h-6 ml-3 text-black" fill="none" stroke="currentColor" strokeWidth={2}
              viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sortOpen && (
            <ul className="absolute left-0 right-0 bg-white border border-black/30 rounded-lg mt-1 z-10">
              {sortOptions.map((option) => (
                <li
                  key={option.value}
                  className={`px-4 py-2 cursor-pointer hover:bg-black/5 ${sortValue === option.value ? 'bg-black/10 font-bold' : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="mt-2 underline text-xs text-red-500"
          onClick={() => handleSortSelect('skill')}
          type="button"
        >
          Reset Sorting
        </button>
      </div>

      {/* Divider */}
      <div className="border-b border-black/80 my-6" />

      {/* Minimum Rate */}
      <div className="mb-6">
        <label className={sectionLabel}>Minimum Rate</label>
        <div className="relative">
          <DollarIcon />
          <input
            type="text"
            className="w-full pl-14 pr-4 py-3 rounded-xl border border-black/40 bg-white placeholder-gray-400 text-[18px] outline-none focus:border-black/90 transition"
            value={minRate}
            onChange={e => onMinRateChange(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>

      {/* Maximum Rate */}
      <div className="mb-6">
        <label className={sectionLabel}>Maximum Rate</label>
        <div className="relative">
          <DollarIcon />
          <input
            type="text"
            className="w-full pl-14 pr-4 py-3 rounded-xl border border-black/40 bg-white placeholder-gray-400 text-[18px] outline-none focus:border-black/90 transition"
            value={maxRate}
            onChange={e => onMaxRateChange(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="1000"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-black/80 my-6" />

      {/* Rating Filter */}
      <div>
        <label className={sectionLabel}>Rating</label>
        <div className="flex flex-col gap-2 mt-2">
          {[4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center justify-between">
              <div className="flex items-center">
                <StarRow rating={star} />
                <span className="ml-2 text-xs text-black/80" style={{ whiteSpace: "nowrap" }}>
                  and above
                </span>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 border-gray-400 rounded accent-black ml-2"
                checked={selectedRating === String(star)}
                onChange={() =>
                  onRatingChange(selectedRating === String(star) ? "" : String(star))
                }
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}