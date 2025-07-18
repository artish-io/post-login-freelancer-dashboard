'use client';

import clsx from 'clsx';

interface FreelancerNotificationsTabsProps {
  activeTab: 'all' | 'projects' | 'gigs';
  onTabChange: (tab: 'all' | 'projects' | 'gigs') => void;
  allCount: number;
  projectsCount: number;
  gigsCount: number;
}

export default function FreelancerNotificationsTabs({
  activeTab,
  onTabChange,
  allCount,
  projectsCount,
  gigsCount
}: FreelancerNotificationsTabsProps) {
  const tabs = [
    { id: 'all' as const, label: 'All', count: allCount },
    { id: 'projects' as const, label: 'Projects', count: projectsCount },
    { id: 'gigs' as const, label: 'Gigs', count: gigsCount }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2',
              activeTab === tab.id
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={clsx(
                  'inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full',
                  activeTab === tab.id
                    ? 'bg-pink-100 text-pink-600'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
