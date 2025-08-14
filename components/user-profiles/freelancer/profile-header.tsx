

'use client';

import Image from 'next/image';
import { MapPinIcon, StarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { UserRatingsSummary } from '../../../types/ratings';

type SocialLink = {
  platform: string;
  url: string;
};

type Props = {
  userId?: number;
  name: string;
  avatar: string;
  location: string;
  hourlyRate: { min: number; max: number };
  rating?: number; // Made optional since we'll fetch from API
  socialLinks: SocialLink[];
};

const socialIconMap: Record<string, string> = {
  linkedin: '/icons/social/linkedin.svg',
  behance: '/icons/social/behance.svg',
  dribbble: '/icons/social/dribbble.svg',
  website: '/icons/social/link.svg'
};

export default function ProfileHeader({
  userId,
  name,
  avatar,
  location,
  hourlyRate,
  rating: propRating,
  socialLinks
}: Props) {
  const [ratingsSummary, setRatingsSummary] = useState<UserRatingsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch ratings if userId is provided
  useEffect(() => {
    if (!userId) return;

    const fetchRatings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ratings/user?userId=${userId}&userType=freelancer`);
        const data = await response.json();

        if (data.success) {
          setRatingsSummary(data.summary);
        }
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [userId]);

  // Use fetched rating or fallback to prop rating
  const displayRating = ratingsSummary?.averageRating ?? propRating;
  const ratingCount = ratingsSummary?.totalRatings ?? 0;
  return (
    <section className="flex items-start gap-6">
      <Image
        src={avatar}
        alt={`${name} avatar`}
        width={120}
        height={120}
        className="rounded-full object-cover border border-gray-300"
      />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>

        <div className="flex flex-wrap gap-3 items-center text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="w-4 h-4" />
            {location}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            ${hourlyRate.min} - ${hourlyRate.max}/hr
          </span>
          {displayRating !== undefined ? (
            <span
              className="inline-flex items-center gap-1"
              title={`Average rating: ${displayRating.toFixed(2)}/5 from ${ratingCount} rating${ratingCount !== 1 ? 's' : ''}`}
            >
              <StarIcon className="w-4 h-4 text-yellow-500" />
              {displayRating.toFixed(1)}/5
              {ratingCount > 0 && (
                <span className="text-xs text-gray-500">({ratingCount})</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <StarIcon className="w-4 h-4 text-gray-400" />
              No ratings yet
            </span>
          )}
        </div>

        <div className="flex gap-3 mt-1">
          {socialLinks.map((link) => {
            const iconSrc = socialIconMap[link.platform];
            return iconSrc ? (
              <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">
                <Image src={iconSrc} alt={link.platform} width={20} height={20} />
              </a>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}