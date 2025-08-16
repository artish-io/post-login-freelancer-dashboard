'use client';

import { useState, useMemo, useEffect } from 'react';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import TalentSearchBar from '../../../../components/commissioner-dashboard/discover-talent/talent-search-bar';
import TalentFilters from '../../../../components/commissioner-dashboard/discover-talent/talent-filters';
import CreateGigBanner from '../../../../components/store-search/create-gig-banner';
import GigCardGrid from '../../../../components/store-search/gig-card-grid';
import TalentFiltersModal from '../../../../components/commissioner-dashboard/discover-talent/talent-filters-modal';
import { Gig } from '../../../../types/gig';
import gigCategories from '../../../../data/gigs/gig-categories.json';
import gigTools from '../../../../data/gigs/gig-tools.json';

export default function DiscoverTalentPage() {
  const [query, setQuery] = useState('');
  const [selectedTimeZone, setSelectedTimeZone] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');

  // Data state
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Enrich freelancer data with user information (must be before conditional return)
  const enrichedFreelancers = useMemo(() => {
    return freelancers.map(freelancer => {
      const userInfo = users.find(user => user.id === freelancer.userId);
      return {
        ...freelancer,
        name: userInfo?.name || 'Unknown User',
        title: userInfo?.title || 'Freelancer',
        avatar: userInfo?.avatar || '/avatar.png',
        email: userInfo?.email,
        address: userInfo?.address,
      };
    });
  }, [freelancers, users]);

  // Create search data arrays for fuzzy matching (must be before conditional return)
  const searchData = useMemo(() => {
    // Extract skills as strings from categories and subcategories
    const skills = gigCategories.flatMap(cat => [
      cat.label,
      ...cat.subcategories.map(sub => typeof sub === 'string' ? sub : sub.name)
    ]);

    // Extract tools as strings from tools data
    const tools = gigTools.flatMap(cat =>
      cat.tools.map(tool => typeof tool === 'string' ? tool : tool.name)
    );

    const freelancerNames = enrichedFreelancers.map(f => f.name);

    return {
      skills,
      tools,
      freelancerNames,
      all: [...skills, ...tools, ...freelancerNames]
    };
  }, [enrichedFreelancers]);

  // Filter freelancers based on search and filters (must be before conditional return)
  const filteredFreelancers = useMemo(() => {
    let filtered = enrichedFreelancers;

    // Search filter with fuzzy matching
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(freelancer => {
        // Match freelancer name
        if (freelancer.name.toLowerCase().includes(queryLower)) return true;

        // Match skills/categories
        if (freelancer.skillCategories?.some((skill: any) =>
          skill.toLowerCase().includes(queryLower)
        )) return true;

        // Match tools
        if (freelancer.tools?.some((tool: any) =>
          tool.toLowerCase().includes(queryLower)
        )) return true;

        // Match category
        if (freelancer.category?.toLowerCase().includes(queryLower)) return true;

        return false;
      });
    }

    // Time zone filter (based on location)
    if (selectedTimeZone) {
      filtered = filtered.filter(freelancer =>
        freelancer.location?.toLowerCase().includes(selectedTimeZone.toLowerCase())
      );
    }

    // Rate filter
    if (minRate || maxRate) {
      filtered = filtered.filter(freelancer => {
        const min = minRate ? parseInt(minRate) : 0;
        const max = maxRate ? parseInt(maxRate) : Infinity;
        return freelancer.minRate >= min && freelancer.maxRate <= max;
      });
    }

    return filtered;
  }, [enrichedFreelancers, query, selectedTimeZone, minRate, maxRate]);

  // Fetch data from hierarchical storage
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [freelancersResponse, usersResponse] = await Promise.all([
          fetch('/api/freelancers/all'),
          fetch('/api/users/all')
        ]);

        if (freelancersResponse.ok && usersResponse.ok) {
          const freelancersData = await freelancersResponse.json();
          const usersData = await usersResponse.json();

          setFreelancers(freelancersData);
          setUsers(usersData);
        } else {
          console.error('Failed to fetch data from hierarchical storage');
          setFreelancers([]);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setFreelancers([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <CommissionerHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading talent...</div>
        </div>
      </div>
    );
  }

  const allGigs: Gig[] = filteredFreelancers as Gig[];

  return (
    <div className="min-h-screen bg-white">
      {/* Commissioner Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <CommissionerHeader />
      </div>

      {/* Create Gig Banner */}
      <div className="px-4">
        <CreateGigBanner />
      </div>

      {/* Search Bar */}
      <TalentSearchBar
        query={query}
        setQuery={setQuery}
        searchableData={searchData.all}
        freelancerNames={searchData.freelancerNames}
        skills={searchData.skills}
        tools={searchData.tools}
      />

      {/* Filters */}
      <TalentFilters
        selectedTimeZone={selectedTimeZone}
        setSelectedTimeZone={setSelectedTimeZone}
        minRate={minRate}
        setMinRate={setMinRate}
        maxRate={maxRate}
        setMaxRate={setMaxRate}
        onFiltersClick={() => setFiltersOpen(true)}
      />

      {/* Results Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <GigCardGrid gigs={allGigs} />
      </section>

      {/* Filters Modal */}
      <TalentFiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        selectedTimeZone={selectedTimeZone}
        setSelectedTimeZone={setSelectedTimeZone}
        minRate={minRate}
        setMinRate={setMinRate}
        maxRate={maxRate}
        setMaxRate={setMaxRate}
      />
    </div>
  );
}