'use client';

import Image from 'next/image';
import { MapPin, Star, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rate?: string;
  rating?: number;
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
}

const getSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'linkedin':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case 'behance':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.76-.62.16-1.25.24-1.89.24H0V4.51h6.938v-.007zM3.495 8.22h2.88c.8 0 1.43-.17 1.87-.53.44-.36.66-.85.66-1.48 0-.3-.04-.56-.13-.79-.09-.23-.21-.42-.38-.57-.17-.15-.37-.26-.61-.35-.24-.09-.5-.13-.78-.13H3.495v3.85zm0 7.12h3.36c.33 0 .65-.04.95-.12.3-.08.56-.2.78-.38.22-.18.39-.42.52-.71.13-.29.19-.65.19-1.06 0-.39-.06-.73-.18-1.01-.12-.28-.29-.51-.51-.69-.22-.18-.48-.31-.77-.39-.29-.08-.6-.12-.92-.12H3.495v4.48zm14.09-8.03c.62 0 1.18.1 1.69.31.51.21.94.51 1.3.91.36.4.64.88.82 1.44.18.56.27 1.18.27 1.86v.14c0 .1-.01.18-.02.26H15.24c.08.85.36 1.47.83 1.87.47.4 1.07.6 1.8.6.48 0 .91-.1 1.29-.32.38-.22.68-.5.9-.83h2.12c-.33.81-.83 1.48-1.49 2.01-.66.53-1.54.79-2.64.79-.69 0-1.31-.11-1.87-.32-.56-.21-1.04-.51-1.44-.9-.4-.39-.71-.86-.92-1.4-.21-.54-.32-1.14-.32-1.79 0-.63.11-1.21.32-1.75.21-.54.51-1.01.9-1.4.39-.39.86-.7 1.41-.91.55-.21 1.15-.32 1.8-.32zm2.37 2.99c-.06-.78-.32-1.39-.77-1.83-.45-.44-1.02-.66-1.71-.66-.44 0-.83.09-1.17.26-.34.17-.63.39-.85.66-.22.27-.39.58-.51.92-.12.34-.19.68-.21 1.02h5.22v-.37zM14.1 0h7.8v2.59h-7.8V0z"/>
        </svg>
      );
    case 'dribbble':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm7.568 5.302c1.4 1.5 2.252 3.5 2.273 5.698-.653-.126-1.542-.24-2.653-.24-.2 0-.402.008-.606.02-.1-.24-.2-.48-.31-.72 1.048-.44 1.9-.94 2.296-1.26v.502zm-1.545-1.3c-.35.28-1.114.713-2.06 1.107-.65-1.2-1.38-2.267-2.14-3.09C15.31 2.45 16.97 3.64 18.023 4.002zM12 2.1c.74 0 1.46.1 2.14.28.68.77 1.35 1.78 1.97 2.93-.9.35-1.94.65-3.11.9-.65-1.2-1.38-2.267-2.14-3.09C11.31 2.45 11.65 2.1 12 2.1zm-2.858.82c.76.823 1.49 1.89 2.14 3.09-1.17.25-2.21.55-3.11.9-.62-1.15-1.29-2.16-1.97-2.93C7.03 2.64 8.69 1.45 10.142 2.92zm-5.568 2.38c1.4 1.5 2.252 3.5 2.273 5.698-.653-.126-1.542-.24-2.653-.24-.2 0-.402.008-.606.02-.1-.24-.2-.48-.31-.72 1.048-.44 1.9-.94 2.296-1.26v.502zm7.568 16.7c-5.523 0-10-4.477-10-10 0-.34.02-.67.05-1 .65.13 1.54.24 2.65.24.2 0 .4-.008.6-.02.1.24.2.48.31.72-1.048.44-1.9.94-2.296 1.26v-.502c0 5.523 4.477 10 10 10z"/>
        </svg>
      );
    case 'website':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="m12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    default:
      return null;
  }
};

export default function ProfileHeader({
  profile,
  isOwnProfile = false,
  viewerUserType,
  profileType
}: ProfileHeaderProps) {
  const { data: session } = useSession();
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [messageBlockReason, setMessageBlockReason] = useState<string | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);

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
      </div>

      {/* Profile Info */}
      <div className="flex-1 mt-2">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{profile.name}</h1>

        {/* Location pill and Direct Message button */}
        <div className="mb-3 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{profile.location}</span>
          </div>

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

        {/* Rate pill - wider and centered below location */}
        {profile.rate && (
          <div className="mb-4">
            <div className="inline-flex items-center justify-center px-4 py-2 bg-white border border-black rounded-full text-sm text-gray-700 min-w-[120px]">
              {profile.rate}
            </div>
          </div>
        )}

        {/* Rating - Read-only stars */}
        {profile.rating && (
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
        )}

        {/* Social Links */}
        {profile.socialLinks && profile.socialLinks.length > 0 && (
          <div className="flex items-center gap-3">
            {profile.socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                {getSocialIcon(link.platform)}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
