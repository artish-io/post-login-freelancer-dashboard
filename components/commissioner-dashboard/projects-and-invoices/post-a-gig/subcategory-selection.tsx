'use client';

import { useState, useEffect } from 'react';

interface Subcategory {
  name: string;
  description: string;
}

interface SubcategorySelectionProps {
  category: string;
  selectedSubcategory: string | null;
  onSubcategorySelect: (subcategory: string) => void;
}

export default function SubcategorySelection({ 
  category, 
  selectedSubcategory, 
  onSubcategorySelect 
}: SubcategorySelectionProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/gigs/subcategories?category=${encodeURIComponent(category)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch subcategories');
        }
        
        const data = await response.json();
        setSubcategories(data.subcategories || []);
      } catch (err) {
        setError('Failed to load subcategories');
        console.error('Error fetching subcategories:', err);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchSubcategories();
    }
  }, [category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#eb1966] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subcategories.map((subcategory) => (
        <button
          key={subcategory.name}
          onClick={() => onSubcategorySelect(subcategory.name)}
          className={`
            relative p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105
            text-center min-h-[140px] flex flex-col justify-between
            ${selectedSubcategory === subcategory.name
              ? 'bg-[#FCD5E3] border-[#eb1966] text-[#eb1966]'
              : 'bg-[#FCD5E3] border-[#FCD5E3] text-gray-700 hover:border-[#eb1966]'
            }
          `}
        >
          {/* Title */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold mb-2 text-center">
              {subcategory.name}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed text-center">
              {subcategory.description}
            </p>
          </div>
          
          {/* Selection indicator */}
          {selectedSubcategory === subcategory.name && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-[#eb1966] rounded-full flex items-center justify-center">
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
