'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import CommissionerProfileView from '../../../../../components/user-profiles/recruiter/commissioner-profile-view';
import { PageSkeleton } from '../../../../../components/ui/loading-skeleton';

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
  icon: string;
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
  about: string;
  skills?: string[];
  tools?: Tool[];
  socialLinks?: SocialLink[];
  workSamples?: WorkSample[];
  responsibilities?: string[];
}

export default function CommissionerProfilePage() {
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

  // Session validation - prevent auto-logout for cross-user-type profile viewing
  useEffect(() => {
    if (status === 'loading') return; // Still loading session

    if (!session?.user?.id) {
      // No session - redirect to appropriate login page
      router.push('/login-commissioner');
      return;
    }

    // Allow commissioners to view any profile without auto-logout
    // Only restrict access if session is invalid, not based on user type
    if (session?.user?.id) {
      setAccessDenied(false);
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
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
            {error || 'Profile not found'}
          </h2>
        </div>
      </div>
    );
  }

  // If viewing a commissioner profile, use the commissioner profile view
  if (profile.type === 'commissioner') {
    return (
      <CommissionerProfileView
        userId={userId}
        isOwnProfile={isOwnProfile}
        viewerUserType="commissioner"
        profileType="commissioner"
      />
    );
  }

  // If viewing a freelancer profile, redirect to dedicated freelancer profile route
  if (profile.type === 'freelancer') {
    router.push(`/commissioner-dashboard/profile/freelancers/${userId}`);
    return <PageSkeleton />;
  }

  // This route should only handle commissioner profiles
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid profile type
        </h2>
        <p className="text-gray-600">This route only handles commissioner profiles.</p>
      </div>
    </div>
  );
}