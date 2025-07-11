

'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  productId: string;
  isBuyer: boolean;          // whether the user owns the product (can rate)
  userId?: number;           // current user ID for submitting reviews
  defaultRating?: number;    // average or user rating from API
  onSubmit?: (rating: number) => void; // callback
};

export default function RatingStars({
  productId,
  isBuyer,
  userId,
  defaultRating = 0,
  onSubmit,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(defaultRating);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch current ratings on mount
  useEffect(() => {
    async function fetchRatings() {
      try {
        const cleanId = productId.replace(/^#/, '');
        const response = await fetch(`/api/storefront/products/${cleanId}/reviews`);
        const reviews = await response.json();

        if (reviews.length > 0) {
          const total = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
          const average = total / reviews.length;
          setAverageRating(average);

          // If user has already rated, show their rating
          if (userId) {
            const userReview = reviews.find((r: any) => r.userId === userId);
            if (userReview) {
              setSelected(userReview.rating);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch ratings:', error);
      }
    }

    fetchRatings();
  }, [productId, userId]);

  const handleSelect = async (rating: number) => {
    if (!isBuyer || !userId || loading) return;

    setLoading(true);
    setSelected(rating);
    onSubmit?.(rating);

    try {
      const cleanId = productId.replace(/^#/, '');
      const response = await fetch(`/api/storefront/products/${cleanId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating }),
      });

      if (response.ok) {
        // Refresh ratings to get updated average
        const reviewsResponse = await fetch(`/api/storefront/products/${cleanId}/reviews`);
        const reviews = await reviewsResponse.json();

        if (reviews.length > 0) {
          const total = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
          const average = total / reviews.length;
          setAverageRating(average);
        }
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      // Revert on error
      setSelected(defaultRating);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Star Rating */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = hovered ? n <= hovered : n <= selected;
          return (
            <button
              key={n}
              type="button"
              disabled={!isBuyer || loading}
              onMouseEnter={() => isBuyer && !loading && setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(n)}
              className={clsx(
                'p-0.5 transition-opacity',
                (!isBuyer || loading) && 'cursor-default opacity-60'
              )}
            >
              <Star
                size={20}
                className={filled ? 'fill-current text-black' : 'text-gray-400'}
              />
            </button>
          );
        })}
      </div>

      {/* Average Rating Display */}
      {averageRating > 0 && (
        <div className="text-xs text-gray-600">
          Average: {averageRating.toFixed(1)} stars
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-xs text-gray-500">Saving...</div>
      )}

      {/* Instructions for buyers */}
      {isBuyer && !loading && (
        <div className="text-xs text-gray-500 text-center">
          Click to rate this product
        </div>
      )}
    </div>
  );
}