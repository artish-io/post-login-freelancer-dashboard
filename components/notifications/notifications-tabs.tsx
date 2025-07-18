'use client';

import { motion } from 'framer-motion';

interface NotificationsTabsProps {
  activeTab: 'all' | 'network' | 'projects' | 'gigs';
  onTabChange: (tab: 'all' | 'network' | 'projects' | 'gigs') => void;
  allCount?: number;
  networkCount?: number;
  projectsCount?: number;
  gigsCount?: number;
  userType?: 'commissioner' | 'freelancer';
}

export default function NotificationsTabs({
  activeTab,
  onTabChange,
  allCount = 0,
  networkCount = 0,
  projectsCount = 0,
  gigsCount = 0,
  userType = 'commissioner'
}: NotificationsTabsProps) {
  // Define tabs based on user type
  const tabs = userType === 'freelancer'
    ? [
        { key: 'all', label: 'All', count: allCount },
        { key: 'projects', label: 'Projects', count: projectsCount },
        { key: 'gigs', label: 'Gigs', count: gigsCount }
      ]
    : [
        { key: 'all', label: 'All', count: allCount },
        { key: 'network', label: 'Your Network', count: networkCount }
      ];

  return (
    <div className="flex items-center gap-32 border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <motion.button
          key={tab.key}
          onClick={() => onTabChange(tab.key as any)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-all duration-300 ${
            activeTab === tab.key
              ? 'border-[#eb1966] text-[#eb1966]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
            >
              {tab.count}
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
}