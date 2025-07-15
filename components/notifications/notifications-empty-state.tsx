'use client';

interface NotificationsEmptyStateProps {
  activeTab: 'all' | 'network';
  message?: string;
}

export default function NotificationsEmptyState({
  activeTab,
  message = "No notifications yet"
}: NotificationsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 0 1 19 0v10z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {activeTab === 'network' ? 'Your Network is Quiet' : 'All Caught Up!'}
      </h3>

      <p className="text-gray-500 max-w-sm">
        {message}
      </p>

      {activeTab === 'network' && (
        <p className="text-sm text-gray-400 mt-2">
          Notifications from freelancers in your network will appear here
        </p>
      )}
    </div>
  );
}