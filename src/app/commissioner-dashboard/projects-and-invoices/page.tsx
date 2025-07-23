'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CommissionerHeader from '../../../../components/commissioner-dashboard/commissioner-header';
import ProjectsInvoicesStatsRow from '../../../../components/commissioner-dashboard/projects-and-invoices/projects-invoices-stats-row';
import ProjectSummaryTable from '../../../../components/shared/project-summary-table';
import TasksPanel from '../../../../components/shared/tasks-panel';
import CommissionerNetworkPanel from '../../../../components/commissioner-dashboard/commissioner-network-panel';
import InvoiceHistoryPanel from '../../../../components/commissioner-dashboard/projects-and-invoices/invoice-history-panel';
import PostGigButton from '../../../../components/commissioner-dashboard/projects-and-invoices/post-gig-button';

export default function ProjectsAndInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [commissionerId, setCommissionerId] = useState<number | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
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

    // Check for success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'gig-posted') {
      setShowSuccessMessage(true);
      // Remove the success parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
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
        const response = await fetch(`/api/commissioner-stats?commissionerId=${currentCommissionerId}`);

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
  }, [session, status, router]);

  const handlePostGig = () => {
    // Navigate to post gig page
    router.push('/commissioner-dashboard/projects-and-invoices/post-a-gig');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
      {/* Commissioner Header - sits right under top navbar */}
      <CommissionerHeader />

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#FCD5E3', opacity: 0.5 }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#eb1966] rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-[#eb1966] font-medium">
              Gig posted successfully! It&apos;s now live and visible to freelancers.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Stats, Project Summary, Tasks Review */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectsInvoicesStatsRow
            activeProjects={dashboardData.activeProjects}
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

        {/* Right Column - Post Gig, Invoice History and Network */}
        <div className="space-y-6">
          <PostGigButton onClick={handlePostGig} />
          {commissionerId && <InvoiceHistoryPanel commissionerId={commissionerId} />}
          {commissionerId && <CommissionerNetworkPanel commissionerId={commissionerId} />}
        </div>
      </div>

    </div>
  );
}