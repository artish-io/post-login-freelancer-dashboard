'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

type Props = {
  title: string;
  items: string[];
  isOwnProfile?: boolean;
  onAddItem?: (item: string) => void;
  onRemoveItem?: (item: string) => void;
  placeholder?: string;
  maxItems?: number;
};

export default function SkillsSection({
  title,
  items,
  isOwnProfile = false,
  onAddItem,
  onRemoveItem,
  placeholder = "Add new item",
  maxItems = 20
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim() && onAddItem && items.length < maxItems) {
      onAddItem(newItem.trim());
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setNewItem('');
      setIsAdding(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-2"
      >
        {items.map((item, index) => (
          <motion.div
            key={`${item}-${index}`}
            variants={itemVariants}
            className="group relative inline-flex items-center gap-2 px-3 py-2 bg-[#FCD5E3] text-gray-800 rounded-full text-sm font-medium"
          >
            <span>{item}</span>
            {isOwnProfile && onRemoveItem && (
              <button
                onClick={() => onRemoveItem(item)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        ))}

        {/* Add new item */}
        {isOwnProfile && items.length < maxItems && (
          <>
            {isAdding ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={() => {
                    if (!newItem.trim()) {
                      setIsAdding(false);
                    }
                  }}
                  placeholder={placeholder}
                  className="px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.trim()}
                  className="px-3 py-2 bg-[#eb1966] text-white rounded-full text-sm hover:bg-[#d1175a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewItem('');
                    setIsAdding(false);
                  }}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.button
                variants={itemVariants}
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <div className="w-4 h-4 rounded-full bg-[#FCD5E3] flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </div>
                Add {title.toLowerCase().slice(0, -1)}
              </motion.button>
            )}
          </>
        )}
      </motion.div>

      {/* Empty state */}
      {items.length === 0 && !isOwnProfile && (
        <div className="text-gray-500 text-sm italic">
          No {title.toLowerCase()} listed
        </div>
      )}
    </section>
  );
}
