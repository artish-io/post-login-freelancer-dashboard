'use client';

import { useState, useCallback } from 'react';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import ActiveGigCardsRow from '../../../../components/commissioner-dashboard/job-listings/active-gig-cards-row';
import CandidateTable from '../../../../components/commissioner-dashboard/job-listings/candidate-table';
import CandidateDetailsSidebar from '../../../../components/commissioner-dashboard/job-listings/candidate-details-sidebar';
import { ToastProvider } from '../../../../components/ui/toast';

type ViewMode = 'all' | 'gig-listings' | 'gig-requests' | 'matched-listings' | 'rejected-listings' | 'accepted-requests' | 'rejected-requests';

function JobListingsPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ViewMode>('all');
  const [tabCounts, setTabCounts] = useState<Record<ViewMode, number>>({
    'all': 0,
    'gig-listings': 0,
    'gig-requests': 0,
    'matched-listings': 0,
    'rejected-listings': 0,
    'accepted-requests': 0,
    'rejected-requests': 0
  });

  const handleCandidateSelect = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedCandidate(null);
  };

  const handleCandidateUpdate = useCallback(() => {
    // Force refresh of candidate table by updating key
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleTabCountsUpdate = useCallback((counts: Record<ViewMode, number>) => {
    setTabCounts(counts);
  }, []);

  return (
    <div
      className="w-full max-w-6xl mx-auto px-4 md:px-6"
      style={{
        maxWidth: '100vw',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div className="w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <CommissionerHeader />
      </div>

      {/* Main Content */}
      <div className="mt-8 space-y-8" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Active Gig Cards Row - Completely Isolated */}
        <div
          className="w-full"
          style={{
            maxWidth: '100%',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <ActiveGigCardsRow />
        </div>

        {/* Candidates Section - Fixed Width Container */}
        <div className="w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Candidates & Requests</h2>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="overflow-x-auto whitespace-nowrap">
              <nav className="flex gap-4 border-b border-gray-200 scroll-smooth">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'gig-listings', label: 'Gig Listings' },
                  { key: 'gig-requests', label: 'Gig Requests' },
                  { key: 'matched-listings', label: 'Matched Listings' },
                  { key: 'rejected-listings', label: 'Rejected Listings' },
                  { key: 'accepted-requests', label: 'Accepted Requests' },
                  { key: 'rejected-requests', label: 'Rejected Requests' }
                ].map((tab) => {
                  const count = tabCounts[tab.key as ViewMode] || 0;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveView(tab.key as ViewMode)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap min-w-fit inline-flex ${
                        activeView === tab.key
                          ? 'border-[#eb1966] text-[#eb1966]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <CandidateTable
              key={`${refreshKey}-${activeView}`}
              onCandidateSelect={handleCandidateSelect}
              viewMode={activeView}
            />
          </div>
        </div>
      </div>

      {/* Candidate Details Sidebar */}
      <CandidateDetailsSidebar
        candidate={selectedCandidate}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onCandidateUpdate={handleCandidateUpdate}
      />
    </div>
  );
}

// Wrap the component with ToastProvider
function JobListingsPageWithToast() {
  return (
    <ToastProvider>
      <JobListingsPage />
    </ToastProvider>
  );
}

export { JobListingsPageWithToast as default };