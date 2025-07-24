'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, DollarSign, Building2 } from 'lucide-react';
import CommissionerGigDetailsModal from './commissioner-gig-details-modal';

type GigListing = {
  id: number;
  title: string;
  category: string;
  budget: string;
  deadline: string;
  applicants: number;
  status: 'active' | 'closed' | 'in_progress';
};

type Props = {
  gigListings: GigListing[];
  isOwnProfile?: boolean;
  currentUserType?: string;
  onPostNewGig?: () => void;
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800'
};

const statusLabels = {
  active: 'Active',
  closed: 'Closed',
  in_progress: 'In Progress'
};

export default function RecentGigListings({
  gigListings,
  isOwnProfile = false,
  currentUserType,
  onPostNewGig
}: Props) {
  const [selectedGig, setSelectedGig] = useState<GigListing | null>(null);
  const [showGigDetails, setShowGigDetails] = useState(false);

  // Sort gigs by availability first, then by date
  const sortedGigs = [...gigListings].sort((a, b) => {
    // First sort by status (active first)
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;

    // Then sort by deadline (most recent first)
    return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
  });

  const handleGigClick = (gig: GigListing) => {
    setSelectedGig(gig);
    setShowGigDetails(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Recent Gig Listings</h2>
          <span className="bg-[#FCD5E3] text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
            {gigListings.length}
          </span>
        </div>
        {isOwnProfile && (
          <button
            onClick={onPostNewGig}
            className="flex items-center gap-2 bg-[#FCD5E3] hover:bg-[#F8C2D4] text-gray-800 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Post A New Gig
          </button>
        )}
      </div>

      {/* Gig Listings */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {sortedGigs.map((gig) => (
          <motion.div
            key={gig.id}
            variants={itemVariants}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-[#eb1966] transition-all cursor-pointer"
            onClick={() => handleGigClick(gig)}
          >
            {/* First line: Title only */}
            <h3 className="text-base font-semibold text-gray-900 mb-2">{gig.title}</h3>

            {/* Second line: Budget and date only */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>{gig.budget}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{gig.deadline}</span>
              </div>
            </div>
          </motion.div>
        ))}


      </motion.div>

      {/* Empty state */}
      {gigListings.length === 0 && !isOwnProfile && (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm">No gig listings available</p>
        </div>
      )}

      {/* Gig Details Modal */}
      {selectedGig && (
        <CommissionerGigDetailsModal
          gig={selectedGig}
          isOpen={showGigDetails}
          onClose={() => {
            setShowGigDetails(false);
            setSelectedGig(null);
          }}
          showApplyButton={!isOwnProfile && currentUserType === 'freelancer' && selectedGig.status === 'active'}
        />
      )}
    </section>
  );
}
