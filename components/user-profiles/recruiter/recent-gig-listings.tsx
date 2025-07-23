'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, DollarSign, Users, ExternalLink, Building2 } from 'lucide-react';
import Link from 'next/link';

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
  onPostNewGig 
}: Props) {
  const [hoveredGig, setHoveredGig] = useState<number | null>(null);

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
        <h2 className="text-xl font-semibold text-gray-900">Recent Gig Listings</h2>
        {isOwnProfile && (
          <button
            onClick={onPostNewGig}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[#FCD5E3] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
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
        {gigListings.map((gig) => (
          <motion.div
            key={gig.id}
            variants={itemVariants}
            className="group relative bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            onMouseEnter={() => setHoveredGig(gig.id)}
            onMouseLeave={() => setHoveredGig(null)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{gig.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[gig.status]}`}>
                    {statusLabels[gig.status]}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{gig.category}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {gig.budget}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {gig.deadline}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {gig.applicants} applicants
                  </div>
                </div>
              </div>

              {/* Action button on hover */}
              {hoveredGig === gig.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-4"
                >
                  <Link
                    href={`/gig/${gig.id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Gig
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Post new gig card (only for own profile) */}
        {isOwnProfile && (
          <motion.button
            variants={itemVariants}
            onClick={onPostNewGig}
            className="group w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors p-8 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <div className="w-12 h-12 rounded-full bg-[#FCD5E3] flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Post New Gig</span>
            <span className="text-xs text-gray-400 mt-1">Find the perfect freelancer for your project</span>
          </motion.button>
        )}
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
    </section>
  );
}
