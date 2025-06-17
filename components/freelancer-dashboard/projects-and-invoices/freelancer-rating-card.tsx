'use client';

import { useEffect, useState } from 'react';
import { Star, ArrowUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function FreelancerRatingCard() {
  const { data: session } = useSession();
  const [rating, setRating] = useState<number | null>(null);
  const [trend, setTrend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchRating = async () => {
      try {
        const res = await fetch(`/api/dashboard/freelancer-rating?freelancerId=${session.user.id}`);
        const data = await res.json();
        setRating(data.rating ?? null);
        setTrend(data.trend ?? null);
      } catch (err) {
        console.error('[freelancer-rating] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [session?.user?.id]);

  const isValidRating = Number.isFinite(rating);
  const isValidTrend = Number.isFinite(trend);

  if (loading || !isValidRating || !isValidTrend) {
    return (
      <div className="rounded-2xl bg-pink-100 p-6 shadow-md flex items-center justify-center min-w-[160px]">
        <p className="text-sm text-gray-500">Loading rating...</p>
      </div>
    );
  }

  const fullStars = Math.floor(rating!);
  const hasHalfStar = rating! % 1 >= 0.3 && rating! % 1 < 0.8;

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
        {rating!.toFixed(1)}/5
      </div>

      {/* Growth */}
      <div className="flex items-center gap-1 text-sm mt-1 text-gray-700 font-medium">
        +{trend!.toFixed(2)}%
        <ArrowUpRight className="w-4 h-4" />
      </div>
    </div>
  );
}