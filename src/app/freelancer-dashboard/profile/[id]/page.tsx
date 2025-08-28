'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageSkeleton } from '../../../../../components/ui/loading-skeleton';
import ProfileHeader from '../../../../../components/user-profiles/profile-header';
import ProfileInfo from '../../../../../components/user-profiles/profile-info';
import WorkSamples from '../../../../../components/user-profiles/work-samples';
import AddWorkSampleModal from '../../../../../components/user-profiles/add-work-sample-modal';
import CommissionerProfileView from '../../../../../components/user-profiles/recruiter/commissioner-profile-view';
import ResumeUpload from '../../../../../components/freelancer-dashboard/profile/resume-upload';

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

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddWorkSampleModal, setShowAddWorkSampleModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<any>(null);

  const userId = params?.id as string;
  const currentUserId = session?.user?.id;
  const isOwnProfile = userId === currentUserId;
  const currentUserType = (session?.user as any)?.userType;

  // Session validation - prevent auto-logout for commissioners viewing freelancer pages
  useEffect(() => {
    if (status === 'loading') return; // Still loading session

    if (!session?.user?.id) {
      // No session - redirect to appropriate login page
      router.push('/login');
      return;
    }

    // Allow commissioners to view freelancer profiles without auto-logout
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

    const fetchDropdownData = async () => {
      try {
        // Fetch skills from gig-categories API
        const categoriesResponse = await fetch('/api/gigs/gig-categories');
        const categoriesData = await categoriesResponse.json();
        const allSkills = categoriesData.flatMap((category: any) =>
          category.subcategories.map((sub: any) => sub.name)
        );
        setAvailableSkills(allSkills);

        // Fetch tools from gig-tools API
        const toolsResponse = await fetch('/api/gigs/gig-tools');
        const toolsData = await toolsResponse.json();
        const allTools = toolsData.flatMap((category: any) =>
          category.tools.map((tool: any) => tool.name)
        );
        setAvailableTools(allTools);
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };

    if (userId) {
      fetchProfile();
      fetchDropdownData();
      if (isOwnProfile) {
        fetchResumeInfo();
      }
    }
  }, [userId, isOwnProfile]);

  const fetchResumeInfo = async () => {
    try {
      const response = await fetch('/api/freelancer/resume');
      const data = await response.json();
      setResumeInfo(data.resume);
    } catch (error) {
      console.error('Error fetching resume info:', error);
    }
  };

  const handleAddWorkSample = async (data: any) => {
    try {
      const response = await fetch('/api/work-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          title: data.title,
          coverImage: data.coverImage,
          link: data.link,
          skills: data.skills,
          tools: data.tools,
          year: data.year,
        }),
      });

      if (response.ok) {
        // Refresh the profile data to show the new work sample
        const profileResponse = await fetch(`/api/user/profile/${userId}`);
        if (profileResponse.ok) {
          const updatedProfile = await profileResponse.json();
          setProfile(updatedProfile);
        }
        setShowAddWorkSampleModal(false);
      } else {
        console.error('Failed to add work sample');
      }
    } catch (error) {
      console.error('Error adding work sample:', error);
    }
  };

  const handleAddSkillTool = async (type: 'skill' | 'tool', value: string) => {
    try {
      const response = await fetch('/api/freelancer/skills-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          type: type,
          value: value,
        }),
      });

      if (response.ok) {
        // Refresh the profile data
        const profileResponse = await fetch(`/api/user/profile/${userId}`);
        if (profileResponse.ok) {
          const updatedProfile = await profileResponse.json();
          setProfile(updatedProfile);
        }
      } else {
        console.error('Failed to add skill/tool');
      }
    } catch (error) {
      console.error('Error adding skill/tool:', error);
    }
  };

  const handleRemoveSkillTool = async (type: 'skill' | 'tool', value: string) => {
    try {
      const response = await fetch('/api/freelancer/skills-tools', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          type: type,
          value: value,
        }),
      });

      if (response.ok) {
        // Refresh the profile data
        const profileResponse = await fetch(`/api/user/profile/${userId}`);
        if (profileResponse.ok) {
          const updatedProfile = await profileResponse.json();
          setProfile(updatedProfile);
        }
      } else {
        console.error('Failed to remove skill/tool');
      }
    } catch (error) {
      console.error('Error removing skill/tool:', error);
    }
  };

  // Transform profile data for components
  const profileHeaderData = profile ? {
    id: profile.id.toString(),
    userId: profile.id, // Add userId for rating fetching
    name: profile.name,
    avatar: profile.avatar,
    location: profile.location || '',
    rate: profile.rate,
    rating: profile.rating,
    socialLinks: profile.socialLinks || []
  } : null;

  const workSamplesData = profile?.workSamples?.map(sample => ({
    id: sample.id,
    title: sample.title,
    coverImage: sample.image,
    link: sample.url,
    skills: [sample.skill],
    tools: [sample.tool],
    year: sample.year
  })) || [];

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
        viewerUserType="freelancer"
        profileType="commissioner"
      />
    );
  }

  return (
    <div className="flex-1 p-6 bg-white min-h-screen font-['Plus_Jakarta_Sans']">
      {/* Two Column Layout with better proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8 h-full">
        {/* Left Column: User Info */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          {profileHeaderData && (
            <ProfileHeader
              profile={profileHeaderData}
              isOwnProfile={isOwnProfile}
              viewerUserType={currentUserType}
              profileType={profile.type}
            />
          )}
          
          <ProfileInfo
            bio={profile.about}
            skills={profile.skills || []}
            tools={profile.tools?.map(t => t.name) || []}
            responsibilities={profile.responsibilities}
            isOwnProfile={isOwnProfile}
            userType={profile.type}
            availableSkills={availableSkills}
            availableTools={availableTools}
            onAddSkillTool={handleAddSkillTool}
            onRemoveSkillTool={handleRemoveSkillTool}
          />
        </div>

        {/* Right Column: Work Samples and Resume */}
        <div className="space-y-6">
          {/* Resume Section */}
          <ResumeUpload
            currentResume={resumeInfo}
            onResumeUpdate={setResumeInfo}
            isOwnProfile={isOwnProfile}
          />

          {/* Work Samples Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <WorkSamples
              workSamples={workSamplesData}
              isOwnProfile={isOwnProfile}
              onAddWorkSample={() => setShowAddWorkSampleModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Add Work Sample Modal */}
      <AddWorkSampleModal
        isOpen={showAddWorkSampleModal}
        onClose={() => setShowAddWorkSampleModal(false)}
        onSubmit={handleAddWorkSample}
        availableSkills={availableSkills}
        availableTools={availableTools}
      />
    </div>
  );
}
