'use client';

interface NotificationsEmptyStateProps {
  activeTab: 'all' | 'network' | 'projects' | 'gigs';
  message?: string;
}

export default function NotificationsEmptyState({
  activeTab,
  message = "No notifications yet"
}: NotificationsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {activeTab === 'network' ? 'Your Network is Quiet' :
         activeTab === 'projects' ? 'No Project Updates' :
         activeTab === 'gigs' ? 'No Gig Notifications' : 'All Caught Up!'}
      </h3>

      <p className="text-gray-500 max-w-sm">
        {message ||
         (activeTab === 'network' ? "No notifications from your network yet" :
          activeTab === 'projects' ? "No project-related notifications yet" :
          activeTab === 'gigs' ? "No gig-related notifications yet" : "No notifications yet")}
      </p>

      {activeTab === 'network' && (
        <p className="text-sm text-gray-400 mt-2">
          Notifications from freelancers in your network will appear here
        </p>
      )}
      {activeTab === 'projects' && (
        <p className="text-sm text-gray-400 mt-2">
          Project updates, task completions, and comments will appear here
        </p>
      )}
      {activeTab === 'gigs' && (
        <p className="text-sm text-gray-400 mt-2">
          Gig requests, proposals, and applications will appear here
        </p>
      )}
    </div>
  );
}