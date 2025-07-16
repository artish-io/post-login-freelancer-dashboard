'use client';

import { useState } from 'react';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import ActiveGigCardsRow from '../../../../components/commissioner-dashboard/job-listings/active-gig-cards-row';
import CandidateTable from '../../../../components/commissioner-dashboard/job-listings/candidate-table';
import CandidateDetailsSidebar from '../../../../components/commissioner-dashboard/job-listings/candidate-details-sidebar';

export default function JobListingsPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);



  const handleCandidateSelect = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedCandidate(null);
  };

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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Candidates</h2>
          <div className="w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <CandidateTable onCandidateSelect={handleCandidateSelect} />
          </div>
        </div>
      </div>

      {/* Candidate Details Sidebar */}
      <CandidateDetailsSidebar
        candidate={selectedCandidate}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
    </div>
  );
}