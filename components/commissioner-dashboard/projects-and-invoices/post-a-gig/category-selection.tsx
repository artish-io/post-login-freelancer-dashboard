'use client';

import { useState } from 'react';
import Image from 'next/image';

const categories = [
  {
    label: 'Design',
    icon: '/icons/skill-categories/Design.png',
    iconSymbol: '🎨' // Fallback if icon doesn't load
  },
  {
    label: 'Writing',
    icon: '/icons/skill-categories/Writing.png',
    iconSymbol: '📝'
  },
  {
    label: 'Marketing',
    icon: '/icons/skill-categories/Marketing.png',
    iconSymbol: '📡'
  },
  {
    label: 'Engineering',
    icon: '/icons/skill-categories/Engineering.png',
    iconSymbol: '</>'
  },
  {
    label: 'Social Media',
    icon: '/icons/skill-categories/Social Media.png',
    iconSymbol: '🔗'
  },
  {
    label: 'Audio & Music',
    icon: '/icons/skill-categories/Audio And Music.png',
    iconSymbol: '🎵'
  },
  {
    label: 'Visual Media',
    icon: '/icons/skill-categories/Visual Media.png',
    iconSymbol: '🎬'
  },
  {
    label: 'Data & Analytics',
    icon: '/icons/skill-categories/Data Analytics.png',
    iconSymbol: '📊'
  },
  {
    label: 'Accounting',
    icon: '/icons/skill-categories/Accounting.png',
    iconSymbol: '🧮'
  },
  {
    label: 'Product',
    icon: '/icons/skill-categories/Product.png',
    iconSymbol: '⚙️'
  },
  {
    label: 'Others',
    icon: '/icons/skill-categories/Others.png',
    iconSymbol: '💬'
  }
];

interface CategorySelectionProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string) => void;
}

export default function CategorySelection({ selectedCategory, onCategorySelect }: CategorySelectionProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (categoryLabel: string) => {
    setImageErrors(prev => new Set(prev).add(categoryLabel));
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => (
        <button
          key={category.label}
          onClick={() => onCategorySelect(category.label)}
          className={`
            relative p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105
            flex flex-col items-center justify-center gap-4 min-h-[140px]
            ${selectedCategory === category.label
              ? 'bg-[#FCD5E3] border-[#eb1966] text-[#eb1966]'
              : 'bg-[#FCD5E3] border-[#FCD5E3] text-gray-700 hover:border-[#eb1966]'
            }
          `}
        >
          {/* Icon */}
          <div className="w-12 h-12 flex items-center justify-center">
            {!imageErrors.has(category.label) ? (
              <Image
                src={category.icon}
                alt={category.label}
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
                onError={() => handleImageError(category.label)}
              />
            ) : (
              <span className="text-3xl">{category.iconSymbol}</span>
            )}
          </div>

          {/* Label */}
          <span className="text-sm font-medium text-center leading-tight">
            {category.label}
          </span>

          {/* Selection indicator */}
          {selectedCategory === category.label && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-[#eb1966] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}