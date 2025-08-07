'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ProjectStatsCard from './project-statscard';
import { requireFreelancerSession, getFreelancerId } from '../../src/lib/freelancer-access-control';

export default function ProjectStatsRow() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    tasksToday: 0,
    ongoingProjects: 0,
    upcomingDeadlines: 0,
    overdueDeadlines: 0,
  });

  const fetchStats = async () => {
    // Ensure user is a freelancer before fetching stats
    const freelancerSession = requireFreelancerSession(session?.user as any);
    if (!freelancerSession) {
      setStats({
        tasksToday: 0,
        ongoingProjects: 0,
        upcomingDeadlines: 0,
        overdueDeadlines: 0,
      });
      return;
    }

    const freelancerId = getFreelancerId(freelancerSession);
    if (!freelancerId) {
      setStats({
        tasksToday: 0,
        ongoingProjects: 0,
        upcomingDeadlines: 0,
        overdueDeadlines: 0,
      });
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/stats?id=${freelancerId}`, {
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