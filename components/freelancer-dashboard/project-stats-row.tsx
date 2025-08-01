'use client';

// 🔐 Session-aware data fetching note (Dev Only)
// ----------------------------------------------------------------------
// This component uses `useSession()` to access `session.user.id` on the client.
// We pass that ID as a query param to API routes (e.g. `/api/dashboard/stats?id=31`).
// This is necessary because `getServerSession()` does not reliably work inside
// API route handlers when called from client-side fetches (cookie context is missing).
// In production, we will refactor this to server components using `getServerSession()`
// directly to eliminate client-side ID forwarding.
// ----------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ProjectStatsCard from './project-statscard';

export default function ProjectStatsRow() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    tasksToday: 0,
    ongoingProjects: 0,
    upcomingDeadlines: 0,
    overdueDeadlines: 0,
  });

  const fetchStats = async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/dashboard/stats?id=${session.user.id}`, {
        cache: 'no-store' // Ensure fresh data
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [session?.user?.id]);

  // Listen for project status changes (e.g., when projects are paused)
  useEffect(() => {
    const handleProjectStatusChange = () => {
      fetchStats();
    };

    // Listen for custom events that might indicate project status changes
    window.addEventListener('projectStatusChanged', handleProjectStatusChange);

    return () => {
      window.removeEventListener('projectStatusChanged', handleProjectStatusChange);
    };
  }, [session?.user?.id]);

  const cards = [
    { label: 'Tasks for today', value: stats.tasksToday, bgColor: '#FCD5E3' },
    { label: 'Ongoing projects', value: stats.ongoingProjects, bgColor: '#F4DBE4' },
    {
      label: 'Upcoming Deadlines',
      value: stats.upcomingDeadlines,
      bgColor: '#FFEEF4',
      overdueCount: stats.overdueDeadlines
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-4 w-full justify-items-center">
      {cards.map((card, index) => (
        <ProjectStatsCard
          key={index}
          label={card.label}
          value={card.value}
          bgColor={card.bgColor}
          overdueCount={card.overdueCount}
        />
      ))}
    </div>
  );
}