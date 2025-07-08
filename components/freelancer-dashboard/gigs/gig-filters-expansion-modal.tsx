

'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  'All Categories',
  'Design',
  'Writing',
  'Marketing',
  'Engineering',
  'Social Media',
  'Visual Media',
  'Audio & Music',
  'Data & Analytics',
  'Accounting',
  'Product',
  'Others',
];

const hourlyRates = [
  '$20 - $50/hr',
  '$50 - $75/hr',
  '$75 - $100/hr',
  '$100 - $150/hr',
  '$150 - $200/hr',
  '$200+/hr',
];

export default function GigFiltersExpansionModal({
  onClose,
  isOpen,
}: {
  onClose: () => void;
  isOpen: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedRates, setSelectedRates] = useState<string[]>([]);

  const toggleRate = (rate: string) => {
    setSelectedRates((prev) =>
      prev.includes(rate) ? prev.filter((r) => r !== rate) : [...prev, rate]
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
        <button onClick={onClose} className="text-sm mb-4 flex items-center gap-1 text-gray-500 hover:text-black">
          <X className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'rounded-2xl text-xs md:text-sm px-2 md:px-3 py-3 md:py-4 flex flex-col items-center justify-center font-medium border-2',
                selectedCategory === cat
                  ? 'bg-pink-100 border-pink-500 text-pink-600'
                  : 'bg-pink-50 border-pink-200 text-black hover:border-pink-400'
              )}
            >
              {/* Optional: Insert icons here if available */}
              <span className="text-center leading-tight">{cat}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Skill Category</label>
            <input
              className="w-full border rounded-full px-3 md:px-4 py-2 text-sm"
              placeholder="Tag skills that are relevant to your search"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Required Tools</label>
            <input
              className="w-full border rounded-full px-3 md:px-4 py-2 text-sm"
              placeholder="Tag skills tools required to get the job done"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold block mb-2">Hourly Rate</label>
          <div className="flex flex-wrap gap-2">
            {hourlyRates.map((rate) => (
              <button
                key={rate}
                onClick={() => toggleRate(rate)}
                className={clsx(
                  'px-4 py-2 rounded-full border text-sm',
                  selectedRates.includes(rate)
                    ? 'bg-black text-white border-black'
                    : 'border-gray-300 text-black hover:border-black'
                )}
              >
                {rate}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div>
            <label className="text-sm font-semibold block mb-1">Location</label>
            <input
              className="w-full border rounded-full px-3 md:px-4 py-2 text-sm"
              placeholder="Tag up to three target countries"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Preferred Languages</label>
            <input
              className="w-full border rounded-full px-3 md:px-4 py-2 text-sm"
              placeholder="Tag up to two languages"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="bg-black text-white px-6 py-2 rounded-full text-sm">Add Filter</button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}