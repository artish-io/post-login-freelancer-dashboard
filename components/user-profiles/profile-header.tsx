'use client';

import Image from 'next/image';
import { MapPin, Star, MessageCircle, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { UserRatingsSummary } from '../../types/ratings';
import ResumePill from '../freelancer-dashboard/profile/resume-pill';
import PortfolioIcons, { type Outlink } from '../profile/PortfolioIcons';
import RateRangeEditor, { type RateRange } from '../profile/RateRangeEditor';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rate?: string;
  rating?: number;
  outlinks?: Outlink[];
  rateRange?: RateRange;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
}

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile?: boolean;
  viewerUserType?: string;
  profileType?: string;
  currentResume?: any;
  onResumeUpdate?: (resume: any) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onUpdateProfile?: (field: string, value: string) => void;
  onUpdateOutlinks?: (outlinks: Outlink[]) => void;
  onUpdateRateRange?: (rateRange: RateRange) => void;
}



export default function ProfileHeader({
  profile,
  isOwnProfile = false,
  viewerUserType,
  profileType,
  currentResume,
  onResumeUpdate,
  isEditMode = false,
  onToggleEditMode,
  onUpdateProfile,
  onUpdateOutlinks,
  onUpdateRateRange
}: ProfileHeaderProps) {
  const [editedProfile, setEditedProfile] = useState({
    location: profile.location || '',
    rate: profile.rate || '',
    avatar: profile.avatar || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProfile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    // Create FormData and upload
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/freelancer/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        onUpdateProfile('avatar', result.avatarUrl);
        setEditedProfile(prev => ({ ...prev, avatar: result.avatarUrl }));
      } else {
        alert(result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar. Please try again.');
    }
  };
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [messageBlockReason, setMessageBlockReason] = useState<string | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [ratingsSummary, setRatingsSummary] = useState<UserRatingsSummary | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Fetch ratings for the profile
  useEffect(() => {
    if (!profile.id || !profileType) return;

    const fetchRatings = async () => {
      try {
        setLoadingRatings(true);
        const response = await fetch(`/api/ratings/user?userId=${profile.id}&userType=${profileType}`);
        const data = await response.json();

        if (data.success) {
          setRatingsSummary(data.summary);
        }
      } catch (error) {
        console.error('Error fetching profile ratings:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    fetchRatings();
  }, [profile.id, profileType]);

  // Check message permissions for commissioners viewing freelancer profiles
  useEffect(() => {
    const checkMessagePermission = async () => {
      if (viewerUserType !== 'commissioner' || profileType !== 'freelancer' || isOwnProfile) {
        return; // Only check for commissioners viewing freelancer profiles
      }

      const commissionerId = session?.user?.id;
      if (!commissionerId) return;

      setCheckingPermission(true);
      try {
        const response = await fetch('/api/messages/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commissionerId: parseInt(commissionerId),
            freelancerId: parseInt(profile.id)
          })
        });

        if (response.ok) {
          const permission = await response.json();
          setCanSendMessage(permission.canSend);
          setMessageBlockReason(permission.reason || null);
        }
      } catch (error) {
        console.error('Error checking message permission:', error);
        // Default to allowing messages on error
        setCanSendMessage(true);
      } finally {
        setCheckingPermission(false);
      }
    };

    checkMessagePermission();
  }, [viewerUserType, profileType, isOwnProfile, session?.user?.id, profile.id]);

  const getMessageHref = () => {
    // For freelancers viewing commissioner profiles
    if (viewerUserType === 'freelancer' && profileType === 'commissioner') {
      return `/freelancer-dashboard/messages?page=new&receiverId=${profile.id}`;
    }
    // For commissioners viewing freelancer profiles
    else if (viewerUserType === 'commissioner' && profileType === 'freelancer') {
      return `/commissioner-dashboard/messages?page=new&receiverId=${profile.id}`;
    }
    // Default behavior for other cases
    else {
      return `/commissioner-dashboard/messages?userId=${profile.id}`;
    }
  };

  return (
    <div className="flex items-start gap-6 mb-8">
      {/* Profile Image - Large circular avatar */}
      <div className="relative">
        <Image
          src={profile.avatar}
          alt={profile.name}
          width={160}
          height={160}
          className="rounded-full object-cover"
        />

        {/* Edit overlay for avatar */}
        {isEditMode && isOwnProfile && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full"
          >
            <Edit3 className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Profile Info */}
      <div className="flex-1 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">{profile.name}</h1>
          {isOwnProfile && onToggleEditMode && (
            <button
              onClick={onToggleEditMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isEditMode
                  ? 'bg-[#eb1966] text-white hover:bg-[#d91659]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {isEditMode ? 'Done' : 'Edit Profile'}
            </button>
          )}
        </div>

        {/* Location pill and Direct Message button */}
        <div className="mb-3 flex items-center gap-3">
          {isEditMode && isOwnProfile ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-full text-sm focus-within:border-[#eb1966] transition-colors">
              <MapPin className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={editedProfile.location}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                onBlur={() => onUpdateProfile?.('location', editedProfile.location)}
                className="bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-[120px]"
                placeholder="Enter location"
              />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{profile.location || 'No location set'}</span>
            </div>
          )}

          {/* Direct Message Button - Only show if not own profile */}
          {!isOwnProfile && (
            <div className="relative">
              {canSendMessage ? (
                <Link href={getMessageHref()}>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors text-gray-700 hover:bg-opacity-40"
                    style={{
                      backgroundColor: 'rgba(252, 213, 227, 0.3)'
                    }}
                    disabled={checkingPermission}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{checkingPermission ? 'Checking...' : 'Message'}</span>
                  </button>
                </Link>
              ) : (
                <div className="group relative">
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors text-gray-400 cursor-not-allowed"
                    style={{
                      backgroundColor: 'rgba(229, 231, 235, 0.5)'
                    }}
                    disabled
                    title={messageBlockReason || "Message limit reached"}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Message</span>
                  </button>

                  {/* Tooltip */}
                  {messageBlockReason && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      {messageBlockReason}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rate pill and Resume pill */}
        <div className="mb-4 flex items-center gap-3">
          <RateRangeEditor
            rateRange={profile.rateRange}
            isEditMode={isEditMode && isOwnProfile}
            onUpdateRateRange={onUpdateRateRange || (() => {})}
            legacyRate={profile.rate}
            legacyMinRate={(profile as any).hourlyRate?.min}
            legacyMaxRate={(profile as any).hourlyRate?.max}
          />

          {/* Resume pill - only show for freelancer profiles */}
          {profileType === 'freelancer' && (
            <ResumePill
              currentResume={currentResume}
              onResumeUpdate={onResumeUpdate || (() => {})}
              isOwnProfile={isOwnProfile}
            />
          )}
        </div>

        {/* Rating - Read-only stars */}
        {loadingRatings ? (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-gray-300 animate-pulse" />
              ))}
            </div>
            <span className="text-sm text-gray-500">Loading ratings...</span>
          </div>
        ) : ratingsSummary && ratingsSummary.totalRatings > 0 ? (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(ratingsSummary.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span
              className="text-sm text-gray-600 font-medium"
              title={`Average rating: ${ratingsSummary.averageRating.toFixed(2)}/5 from ${ratingsSummary.totalRatings} rating${ratingsSummary.totalRatings !== 1 ? 's' : ''}`}
            >
              {ratingsSummary.averageRating.toFixed(1)}/5
              <span className="text-xs text-gray-500 ml-1">({ratingsSummary.totalRatings})</span>
            </span>
          </div>
        ) : profile.rating ? (
          // Fallback to hardcoded rating if no API ratings found
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(profile.rating!)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 font-medium">{profile.rating}/5</span>
          </div>
        ) : (
          // No ratings available
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-gray-300" />
              ))}
            </div>
            <span className="text-sm text-gray-500">No ratings yet</span>
          </div>
        )}

        {/* Portfolio Icons */}
        {profileType === 'freelancer' && (
          <div className="mb-4">
            <PortfolioIcons
              outlinks={profile.outlinks || []}
              isEditMode={isEditMode && isOwnProfile}
              onUpdateOutlinks={onUpdateOutlinks || (() => {})}
            />
          </div>
        )}


      </div>
    </div>
  );
}
