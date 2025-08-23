'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { PageSkeleton } from '../../../../../../components/ui/loading-skeleton';
import ProfileHeader from '../../../../../../components/user-profiles/profile-header';
import ProfileInfo from '../../../../../../components/user-profiles/profile-info';
import WorkSamples from '../../../../../../components/user-profiles/work-samples';

interface WorkSample {
  id: string;
  userId: number;
  title: string;
  image: string;
  skill: string;
  tool: string;
  year: number;
  url: string;
}

interface Tool {
  name: string;
  icon: string | null;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface Profile {
  id: number;
  name: string;
  title: string;
  avatar: string;
  type: 'freelancer' | 'commissioner';
  location?: string;
  rate?: string;
  availability?: string;
  hourlyRate?: {
    min: number;
    max: number;
  };
  rating?: number;
  about?: string;
  skills?: string[];
  tools?: Tool[];
  socialLinks?: SocialLink[];
  workSamples?: WorkSample[];
  responsibilities?: string[];
}

export default function FreelancerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const userId = params?.id as string;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;

  // Session validation - ensure only commissioners can access this route
  useEffect(() => {
    if (status === 'loading') return; // Still loading session

    if (!session?.user?.id) {
      // No session - redirect to commissioner login
      router.push('/login-commissioner');
      return;
    }

    // Ensure only commissioners can access this route
    const userType = (session.user as any)?.userType;
    if (userType !== 'commissioner') {
      router.push('/login-commissioner');
      return;
    }

    setAccessDenied(false);
  }, [session, status, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        
        // Ensure this is a freelancer profile
        if (data.type !== 'freelancer') {
          throw new Error('Profile not found or invalid type');
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching freelancer profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Handle session loading
  if (status === 'loading') {
    return <PageSkeleton />;
  }

  // Handle access denied (will redirect, but show loading in the meantime)
  if (accessDenied || (!session?.user?.id)) {
    return <PageSkeleton />;
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Freelancer profile not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            The freelancer profile you're looking for doesn't exist or couldn't be loaded.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Transform profile data for components
  const profileHeaderData = {
    id: profile.id.toString(),
    userId: profile.id, // Add userId for rating fetching
    name: profile.name,
    avatar: profile.avatar,
    location: profile.location || '',
    rate: profile.rate,
    rating: profile.rating,
    socialLinks: profile.socialLinks || []
  };

  const workSamplesData = profile.workSamples?.map(sample => ({
    id: sample.id,
    title: sample.title,
    coverImage: sample.image,
    link: sample.url,
    skills: [sample.skill],
    tools: [sample.tool],
    year: sample.year
  })) || [];

  return (
    <div className="flex-1 p-6 bg-white min-h-screen font-['Plus_Jakarta_Sans']">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[#eb1966] hover:text-[#d1175a] font-medium mb-2 flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Freelancer Profile</h1>
        <p className="text-gray-600">Viewing {profile.name}'s profile</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8 h-full">
        {/* Left Column: User Info */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <ProfileHeader
            profile={profileHeaderData}
            isOwnProfile={false} // Always false for commissioners viewing freelancer profiles
            viewerUserType="commissioner"
            profileType="freelancer"
          />

          <ProfileInfo
            bio={profile.about}
            skills={profile.skills || []}
            tools={profile.tools?.map(t => t.name) || []}
            responsibilities={profile.responsibilities}
            isOwnProfile={false} // Always false for commissioners viewing freelancer profiles - no edit controls
            userType="freelancer"
            availableSkills={[]}
            availableTools={[]}
            onAddSkillTool={undefined} // No add functionality for commissioners
            onRemoveSkillTool={undefined} // No remove functionality for commissioners
          />
        </div>

        {/* Right Column: Work Samples */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <WorkSamples
            workSamples={workSamplesData}
            isOwnProfile={false} // Always false for commissioners viewing freelancer profiles - no add button
            onAddWorkSample={() => {}} // No add functionality for commissioners
          />
        </div>
      </div>
    </div>
  );
}
