'use client';

import { useState, useEffect, useRef } from 'react';
import { XIcon } from 'lucide-react';

type GigCategory = {
  id: string;
  label: string;
  subcategories: string[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function TagAutocomplete({ value, onChange, placeholder = "Tags (comma separated)" }: Props) {
  const [gigCategories, setGigCategories] = useState<GigCategory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load gig categories for autocomplete
  useEffect(() => {
    const loadGigCategories = async () => {
      try {
        const response = await fetch('/api/gigs/gig-categories');
        const data = await response.json();
        setGigCategories(data);
      } catch (error) {
        console.error('Failed to load gig categories:', error);
      }
    };

    loadGigCategories();
  }, []);

  // Parse existing tags from value
  useEffect(() => {
    if (value) {
      const parsedTags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      setTags(parsedTags);
    } else {
      setTags([]);
    }
  }, [value]);

  // Generate suggestions based on input
  useEffect(() => {
    if (currentInput.length > 1) {
      const allKeywords: string[] = [];
      
      // Add category labels
      gigCategories.forEach(category => {
        allKeywords.push(category.label);
        // Add subcategories
        category.subcategories.forEach(sub => {
          allKeywords.push(sub);
        });
      });

      // Filter suggestions based on fuzzy matching
      const filtered = allKeywords.filter(keyword => 
        keyword.toLowerCase().includes(currentInput.toLowerCase()) &&
        !tags.some(tag => tag.toLowerCase() === keyword.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [currentInput, gigCategories, tags]);

  const addTag = (tag: string) => {
    const newTags = [...tags, tag];
    setTags(newTags);
    onChange(newTags.join(', '));
    setCurrentInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
    onChange(newTags.join(', '));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Check if user typed a comma
    if (inputValue.includes(',')) {
      const newTag = inputValue.replace(',', '').trim();
      if (newTag && !tags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
        addTag(newTag);
      } else {
        setCurrentInput('');
      }
    } else {
      setCurrentInput(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (!tags.some(tag => tag.toLowerCase() === currentInput.toLowerCase())) {
        addTag(currentInput.trim());
      }
    } else if (e.key === 'Backspace' && !currentInput && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  return (
    <div className="relative">
      <div className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-black transition min-h-[44px] flex flex-wrap items-center gap-2">
        {/* Render existing tags */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          placeholder={tags.length === 0 ? placeholder : ''}
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => currentInput.length > 1 && setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition text-xs"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
