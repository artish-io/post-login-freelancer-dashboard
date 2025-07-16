'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface GigWithApplications {
  id: number;
  title: string;
  organizationId: number;
  status: string;
  applicationCount: number;
  weeklyChange: number;
}

export default function ActiveGigCards() {
  const { data: session } = useSession();
  const [activeGigs, setActiveGigs] = useState<GigWithApplications[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveGigs = async () => {
      try {
        // Default to user ID 32 (Neilsan Mando) for testing if no session
        const userId = session?.user?.id || '32';

        // Fetch user data to get organization
        const userResponse = await fetch(`/api/users/${userId}`);
        const userData = await userResponse.json();

        if (!userData.organizationId) {
          return;
        }

        // Fetch gigs for this organization
        const gigsResponse = await fetch('/api/gigs');
        const allGigs = await gigsResponse.json();

        // Filter gigs by organization and status
        const organizationGigs = allGigs.filter((gig: any) =>
          gig.organizationId === userData.organizationId && gig.status === 'Available'
        );

        // Fetch applications to count them
        const applicationsResponse = await fetch('/api/gigs/gig-applications');
        const applications = await applicationsResponse.json();

        // Calculate application counts and mock weekly changes
        const gigsWithData = organizationGigs.map((gig: any) => {
          const applicationCount = applications.filter((app: any) => app.gigId === gig.id).length;

          // Mock weekly change calculation (in real app, this would be based on historical data)
          const weeklyChange = Math.floor(Math.random() * 50) + 1; // Random 1-50% increase

          return {
            id: gig.id,
            title: gig.title,
            organizationId: gig.organizationId,
            status: gig.status,
            applicationCount,
            weeklyChange
          };
        });

        setActiveGigs(gigsWithData);
      } catch (error) {
        console.error('Error fetching active gigs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveGigs();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[320px] h-40 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (activeGigs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <p className="text-gray-500">No active job listings found.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
      {activeGigs.map((gig) => (
          <div
            key={gig.id}
            className="min-w-[320px] bg-[#FCD5E3] rounded-xl p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-lg transition-shadow"
          >
            {/* Top - Gig Title */}
            <div className="mb-4">
              <h3 className="font-semibold text-black text-sm line-clamp-2 leading-tight">
                {gig.title}
              </h3>
            </div>

            {/* Middle - Application Count and Label */}
            <div className="flex-1 flex items-center gap-2">
              <div className="text-[40px] font-bold text-black leading-none">
                {gig.applicationCount}
              </div>
              <div className="text-xs font-thin text-gray-700">
                applications
              </div>
            </div>

            {/* Bottom - Weekly Change with proper spacing from border */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-1 text-xs font-normal text-black">
                <span className="text-black">
                  {gig.weeklyChange}% in last week
                </span>
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
