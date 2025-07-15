'use client';

import { motion } from 'framer-motion';

interface NotificationsTabsProps {
  activeTab: 'all' | 'network';
  onTabChange: (tab: 'all' | 'network') => void;
  allCount?: number;
  networkCount?: number;
}

export default function NotificationsTabs({
  activeTab,
  onTabChange,
  allCount = 0,
  networkCount = 0
}: NotificationsTabsProps) {
  return (
    <div className="flex items-center gap-32 border-b border-gray-200 mb-6">
      <motion.button
        onClick={() => onTabChange('all')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-all duration-300 ${
          activeTab === 'all'
            ? 'border-[#eb1966] text-[#eb1966]'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        All
        {allCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
          >
            {allCount}
          </motion.span>
        )}
      </motion.button>

      <motion.button
        onClick={() => onTabChange('network')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-all duration-300 ${
          activeTab === 'network'
            ? 'border-[#eb1966] text-[#eb1966]'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Your Network
        {networkCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
          >
            {networkCount}
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}