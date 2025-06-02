'use client';

import { Dispatch, SetStateAction } from 'react';

type SearchBarProps = {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setActiveCategory: Dispatch<SetStateAction<string | null>>;
};

const categories = [
  'All',
  'Software Engineering',
  'Design',
  'Finance Business and Money',
  'Digital Art & Illustration',
  'Comic Books & Graphic Novels',
  'E-Books and Courses',
  'Writing',
  'More',
];

export default function SearchBar({ query, setQuery, setActiveCategory }: SearchBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-6 max-w-7xl mx-auto mt-8">
      {/* Search input row */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search freelancers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-grow px-4 py-3 border border-gray-300 rounded-md text-sm font-semibold placeholder-gray-400"
        />
        <button
          className="bg-black text-white px-6 py-3 rounded-md text-sm font-semibold"
          // Optionally, you could call a function on click to trigger the search
        >
          Search
        </button>
      </div>

      {/* Suggested category tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {categories.map((category, index) => (
          <button
            key={index}
            className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-100 transition"
            onClick={() =>
              category === 'All'
                ? setActiveCategory(null)
                : setActiveCategory(category)
            }
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}