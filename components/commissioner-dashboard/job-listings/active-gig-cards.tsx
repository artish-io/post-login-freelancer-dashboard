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
        // Get user ID from session
        if (!session?.user?.id) {
          console.error('No user ID found in session');
          return;
        }
        const userId = session.user.id;

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

        // Calculate application counts and dynamic weekly changes
        const gigsWithData = organizationGigs.map((gig: any) => {
          const gigApplications = applications.filter((app: any) => app.gigId === gig.id);
          const applicationCount = gigApplications.length;

          // Calculate weekly change based on actual application submission dates
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

          // Count applications from this week vs last week
          const thisWeekApps = gigApplications.filter((app: any) => {
            const submittedDate = new Date(app.submittedAt);
            return submittedDate >= oneWeekAgo;
          }).length;

          const lastWeekApps = gigApplications.filter((app: any) => {
            const submittedDate = new Date(app.submittedAt);
            return submittedDate >= twoWeeksAgo && submittedDate < oneWeekAgo;
          }).length;

          // Calculate percentage change (handle division by zero)
          let weeklyChange = 0;
          if (lastWeekApps > 0) {
            weeklyChange = Math.round(((thisWeekApps - lastWeekApps) / lastWeekApps) * 100);
          } else if (thisWeekApps > 0) {
            // If no applications last week but some this week, show 100% increase
            weeklyChange = 100;
          }

          // Ensure we show positive changes (for demo purposes, real app might show negative changes)
          weeklyChange = Math.max(weeklyChange, 0);



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
