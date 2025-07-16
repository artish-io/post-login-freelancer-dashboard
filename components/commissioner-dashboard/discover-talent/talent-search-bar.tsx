'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

type TalentSearchBarProps = {
  query: string;
  setQuery: (query: string) => void;
  searchableData: string[];
  freelancerNames: string[];
  skills: string[];
  tools: string[];
};

type GroupedSuggestions = {
  creatives: string[];
  skills: string[];
  tools: string[];
};

export default function TalentSearchBar({ query, setQuery, searchableData, freelancerNames, skills, tools }: TalentSearchBarProps) {
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedSuggestions>({ creatives: [], skills: [], tools: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fuzzy search function for grouped suggestions
  const fuzzySearchGrouped = (searchTerm: string) => {
    if (!searchTerm.trim()) return { creatives: [], skills: [], tools: [] };

    const searchLower = searchTerm.toLowerCase();

    const filterAndSort = (items: string[]) => {
      const matches = items.filter(item =>
        item.toLowerCase().includes(searchLower)
      );

      // Sort by relevance (exact matches first, then partial matches)
      return matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();

        // Exact matches first
        if (aLower === searchLower && bLower !== searchLower) return -1;
        if (bLower === searchLower && aLower !== searchLower) return 1;

        // Starts with search term
        if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower)) return -1;
        if (bLower.startsWith(searchLower) && !aLower.startsWith(searchLower)) return 1;

        // Alphabetical order
        return a.localeCompare(b);
      }).slice(0, 4); // Limit to 4 per group
    };

    return {
      creatives: filterAndSort(freelancerNames),
      skills: filterAndSort(skills),
      tools: filterAndSort(tools),
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      const newGroupedSuggestions = fuzzySearchGrouped(value);
      setGroupedSuggestions(newGroupedSuggestions);
      const hasResults = newGroupedSuggestions.creatives.length > 0 ||
                        newGroupedSuggestions.skills.length > 0 ||
                        newGroupedSuggestions.tools.length > 0;
      setShowSuggestions(hasResults);
      setActiveSuggestion(-1);
    } else {
      setGroupedSuggestions({ creatives: [], skills: [], tools: [] });
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setGroupedSuggestions({ creatives: [], skills: [], tools: [] });
    setActiveSuggestion(-1);
  };

  // Get flattened suggestions for keyboard navigation
  const getAllSuggestions = () => {
    const allSuggestions: string[] = [];
    if (groupedSuggestions.creatives.length > 0) {
      allSuggestions.push(...groupedSuggestions.creatives);
    }
    if (groupedSuggestions.skills.length > 0) {
      allSuggestions.push(...groupedSuggestions.skills);
    }
    if (groupedSuggestions.tools.length > 0) {
      allSuggestions.push(...groupedSuggestions.tools);
    }
    return allSuggestions;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const allSuggestions = getAllSuggestions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev =>
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          handleSuggestionClick(allSuggestions[activeSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-6">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search freelancers, skills, tools..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim()) {
                const newGroupedSuggestions = fuzzySearchGrouped(query);
                const hasResults = newGroupedSuggestions.creatives.length > 0 ||
                                  newGroupedSuggestions.skills.length > 0 ||
                                  newGroupedSuggestions.tools.length > 0;
                if (hasResults) {
                  setShowSuggestions(true);
                }
              }
            }}
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {(() => {
              const allSuggestions = getAllSuggestions();
              let currentIndex = 0;

              return (
                <div className="py-2">
                  {/* Creatives Group */}
                  {groupedSuggestions.creatives.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Creatives
                      </div>
                      {groupedSuggestions.creatives.map((suggestion, index) => {
                        const globalIndex = currentIndex++;
                        return (
                          <button
                            key={`creative-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                              globalIndex === activeSuggestion ? 'bg-pink-50 text-pink-600' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-[10px] italic">{suggestion}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Skills Group */}
                  {groupedSuggestions.skills.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Skills
                      </div>
                      {groupedSuggestions.skills.map((suggestion, index) => {
                        const globalIndex = currentIndex++;
                        return (
                          <button
                            key={`skill-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                              globalIndex === activeSuggestion ? 'bg-pink-50 text-pink-600' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-[10px] italic">{suggestion}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Tools Group */}
                  {groupedSuggestions.tools.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tools
                      </div>
                      {groupedSuggestions.tools.map((suggestion, index) => {
                        const globalIndex = currentIndex++;
                        return (
                          <button
                            key={`tool-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                              globalIndex === activeSuggestion ? 'bg-pink-50 text-pink-600' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-[10px] italic">{suggestion}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
