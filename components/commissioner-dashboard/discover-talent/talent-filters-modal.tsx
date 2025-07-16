'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gigCategories from '../../../data/gigs/gig-categories.json';

const timeZones = [
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'India',
  'Germany',
  'Ireland',
  'Spain',
  'Baker Island',
  'American Samoa',
  'Hawaii',
  'Alaska',
  'Mexico',
  'Guatemala',
  'Barbados',
  'Argentina',
  'South Georgia and the South Sandwich Islands',
  'Cabo Verde',
  'South Africa',
  'Saudi Arabia',
  'United Arab Emirates',
  'Pakistan',
  'Bangladesh',
  'Thailand',
  'China',
  'Japan',
  'Papua New Guinea',
  'Solomon Islands',
  'New Zealand',
];

type TalentFiltersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTimeZone: string;
  setSelectedTimeZone: (timeZone: string) => void;
  minRate: string;
  setMinRate: (rate: string) => void;
  maxRate: string;
  setMaxRate: (rate: string) => void;
};

export default function TalentFiltersModal({
  isOpen,
  onClose,
  selectedTimeZone,
  setSelectedTimeZone,
  minRate,
  setMinRate,
  maxRate,
  setMaxRate,
}: TalentFiltersModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const clearAllFilters = () => {
    setSelectedTimeZone('');
    setMinRate('');
    setMaxRate('');
    setSelectedCategories([]);
    setSelectedSkills([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-start pt-8 md:pt-24 px-2 md:px-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-4xl shadow-lg"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Filter Talent</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {gigCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-2 text-sm rounded-full border transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-pink-100 border-pink-300 text-pink-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {gigCategories.flatMap(cat => cat.subcategories).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-2 text-sm rounded-full border transition-colors ${
                      selectedSkills.includes(skill)
                        ? 'bg-pink-100 border-pink-300 text-pink-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Location and Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Time Zone */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Time Zone</label>
                <select
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="">Select time zone</option>
                  {timeZones.map((timeZone) => (
                    <option key={timeZone} value={timeZone}>
                      {timeZone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate Range */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Hourly Rate</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all filters
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
