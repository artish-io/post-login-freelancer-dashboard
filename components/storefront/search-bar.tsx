'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const staticTags = [
  'All',
  'Software Engineering',
  'Design',
  'Events',
  'Finance Business and Money',
  'Digital Art & Illustration',
  'Comic Books & Graphic Novels',
  'E-Books and Courses',
  'Writing',
  'More',
];

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');

  return (
    <div className="w-full border border-zinc-300 rounded-3xl p-4 bg-white">
      <div className="flex items-center gap-4 mb-3">
        <input
          type="text"
          placeholder="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-3 rounded-full border border-zinc-300 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          className="bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition"
          onClick={() => {
            console.log('Searching for:', query, 'in', activeTag);
          }}
        >
          Search
        </button>
      </div>

      {/* Horizontal scrolling container for tags */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-1">
          {staticTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={clsx(
                'px-4 py-1.5 rounded-full border text-sm font-medium transition whitespace-nowrap flex-shrink-0',
                activeTag === tag
                  ? 'bg-black text-white border-black'
                  : 'border-zinc-300 text-zinc-600 hover:border-black'
              )}
            >
              {tag === 'More' ? (
                <span className="flex items-center gap-1">
                  More <ChevronDown className="w-4 h-4" />
                </span>
              ) : (
                tag
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}