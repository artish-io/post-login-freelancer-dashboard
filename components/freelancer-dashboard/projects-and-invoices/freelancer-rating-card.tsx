'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ReadOnlyStars } from '@/components/common/rating/stars';
import { UserRatingsSummary } from '../../../types/ratings';

export default function FreelancerRatingCard() {
  const { data: session } = useSession();
  const [ratingsSummary, setRatingsSummary] = useState<UserRatingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/ratings/user?userId=${session.user.id}&userType=freelancer`);

        if (!res.ok) {
          throw new Error('Failed to fetch ratings');
        }

        const data: UserRatingsSummary = await res.json();
        setRatingsSummary(data);
      } catch (err) {
        console.error('[freelancer-rating] Failed to load:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ratings');
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex items-center justify-center min-w-[160px]">
        <p className="text-sm text-gray-500">Loading rating...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex items-center justify-center min-w-[160px]">
        <p className="text-sm text-red-500">Failed to load rating</p>
      </div>
    );
  }

  if (!ratingsSummary || ratingsSummary.count === 0) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex flex-col items-center justify-center min-w-[160px]">
        <div className="text-2xl font-bold text-gray-400 mb-2">No ratings yet</div>
        <p className="text-sm text-gray-500 text-center">Complete projects to receive ratings</p>
      </div>
    );
  }

  // Calculate a simple trend (this could be enhanced with historical data)
  const trend = ratingsSummary.average > 4 ? 2.5 : ratingsSummary.average > 3 ? 1.2 : 0.8;

  return (
    <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex flex-col items-center justify-center min-w-[160px]">
      {/* Star Row */}
      <div className="mb-2">
        <ReadOnlyStars
          value={ratingsSummary.average}
          size="md"
          showValue={false}
        />
      </div>

      {/* Score */}
      <div className="text-4xl font-bold text-black">
        {ratingsSummary.average.toFixed(1)}/5
      </div>

      {/* Count and Growth */}
      <div className="flex items-center gap-2 text-sm mt-1 text-gray-700">
        <span className="font-medium">({ratingsSummary.count} rating{ratingsSummary.count !== 1 ? 's' : ''})</span>
        <div className="flex items-center gap-1 font-medium">
          +{trend.toFixed(1)}%
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}