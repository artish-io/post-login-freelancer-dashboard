'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Linkedin, TrendingUp, TrendingDown, MessageCircle } from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface CommissionerProfileHeaderProps {
  profile: {
    id: string;
    name: string;
    avatar: string;
    location: string;
    lifetimeValue: number;
    rating?: number;
    quarterlyChange?: number;
    isActivelyCommissioning?: boolean;
    socialLinks: SocialLink[];
  };
  viewerUserType?: 'commissioner' | 'freelancer';
  isOwnProfile?: boolean;
}

export default function CommissionerProfileHeader({
  profile,
  viewerUserType = 'commissioner',
  isOwnProfile = false
}: CommissionerProfileHeaderProps) {
  const { name, avatar, location, lifetimeValue, rating, quarterlyChange, isActivelyCommissioning, socialLinks } = profile;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star size={16} className="text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} size={16} className="text-gray-300" />
      );
    }

    return stars;
  };

  const linkedinLink = socialLinks.find(link => link.platform === 'linkedin');

  return (
    <div className="flex flex-col sm:flex-row gap-6 mb-8">
      {/* Profile Image */}
      <div className="flex-shrink-0">
        <Image
          src={avatar}
          alt={name}
          width={120}
          height={120}
          className="rounded-full object-cover border-4 border-white shadow-lg"
        />
      </div>

      {/* Profile Info */}
      <div className="flex-1">
        {/* Actively Commissioning Indicator */}
        {isActivelyCommissioning && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">actively commissioning</span>
          </div>
        )}

        <h1 className="text-3xl font-semibold text-gray-900 mb-3">{name}</h1>
        
        {/* Location and Message Button */}
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{location}</span>
            </div>
            {/* Message Button for Freelancer Viewers */}
            {viewerUserType === 'freelancer' && !isOwnProfile && (
              <Link href={`/freelancer-dashboard/messages?page=new&receiverId=${profile.id}`} passHref>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#eb1966] text-white rounded-full text-sm font-medium hover:bg-[#d1175a] transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Total Value of Projects Commissioned */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Projects Commissioned:</span>
            <div className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-full text-sm min-w-[120px]">
              <span className="font-medium">{formatCurrency(lifetimeValue)}</span>
            </div>
            {/* Quarterly Change Indicator */}
            {quarterlyChange !== undefined && quarterlyChange !== 0 && (
              <div className="flex items-center gap-1">
                {quarterlyChange > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${quarterlyChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(quarterlyChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              {renderStars(rating)}
            </div>
            <span className="text-sm text-gray-600 ml-1">
              {rating.toFixed(1)}/5
            </span>
          </div>
        )}

        {/* Social Links */}
        {linkedinLink && (
          <div className="flex items-center gap-3">
            <a
              href={linkedinLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Linkedin size={20} />
              <span className="text-sm font-medium">LinkedIn</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
