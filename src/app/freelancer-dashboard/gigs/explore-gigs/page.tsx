'use client';

import { useEffect, useState } from 'react';
import GigSearchResults from '../../../../../components/freelancer-dashboard/gigs/gig-search-results';
import GigFiltersModal from '../../../../../components/freelancer-dashboard/gigs/gig-filters-expansion-modal';
import GigFilters from '../../../../../components/freelancer-dashboard/gigs/gig-filters';
import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';

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

export default function ExploreGigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        console.log('🔍 Fetching gigs from /api/gigs...');
        const res = await fetch('/api/gigs');
        console.log('📡 Response status:', res.status);
        const data = await res.json();
        console.log('📊 Fetched gigs data:', data);
        if (Array.isArray(data)) {
          setGigs(data);
          console.log('✅ Successfully set gigs:', data.length, 'items');
        } else {
          console.error('❌ API did not return an array:', data);
        }
      } catch (error) {
        console.error('❌ Failed to load gigs:', error);
      }
    };

    fetchGigs();
  }, []);

  return (
    <section className="p-4 md:p-8">
      <div className="flex flex-col w-full">
        <FreelancerHeader />
        <div className="w-full">
          <GigFilters />
        </div>
      </div>

      {/* Filters Modal */}
      <GigFiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Gig Results */}
      <GigSearchResults gigs={gigs} />
    </section>
  );
}
