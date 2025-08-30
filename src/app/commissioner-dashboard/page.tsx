'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CommissionerHeader from '../../../components/commissioner-dashboard/commissioner-header';
import CommissionerStatsRow from '../../../components/commissioner-dashboard/commissioner-stats-row';
import ProjectSummaryTable from '../../../components/shared/project-summary-table';
import TasksPanel from '../../../components/shared/tasks-panel';
import CommissionerNetworkPanel from '../../../components/commissioner-dashboard/commissioner-network-panel';
import { LoadingPage } from '../../../components/shared/loading-ellipsis';
import { NavigationOptimizer } from '../../../lib/utils/navigation-optimizer';

export default function CommissionerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [commissionerId, setCommissionerId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    activeProjects: number;
    totalProjects: number;
    tasksAwaitingReview: number;
    monthlyChange: {
      value: string;
      direction: 'up' | 'down';
      percentage: number;
    };
  }>({
    activeProjects: 0,
    totalProjects: 0,
    tasksAwaitingReview: 0,
    monthlyChange: {
      value: '0%',
      direction: 'up',
      percentage: 0
    }
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login-commissioner');
      return;
    }

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        // Get commissioner stats from API
        if (!session.user?.id) {
          throw new Error('No user ID found in session');
        }
        const currentCommissionerId = parseInt(session.user.id);
        setCommissionerId(currentCommissionerId);
        const response = await fetch(`/api/commissioner-stats?commissionerId=${currentCommissionerId}`, {
          cache: 'no-store' // Ensure fresh data
        });

        if (!response.ok) {
          throw new Error('Failed to fetch commissioner stats');
        }

        const data = await response.json();

        setDashboardData({
          activeProjects: data.activeProjects,
          totalProjects: data.totalProjects,
          tasksAwaitingReview: data.tasksAwaitingReview,
          monthlyChange: data.monthlyChange
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to default values on error
        setDashboardData({
          activeProjects: 0,
          totalProjects: 0,
          tasksAwaitingReview: 0,
          monthlyChange: {
            value: '0%',
            direction: 'up',
            percentage: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Prefetch common routes for faster navigation
    NavigationOptimizer.prefetchDashboardRoutes(router, 'commissioner');

    // Listen for project status changes (e.g., when projects are paused)
    const handleProjectStatusChange = () => {
      fetchDashboardData();
    };

    // Listen for custom events that might indicate project status changes
    window.addEventListener('projectStatusChanged', handleProjectStatusChange);

    return () => {
      window.removeEventListener('projectStatusChanged', handleProjectStatusChange);
    };
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return <LoadingPage />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
      {/* Commissioner Header - sits right under top navbar */}
      <CommissionerHeader />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Stats, Project Summary, Tasks Review */}
        <div className="lg:col-span-2 space-y-6">
          <CommissionerStatsRow
            activeProjects={dashboardData.activeProjects}
            totalProjects={dashboardData.totalProjects}
            tasksAwaitingReview={dashboardData.tasksAwaitingReview}
            monthlyChange={dashboardData.monthlyChange}
          />

          <ProjectSummaryTable
            viewType="commissioner"
            showStatus={false}
            showViewAllButton={true}
          />

          <TasksPanel
            viewType="commissioner"
            title="Tasks To Review"
            showNotesTab={false}
          />
        </div>

        {/* Right Column - Network */}
        <div className="space-y-6">
          {commissionerId && <CommissionerNetworkPanel commissionerId={commissionerId} />}
        </div>
      </div>

    </div>
  );
}
