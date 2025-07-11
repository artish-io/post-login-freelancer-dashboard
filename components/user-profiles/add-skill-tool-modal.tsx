'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

interface AddSkillToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: 'skill' | 'tool', value: string) => void;
  availableSkills: string[];
  availableTools: string[];
}

export default function AddSkillToolModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  availableSkills, 
  availableTools 
}: AddSkillToolModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'skill' | 'tool'>('skill');

  // Fuzzy search function
  const fuzzySearch = (items: string[], term: string) => {
    if (!term) return items.slice(0, 10); // Show first 10 items when no search term
    
    const searchLower = term.toLowerCase();
    
    return items
      .map(item => ({
        item,
        score: calculateFuzzyScore(item.toLowerCase(), searchLower)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ item }) => item);
  };

  // Calculate fuzzy match score
  const calculateFuzzyScore = (text: string, search: string): number => {
    if (text.includes(search)) return 100; // Exact substring match
    
    let score = 0;
    let searchIndex = 0;
    
    for (let i = 0; i < text.length && searchIndex < search.length; i++) {
      if (text[i] === search[searchIndex]) {
        score += 1;
        searchIndex++;
      }
    }
    
    // Bonus for matching at word boundaries
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(search)) {
        score += 20;
        break;
      }
    }
    
    return searchIndex === search.length ? score : 0;
  };

  const filteredItems = useMemo(() => {
    const items = selectedType === 'skill' ? availableSkills : availableTools;
    return fuzzySearch(items, searchTerm);
  }, [selectedType, searchTerm, availableSkills, availableTools]);

  const handleSubmit = (value: string) => {
    onSubmit(selectedType, value);
    setSearchTerm('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredItems.length > 0) {
      handleSubmit(filteredItems[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add {selectedType === 'skill' ? 'Skill' : 'Tool'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                <button
                  onClick={() => setSelectedType('skill')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    selectedType === 'skill'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Skills
                </button>
                <button
                  onClick={() => setSelectedType('tool')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    selectedType === 'tool'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tools
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Search ${selectedType === 'skill' ? 'skills' : 'tools'}...`}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto">
                {filteredItems.length > 0 ? (
                  <div className="space-y-1">
                    {filteredItems.map((item, index) => (
                      <button
                        key={item}
                        onClick={() => handleSubmit(item)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between group"
                      >
                        <span className="text-gray-900">{item}</span>
                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index === 0 && searchTerm ? 'Press Enter' : 'Click to add'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No {selectedType === 'skill' ? 'skills' : 'tools'} found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  {selectedType === 'skill' ? 'Skills' : 'Tools'} will be added to your profile
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
