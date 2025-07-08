'use client';

import { useState } from 'react';
import { FilterIcon } from 'lucide-react';
import GigFiltersExpansionModal from './gig-filters-expansion-modal';

const categories = [
  { label: 'All Categories', icon: 'All Categories.png' },
  { label: 'Design', icon: 'Design.png' },
  { label: 'Writing', icon: 'Writing.png' },
  { label: 'Marketing', icon: 'Marketing.png' },
  { label: 'Engineering', icon: 'Engineering.png' },
  { label: 'Social Media', icon: 'Social Media.png' },
  { label: 'Visual Media', icon: 'Visual Media.png' },
  { label: 'Audio & Music', icon: 'Audio And Music.png' },
  // Removed: Data & Analytics, Accounting, Product, Others
];

export default function GigFilters() {
  const [showModal, setShowModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Categories');

  return (
    <>
      {/* Desktop: Show all category pills + Filters button */}
      <div className="hidden md:flex gap-0.5 overflow-x-auto scrollbar-hide w-full pt-4 pb-2 justify-between items-center">
        {categories.map((cat) => (
          <button
            key={cat.label}
            className={`rounded-xl px-3 py-2 border whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
              activeCategory === cat.label
                ? 'bg-white text-pink-500 border-pink-500'
                : 'bg-pink-100 text-black border-pink-300'
            } shadow-sm text-sm font-medium`}
            onClick={() => setActiveCategory(cat.label)}
          >
            <img src={`/icons/skill-categories/${cat.icon}`} alt={cat.label} className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
        <button
          className="rounded-xl px-3 py-2 border bg-gray-800 text-white border-gray-800 shadow-sm text-sm font-medium flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
          onClick={() => setShowModal(!showModal)}
        >
          <FilterIcon className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Mobile: Single "Filter Gigs" button */}
      <div className="md:hidden pt-4 pb-2">
        <button
          className="w-full rounded-xl px-4 py-3 border bg-gray-800 text-white border-gray-800 shadow-sm text-sm font-medium flex items-center justify-center gap-2"
          onClick={() => setShowModal(!showModal)}
        >
          <FilterIcon className="w-4 h-4" />
          Filter Gigs
        </button>
      </div>

      <GigFiltersExpansionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}