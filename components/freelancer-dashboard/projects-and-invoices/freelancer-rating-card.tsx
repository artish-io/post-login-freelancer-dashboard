'use client';

import { useEffect, useState } from 'react';
import { Star, ArrowUpRight, Calendar, Building2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserRatingsSummary, ProjectRating } from '../../../types/ratings';

interface FreelancerRatingCardProps {
  freelancerId?: number;
  showDetails?: boolean;
}

export default function FreelancerRatingCard({
  freelancerId,
  showDetails = false
}: FreelancerRatingCardProps) {
  const { data: session } = useSession();
  const [ratingsSummary, setRatingsSummary] = useState<UserRatingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use provided freelancerId or session user id
  const targetUserId = freelancerId || Number(session?.user?.id);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      setError('No user ID available');
      return;
    }

    const fetchRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/ratings/user?userId=${targetUserId}&userType=freelancer`);
        const data = await res.json();

        if (data.success) {
          setRatingsSummary(data.summary);
        } else {
          setError(data.message || 'Failed to load ratings');
        }
      } catch (err) {
        console.error('[freelancer-rating] Failed to load:', err);
        setError('Failed to load ratings');
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [targetUserId]);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex items-center justify-center min-w-[160px]">
        <p className="text-sm text-gray-500">Loading rating...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex items-center justify-center min-w-[160px]">
        <p className="text-sm text-red-500">Failed to load rating</p>
      </div>
    );
  }

  // No ratings state
  if (!ratingsSummary || ratingsSummary.totalRatings === 0) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex flex-col items-center justify-center min-w-[160px]">
        <div className="flex gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
          ))}
        </div>
        <div className="text-lg font-bold text-gray-500 mb-1">No ratings yet</div>
        <p className="text-xs text-gray-400 text-center">Complete projects to receive ratings</p>
      </div>
    );
  }

  const rating = ratingsSummary.averageRating;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.3 && rating % 1 < 0.8;

  if (showDetails) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex gap-1 mb-2">
            {[...Array(fullStars)].map((_, i) => (
              <Star key={`full-${i}`} className="w-5 h-5 fill-black text-black" />
            ))}
            {hasHalfStar && (
              <Star key="half" className="w-5 h-5 fill-gray-300 text-gray-300" />
            )}
            {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
              <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
            ))}
          </div>
          <div className="text-2xl font-bold text-black">
            {rating.toFixed(1)}/5
          </div>
          <p className="text-sm text-gray-600">
            {ratingsSummary.totalRatings} rating{ratingsSummary.totalRatings !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Recent Ratings */}
        {ratingsSummary.ratings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Recent Ratings</h4>
            {ratingsSummary.ratings.slice(0, 3).map((projectRating) => (
              <div key={projectRating.ratingId} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex gap-1">
                    {[...Array(projectRating.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                    {[...Array(5 - projectRating.rating)].map((_, i) => (
                      <Star key={i + projectRating.rating} className="w-3 h-3 text-gray-300" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(projectRating.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-medium">
                  {projectRating.projectTitle || 'Project'}
                </p>
                {projectRating.comment && (
                  <p className="text-xs text-gray-600 mt-1 italic">
                    "{projectRating.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Compact view
  return (
    <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex flex-col items-center justify-center min-w-[160px]">
      {/* Star Row */}
      <div className="flex gap-1 mb-2">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-5 h-5 fill-black text-black" />
        ))}
        {hasHalfStar && (
          <Star key="half" className="w-5 h-5 fill-gray-300 text-gray-300" />
        )}
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
        ))}
      </div>

      {/* Score */}
      <div className="text-4xl font-bold text-black">
        {rating.toFixed(1)}/5
      </div>

      {/* Count */}
      <div className="text-sm text-gray-700 font-medium">
        {ratingsSummary.totalRatings} rating{ratingsSummary.totalRatings !== 1 ? 's' : ''}
      </div>
    </div>
  );
}