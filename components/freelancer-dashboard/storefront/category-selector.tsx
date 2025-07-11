'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon } from 'lucide-react';

// Predefined storefront categories
const STOREFRONT_CATEGORIES = [
  { id: 'software-development', name: 'Software development', description: 'Apps, websites, and software solutions' },
  { id: 'design', name: 'Design', description: 'Graphics, UI/UX, and visual content' },
  { id: 'events-live-shows', name: 'Events & live shows', description: 'Virtual events, webinars, and live performances' },
  { id: 'photography', name: 'Photography', description: 'Stock photos, photo collections, and presets' },
  { id: 'finance-business', name: 'Finance & business', description: 'Business tools, templates, and financial resources' },
  { id: 'writing-publishing', name: 'Writing and publishing', description: 'Books, articles, and written content' },
  { id: 'film-video', name: 'Film and video', description: 'Video content, tutorials, and media' },
  { id: 'ebooks-courses', name: 'E-Books & courses', description: 'Educational content and learning materials' },
  { id: 'education', name: 'Education', description: 'Teaching materials and educational resources' },
  { id: 'comics-graphic-novels', name: 'Comics & graphic novels', description: 'Digital comics and illustrated stories' },
  { id: 'music-audio', name: 'Music and Audio', description: 'Music tracks, sound effects, and audio content' },
  { id: 'fitness-wellness', name: 'Fitness and wellness', description: 'Workout plans, wellness guides, and health content' },
  { id: 'gaming', name: 'Gaming', description: 'Game assets, mods, and gaming content' },
  { id: 'others', name: 'Others', description: 'Miscellaneous digital products' }
];

type Category = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function CategorySelector({ value, onChange, placeholder = "Select Product Category" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const allCategories = STOREFRONT_CATEGORIES;
  const selectedCategory = allCategories.find(cat => cat.id === value) ||
    (value && !allCategories.find(cat => cat.id === value) ? { id: value, name: value, description: 'Custom category' } : null);

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (customCategory.trim()) {
      const customId = customCategory.toLowerCase().replace(/[^a-z0-9]/g, '-');
      onChange(customId);
      setCustomCategory('');
      setShowCustomInput(false);
      setIsOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-black transition flex items-center justify-between"
      >
        <span className={selectedCategory ? 'text-black' : 'text-gray-500'}>
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {/* Predefined Categories */}
          {allCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category.id)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition"
            >
              <div className="text-xs font-medium text-black">{category.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{category.description}</div>
            </button>
          ))}

          {/* Custom Category Option */}
          <div className="border-t border-gray-100">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition flex items-center gap-2"
              >
                <PlusIcon className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Add custom category</span>
              </button>
            ) : (
              <div className="p-3">
                <input
                  type="text"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomCategory('');
                    }}
                    className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
