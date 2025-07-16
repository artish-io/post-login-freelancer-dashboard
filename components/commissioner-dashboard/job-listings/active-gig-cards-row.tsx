'use client';

import ActiveGigCards from './active-gig-cards';

export default function ActiveGigCardsRow() {
  return (
    <div
      className="w-full"
      style={{
        maxWidth: '100%',
        overflow: 'hidden',
        contain: 'layout style'
      }}
    >
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4" style={{ maxWidth: '100%' }}>
        <h2 className="text-xl font-semibold text-gray-900">Active Job Listings</h2>
        <button className="text-sm text-pink-600 hover:text-pink-700 font-medium">
          View All
        </button>
      </div>

      {/* Scrollable Cards Container */}
      <div className="w-full overflow-x-auto scrollbar-hide">
        <ActiveGigCards />
      </div>
    </div>
  );
}