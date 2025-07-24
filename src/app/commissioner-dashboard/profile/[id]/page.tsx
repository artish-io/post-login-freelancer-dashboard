'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageSkeleton } from '../../../../../components/ui/loading-skeleton';
import CommissionerProfileHeader from '../../../../../components/user-profiles/recruiter/commissioner-profile-header';
import CommissionerProfileInfo from '../../../../../components/user-profiles/recruiter/commissioner-profile-info';
import OrganizationInfo from '../../../../../components/user-profiles/recruiter/organization-info';
import RecentGigListings from '../../../../../components/user-profiles/recruiter/recent-gig-listings';

interface Organization {
  id: number;
  name: string;
  logo: string;
  address: string;
}

interface GigListing {
  id: number;
  title: string;
  category: string;
  budget: string;
  deadline: string;
  applicants: number;
  status: 'active' | 'closed' | 'in_progress';
}

interface CommissionerProfile {
  id: number;
  name: string;
  title: string;
  avatar: string;
  type: 'commissioner';
  location?: string;
  rating?: number;
  about: string;
  organization: Organization | null;
  projectsCommissioned: number;
  totalBudget: number;
  quarterlyChange?: number;
  isActivelyCommissioning?: boolean;
  gigListings: GigListing[];
  responsibilities: string[];
  socialLinks?: Array<{
    platform: string;
    url: string;
    icon: string;
  }>;
}

export default function CommissionerProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<CommissionerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params?.id as string;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;
  const currentUserType = (session?.user as any)?.userType;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();

        // Ensure this is a commissioner profile
        if (data.type !== 'commissioner') {
          throw new Error('Profile not found');
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Transform profile data for components
  const profileHeaderData = profile ? {
    id: profile.id.toString(),
    name: profile.name,
    avatar: profile.avatar,
    location: profile.location || '',
    lifetimeValue: profile.totalBudget,
    rating: profile.rating,
    quarterlyChange: profile.quarterlyChange,
    isActivelyCommissioning: profile.isActivelyCommissioning,
    socialLinks: profile.socialLinks?.filter(link => link.platform === 'linkedin') || []
  } : null;

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Profile not found'}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-white min-h-screen font-['Plus_Jakarta_Sans']">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8 h-full">
        {/* Left Column: User Info */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          {profileHeaderData && <CommissionerProfileHeader profile={profileHeaderData} />}

          <CommissionerProfileInfo
            bio={profile.about}
            responsibilities={profile.responsibilities}
            isOwnProfile={isOwnProfile}
          />
        </div>

        {/* Right Column: Organization & Gigs */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {profile.organization && (
            <OrganizationInfo organization={profile.organization} />
          )}

          <RecentGigListings
            gigListings={profile.gigListings}
            isOwnProfile={isOwnProfile}
            currentUserType={currentUserType}
          />
        </div>
      </div>
    </div>
  );
}