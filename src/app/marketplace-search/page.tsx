'use client';

import { useState } from 'react';
import Navbar1 from '../../../components/navbar1';
import Footer from '../../../components/footer';
import SearchBar from '../../../components/store-search/search-bar';
import PageHeading from '../../../components/store-search/page-heading';
import CreateGigBanner from '../../../components/store-search/create-gig-banner';
import SidebarFilters from '../../../components/store-search/sidebar-filters';
import GigCardGrid from '../../../components/store-search/gig-card-grid';
import { Gig } from '../../../types/gig';
import freelancers from '../../../data/freelancers.json';

export default function MarketplaceSearchPage() {
  // New: query state for search bar
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('skill');
  const [minRate, setMinRate] = useState<string>('');
  const [maxRate, setMaxRate] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');

  const allGigs: Gig[] = freelancers as Gig[];
  const allCardsCount = allGigs.length;

  // Tag toggle logic
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filtering logic (now includes search query)
  const filteredGigs = allGigs.filter((gig) => {
    // Search logic (matches name, title, category, or skills)
    const queryMatch =
      !query ||
      gig.name.toLowerCase().includes(query.toLowerCase()) ||
      gig.title.toLowerCase().includes(query.toLowerCase()) ||
      gig.category.toLowerCase().includes(query.toLowerCase()) ||
      gig.skills.some(skill => skill.toLowerCase().includes(query.toLowerCase()));

    const categoryMatch = activeCategory
      ? gig.category.toLowerCase().includes(activeCategory.toLowerCase())
      : true;

    const tagMatch =
      selectedTags.length === 0 ||
      selectedTags.every(tag =>
        gig.skills.map(s => s.toLowerCase()).includes(tag.toLowerCase())
      );

    const gigMin = gig.minRate;
    const gigMax = gig.maxRate;
    const userMin = minRate ? parseInt(minRate, 10) : -Infinity;
    const userMax = maxRate ? parseInt(maxRate, 10) : Infinity;
    const rateMatch = gigMax >= userMin && gigMin <= userMax;

    const ratingMatch = selectedRating ? gig.rating >= parseInt(selectedRating, 10) : true;

    return queryMatch && categoryMatch && tagMatch && rateMatch && ratingMatch;
  });

  // Sorting logic
  const sortGigs = (gigs: Gig[]) => {
    switch (sortOption) {
      case 'rateLowToHigh':
        return [...gigs].sort((a, b) => a.minRate - b.minRate);
      case 'rateHighToLow':
        return [...gigs].sort((a, b) => b.maxRate - a.maxRate);
      case 'tools':
        return [...gigs].sort((a, b) => a.skills.join(',').localeCompare(b.skills.join(',')));
      case 'skill':
      default:
        return [...gigs].sort((a, b) => a.title.localeCompare(b.title));
    }
  };

  const sortedFilteredGigs = sortGigs(filteredGigs);

  const isFiltered =
    !!activeCategory ||
    selectedTags.length > 0 ||
    minRate.length > 0 ||
    maxRate.length > 0 ||
    selectedRating.length > 0 ||
    query.length > 0;

  // Dynamic heading logic
  let heading = 'All Freelancers';
  if (query) {
    heading = `'${query}'`;
  } else if (activeCategory) {
    heading = `'${activeCategory}'`;
  }

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="w-full border-t border-gray-200 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SearchBar
            query={query}
            setQuery={setQuery}
            setActiveCategory={setActiveCategory}
          />
        </div>
      </div>

      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <PageHeading heading={heading} />
          <CreateGigBanner />
        </div>
      </div>

      <section className="w-full bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/4">
            <SidebarFilters
              gigCards={sortedFilteredGigs}
              allCardsCount={allCardsCount}
              onCategoryChange={setActiveCategory}
              onTagToggle={handleTagToggle}
              onSortChange={setSortOption}
              selectedTags={selectedTags}
              minRate={minRate}
              maxRate={maxRate}
              onMinRateChange={setMinRate}
              onMaxRateChange={setMaxRate}
              isFiltered={isFiltered}
              selectedRating={selectedRating}
              onRatingChange={setSelectedRating}
            />
          </div>
          <div className="flex-grow">
            <GigCardGrid gigs={sortedFilteredGigs} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}