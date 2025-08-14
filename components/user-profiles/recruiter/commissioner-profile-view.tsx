'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageSkeleton } from '../../ui/loading-skeleton';
import CommissionerProfileHeader from './commissioner-profile-header';
import CommissionerProfileInfo from './commissioner-profile-info';
import OrganizationInfo from './organization-info';
import RecentGigListings from './recent-gig-listings';

interface Organization {
  id: number;
  name: string;
  logo: string;
  address: string;
  bio?: string;
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

interface CommissionerProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
  viewerUserType: 'commissioner' | 'freelancer';
  profileType?: 'commissioner';
}

export default function CommissionerProfileView({
  userId,
  isOwnProfile,
  viewerUserType,
  profileType = 'commissioner'
}: CommissionerProfileViewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<CommissionerProfile | null>(null);
  const [enrichedOrganization, setEnrichedOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch enriched organization data if organization exists
        if (data.organization?.id) {
          try {
            const orgResponse = await fetch(`/api/organizations/${data.organization.id}`);
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setEnrichedOrganization(orgData);
            }
          } catch (orgError) {
            console.error('Error fetching organization details:', orgError);
            // Use original organization data as fallback
            setEnrichedOrganization(data.organization);
          }
        }
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

  const handlePostNewGig = () => {
    if (isOwnProfile && viewerUserType === 'commissioner') {
      router.push('/commissioner-dashboard/projects-and-invoices/post-a-gig');
    }
  };

  // Transform profile data for components
  const profileHeaderData = profile ? {
    id: profile.id.toString(),
    userId: profile.id, // Add userId for rating fetching
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
          {profileHeaderData && (
            <CommissionerProfileHeader
              profile={profileHeaderData}
              viewerUserType={viewerUserType}
              isOwnProfile={isOwnProfile}
            />
          )}

          <CommissionerProfileInfo
            bio={profile.about}
            responsibilities={profile.responsibilities}
            isOwnProfile={isOwnProfile}
            viewerUserType={viewerUserType}
          />
        </div>

        {/* Right Column: Organization & Gigs */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {(enrichedOrganization || profile.organization) && (
            <OrganizationInfo 
              organization={enrichedOrganization || profile.organization!} 
              showBio={true}
            />
          )}

          <RecentGigListings
            gigListings={profile.gigListings}
            isOwnProfile={isOwnProfile}
            currentUserType={viewerUserType}
            onPostNewGig={handlePostNewGig}
          />
        </div>
      </div>
    </div>
  );
}
