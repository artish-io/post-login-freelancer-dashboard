'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
// Using correct relative path from src/app/freelancer-dashboard/gig-requests/ to components/
import GigRequestsSidebar from '../../../../components/freelancer-dashboard/gigs/gig-requests/gig-requests-nav';
import GigRequestTable from '../../../../components/freelancer-dashboard/gigs/gig-requests/gig-request-table';
import GigRequestDetails from '../../../../components/freelancer-dashboard/gigs/gig-requests/gig-request-details';
import { requireFreelancerSession, getFreelancerId } from '../../../lib/freelancer-access-control';

type GigRequest = {
  id: number;
  freelancerId: number;
  gigId: number;
  organizationId: number;
  commissionerId: number;
  title: string;
  skills: string[];
  tools: string[];
  notes: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'Available' | 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  responses: any[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  projectId?: number;
};

type Organization = {
  id: number;
  name: string;
  email: string;
  logo: string;
  address: string;
  contactPersonId: number;
};

// Time formatting utility (matching explore-gigs pattern)
function getPostedTimeAgo(dateStr: string): string {
  const now = new Date();
  const posted = new Date(dateStr);
  const diff = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  if (diff < 7) return `${Math.floor(diff)} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return posted.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

export default function GigRequestsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const [allGigRequests, setAllGigRequests] = useState<{
    available: GigRequest[];
    pending: GigRequest[];
    accepted: GigRequest[];
    rejected: GigRequest[];
  }>({
    available: [],
    pending: [],
    accepted: [],
    rejected: []
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedGigRequest, setSelectedGigRequest] = useState<GigRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        // Ensure user is a freelancer before fetching data
        const freelancerSession = requireFreelancerSession(session?.user as any);
        if (!freelancerSession) {
          console.warn('Access denied: User is not a freelancer');
          setError('Access denied: Freelancer authentication required');
          setLoading(false);
          return;
        }

        const freelancerId = getFreelancerId(freelancerSession);
        if (!freelancerId) {
          console.warn('Access denied: Invalid freelancer ID');
          setError('Access denied: Invalid freelancer ID');
          setLoading(false);
          return;
        }

        // Fetch data using the secure freelancer-specific endpoint
        const [gigRequestsRes, organizationsRes, usersRes] = await Promise.all([
          fetch(`/api/gigs/gig-requests/${freelancerId}`), // Fetch only gig requests for this freelancer
          fetch('/api/organizations'),
          fetch('/api/users')
        ]);

        if (gigRequestsRes.ok && organizationsRes.ok && usersRes.ok) {
          const gigRequestsData = await gigRequestsRes.json();
          const organizationsData = await organizationsRes.json();
          const usersData = await usersRes.json();

          setAllGigRequests({
            available: gigRequestsData.available || [],
            pending: gigRequestsData.pending || [],
            accepted: gigRequestsData.accepted || [],
            rejected: gigRequestsData.rejected || []
          });
          setOrganizations(organizationsData);
          setUsers(usersData);
        } else {
          throw new Error('Failed to fetch data from one or more endpoints');
        }
      } catch (error) {
        console.error('Error fetching gig requests data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load gig requests');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if session is loaded and user is authenticated
    if (status !== 'loading' && session?.user?.id) {
      fetchData();
    } else if (status !== 'loading' && !session?.user?.id) {
      setError('Please log in to view gig requests');
      setLoading(false);
    }
  }, [session, status]);

  // Helper function to get organization data
  const getOrganization = (organizationId: number | null, commissionerId?: number) => {
    if (organizationId) {
      return organizations.find(org => org.id === organizationId);
    }
    // Fallback: find organization by commissioner if organizationId is null
    if (commissionerId) {
      return organizations.find(org => org.contactPersonId === commissionerId);
    }
    return null;
  };

  // Helper function to get commissioner data
  const getCommissioner = (commissionerId: number) => {
    return users.find(user => user.id === commissionerId);
  };

  // Get filtered gig requests based on status
  const getFilteredRequests = () => {
    switch (statusFilter) {
      case 'available':
        return allGigRequests.available;
      case 'pending':
        return allGigRequests.pending;
      case 'accepted':
        return allGigRequests.accepted;
      case 'rejected':
        return allGigRequests.rejected;
      case 'all':
      default:
        return [
          ...allGigRequests.available,
          ...allGigRequests.pending,
          ...allGigRequests.accepted,
          ...allGigRequests.rejected
        ];
    }
  };

  const filteredRequests = getFilteredRequests();

  // Handle gig request selection
  const handleGigRequestClick = (request: GigRequest) => {
    setSelectedGigRequest(request);
    setShowDetails(true);
  };

  // Handle closing details modal
  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedGigRequest(null);
  };

  // Transform data for table component
  const tableData = filteredRequests.map((request: GigRequest) => {
    const organization = getOrganization(request.organizationId, request.commissionerId);
    const commissioner = getCommissioner(request.commissionerId);
    return {
      id: request.id,
      organizationLogo: organization?.logo || '/logos/fallback-logo.png',
      organizationName: organization?.name || 'Unknown Organization',
      organizationVerified: true, // You can add verification logic
      commissionerName: commissioner?.name || 'Unknown Commissioner',
      skill: request.skills[0] || 'General',
      rate: request.budget && request.budget.min && request.budget.max
        ? `$${request.budget.min.toLocaleString()} - $${request.budget.max.toLocaleString()}`
        : 'Rate not specified'
    };
  });

  // Handle session loading
  if (status === 'loading') {
    return (
      <main className="flex w-full min-h-screen bg-white">
        <div className="flex items-center justify-center w-full">
          <div className="text-gray-500">Loading session...</div>
        </div>
      </main>
    );
  }

  // Handle authentication errors
  if (error) {
    return (
      <main className="flex w-full min-h-screen bg-white">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="text-red-600 font-medium mb-2">Access Denied</div>
            <div className="text-gray-500">{error}</div>
          </div>
        </div>
      </main>
    );
  }

  // Handle data loading
  if (loading) {
    return (
      <main className="flex w-full min-h-screen bg-white">
        <div className="flex items-center justify-center w-full">
          <div className="text-gray-500">Loading gig requests...</div>
        </div>
      </main>
    );
  }
  return (
    <section className="p-4 md:p-8">
      <div className="flex flex-col lg:flex-row w-full gap-6">
        {/* Sidebar - Mobile: Full width, Desktop: Fixed width */}
        <aside className="w-full lg:w-[280px] lg:shrink-0 bg-white p-4 md:p-6 rounded-xl shadow-sm">
          <GigRequestsSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm">
            <div className="mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                {statusFilter === 'all' ? 'All Gig Requests' :
                 statusFilter === 'available' ? 'Available Gigs' :
                 statusFilter === 'pending' ? 'Pending Offers' :
                 statusFilter === 'accepted' ? 'Accepted Gigs' :
                 'Rejected Offers'}
              </h1>
            </div>

            {/* Table View with Click Functionality */}
            <GigRequestTable
              data={tableData.map((item, index) => ({
                ...item,
                onClick: () => handleGigRequestClick(filteredRequests[index])
              }))}
            />
          </div>
        </div>
      </div>

      {/* Details Modal - Centered like explore-gigs */}
      <AnimatePresence>
        {showDetails && selectedGigRequest && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-start pt-8 md:pt-24 px-2 md:px-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseDetails}
          >
            <motion.div
              className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-4xl shadow-lg"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseDetails}
                className="text-sm mb-4 flex items-center gap-1 text-gray-500 hover:text-black"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Back
              </button>

              {/* Details Component */}
              <GigRequestDetails
                request={{
                  id: selectedGigRequest.id,
                  skills: selectedGigRequest.skills,
                  tools: selectedGigRequest.tools,
                  title: selectedGigRequest.title,
                  subtitle: getOrganization(selectedGigRequest.organizationId)?.name || 'Unknown Organization',
                  organizationLogo: getOrganization(selectedGigRequest.organizationId)?.logo,
                  createdAt: getPostedTimeAgo(selectedGigRequest.createdAt),
                  description: selectedGigRequest.notes,
                  toolIconUrl: "/icons/figma.svg",
                  briefUrl: "https://example.com/brief",
                  notes: selectedGigRequest.notes,
                  postedByName: getCommissioner(selectedGigRequest.commissionerId)?.name || 'Unknown Commissioner',
                  postedByAvatar: getCommissioner(selectedGigRequest.commissionerId)?.avatar || '/default-avatar.png',
                  status: selectedGigRequest.status,
                  estimatedDelivery: "2 weeks",
                  hoursOfWork: "40 hours",
                  maxRate: selectedGigRequest.budget?.max.toString() || '5000',
                  minRate: selectedGigRequest.budget?.min.toString() || '3000',
                  projectId: selectedGigRequest.projectId
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}