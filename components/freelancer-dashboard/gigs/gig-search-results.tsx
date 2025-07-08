

'use client';

import GigCard from './gig-card';

type Gig = {
  id: number;
  title: string;
  organizationId: number;
  category: string;
  tags: string[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  status: string;
  postedDate: string;
};

type Props = {
  gigs: Gig[];
};

export default function GigSearchResults({ gigs }: Props) {
  console.log('🎯 GigSearchResults received gigs:', gigs);
  console.log('📊 Number of gigs:', gigs?.length || 0);

  if (!gigs || gigs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No gigs found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {gigs.map((gig) => (
        <GigCard key={gig.id} gig={gig} />
      ))}
    </div>
  );
}