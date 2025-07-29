'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

type Category = {
  id: string;
  label: string;
  subcategories: Array<{
    name: string;
    description: string;
  }>;
};

interface CategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CategoryDropdown({ value, onChange, placeholder = "All Categories" }: CategoryDropdownProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch categories from the JSON file
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/gigs/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback to hardcoded categories
        setCategories([
          { id: 'design', label: 'Design', subcategories: [] },
          { id: 'engineering', label: 'Engineering', subcategories: [] },
          { id: 'marketing', label: 'Marketing', subcategories: [] },
          { id: 'writing', label: 'Writing', subcategories: [] },
          { id: 'visual-media', label: 'Visual Media', subcategories: [] },
          { id: 'audio-music', label: 'Audio & Music', subcategories: [] },
          { id: 'data-analytics', label: 'Data & Analytics', subcategories: [] },
          { id: 'product', label: 'Product', subcategories: [] },
          { id: 'accounting', label: 'Accounting', subcategories: [] },
          { id: 'events', label: 'Events', subcategories: [] },
          { id: 'social-media', label: 'Social Media', subcategories: [] },
          { id: 'others', label: 'Others', subcategories: [] },
        ]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(category =>
    category.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (categoryLabel: string) => {
    onChange(categoryLabel);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayValue = value === 'All Categories' ? placeholder : value;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 flex items-center justify-between hover:bg-gray-50 transition-colors text-sm"
      >
        <span className={value === 'All Categories' ? 'text-gray-500' : 'text-gray-900'}>
          {displayValue}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {/* All Categories Option */}
            <button
              type="button"
              onClick={() => handleSelect('All Categories')}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                value === 'All Categories' ? 'bg-pink-50 text-pink-700' : 'text-gray-900'
              }`}
            >
              <div className="font-medium text-sm">All Categories</div>
            </button>

            {/* Category Options */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.label)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    value === category.label ? 'bg-pink-50 text-pink-700' : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium text-sm">{category.label}</div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-xs">
                No categories found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
