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
import users from '../../../data/users.json';

export default function MarketplaceSearchPage() {
  // New: query state for search bar
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('skill');
  const [minRate, setMinRate] = useState<string>('');
  const [maxRate, setMaxRate] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');

  // Enrich freelancer data with user information (avatar, etc.)
  const enrichedFreelancers = freelancers.map(freelancer => {
    const userInfo = users.find(user => user.id === freelancer.id);
    return {
      ...freelancer,
      avatar: userInfo?.avatar || '/avatar.png', // Fallback to default avatar
      email: userInfo?.email,
      address: userInfo?.address,
    };
  });

  const allGigs: Gig[] = enrichedFreelancers as Gig[];
  const allCardsCount = allGigs.length;

  // Tag toggle logic
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Enhanced keyword mapping for better matching
  const categoryKeywordMap: Record<string, string[]> = {
    'Engineering': ['Software Development', 'Web Development', 'Programming', 'Development'],
    'Design': ['Design', 'Graphic Design', 'UI/UX', 'Visual Design'],
    'Marketing': ['Marketing', 'Digital Marketing', 'Social Media'],
    'Writing': ['Writing', 'Content Writing', 'Copywriting'],
    'Video Production': ['Video', 'Production', 'Media'],
    'Audio & Music': ['Audio', 'Music', 'Sound'],
  };

  const skillKeywordMap: Record<string, string[]> = {
    'Web Development': ['JavaScript', 'HTML5', 'CSS', 'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'Web Development', 'Frontend', 'Backend', 'Full Stack'],
    'Frontend': ['JavaScript', 'HTML5', 'CSS', 'React', 'Vue', 'Angular', 'TypeScript', 'Frontend', 'UI', 'Tailwind'],
    'Backend': ['Node.js', 'Python', 'Ruby', 'PHP', 'Java', 'Backend', 'API', 'MongoDB', 'GraphQL', 'Django', 'Pandas'],
    'Blockchain': ['Blockchain', 'Smart Contracts', 'Web3', 'Ethereum', 'Solidity', 'Crypto'],
    'Smart Contracts': ['Smart Contracts', 'Blockchain', 'Web3', 'Ethereum', 'Solidity'],
    'DevOps': ['DevOps', 'Docker', 'AWS', 'CI/CD', 'Kubernetes', 'Cloud'],
    'Programming': ['JavaScript', 'Python', 'Ruby', 'Java', 'C++', 'Programming', 'TypeScript', 'HTML5'],
    'Mobile Development': ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile', 'App Development'],
    // Add more comprehensive mappings
    'App Development': ['App Development', 'Mobile', 'React Native', 'Flutter', 'iOS', 'Android'],
    'Full Stack': ['Full Stack', 'Web Development', 'Frontend', 'Backend', 'JavaScript', 'Node.js', 'React'],
  };

  // Helper function to check if category matches using keywords
  const matchesCategory = (gigCategory: string, filterCategory: string): boolean => {
    const keywords = categoryKeywordMap[filterCategory] || [filterCategory];
    return keywords.some(keyword =>
      gigCategory.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Helper function to check if skills match using keywords
  const matchesSkillTag = (gigSkills: string[], filterTag: string): boolean => {
    const keywords = skillKeywordMap[filterTag] || [filterTag];
    return keywords.some(keyword =>
      gigSkills.some(skill =>
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      )
    );
  };

  // Filtering logic (now includes search query and enhanced matching)
  const filteredGigs = allGigs.filter((gig) => {
    // Search logic (matches name, title, category, or skills)
    const queryMatch =
      !query ||
      gig.name.toLowerCase().includes(query.toLowerCase()) ||
      gig.title.toLowerCase().includes(query.toLowerCase()) ||
      gig.category.toLowerCase().includes(query.toLowerCase()) ||
      gig.skills.some(skill => skill.toLowerCase().includes(query.toLowerCase()));

    const categoryMatch = activeCategory
      ? matchesCategory(gig.category, activeCategory)
      : true;

    const tagMatch =
      selectedTags.length === 0 ||
      selectedTags.some(tag => matchesSkillTag(gig.skills, tag));

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