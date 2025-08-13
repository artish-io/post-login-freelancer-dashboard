'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Application {
  id: number;
  gigId: number;
  freelancerId: number;
  pitch: string;
  sampleLinks: string[];
  skills: string[];
  tools: string[];
  submittedAt: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

interface Freelancer {
  id: number;
  userId: number;
  rating: number;
  category: string;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  title: string;
}

interface Gig {
  id: number;
  title: string;
}

interface GigRequest {
  id: number;
  gigId: number;
  freelancerId: number;
  commissionerId: number;
  organizationId: number;
  title: string;
  status: string;
  createdAt?: string;
  acceptedAt?: string;
  projectId?: number;
  budget?: {
    min: number;
    max: number;
  };
  skills?: string[];
  tools?: string[];
  notes?: string;
}

interface CandidateData {
  application?: Application | null;
  gigRequest?: GigRequest | null;
  freelancer: Freelancer | null;
  user: User | null;
  gig: Gig;
  type: 'public' | 'private' | 'placeholder';
}

type ViewMode = 'all' | 'gig-listings' | 'gig-requests' | 'matched-listings' | 'rejected-listings' | 'accepted-requests' | 'rejected-requests';

interface CandidateTableProps {
  onCandidateSelect: (candidate: CandidateData) => void;
  viewMode?: ViewMode;
  onTabCountsUpdate?: (counts: Record<ViewMode, number>) => void;
}

export default function CandidateTable({ onCandidateSelect, viewMode = 'all', onTabCountsUpdate }: CandidateTableProps) {
  const { data: session } = useSession();
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);

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

        // Fetch applications
        const applicationsRes = await fetch('/api/gigs/gig-applications');
        const applications = await applicationsRes.json();

        // Fetch gig requests
        const gigRequestsRes = await fetch('/api/gigs/gig-requests');
        const gigRequests = await gigRequestsRes.json();

        // Fetch freelancers
        const freelancersRes = await fetch('/api/freelancers');
        const freelancers = await freelancersRes.json();

        // Fetch users
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();

        // Fetch gigs (including all gigs, not just available ones)
        const gigsRes = await fetch('/api/gigs/all');
        const gigsResponse = await gigsRes.json();
        const gigs = gigsResponse.entities?.gigs || [];

        // Filter gigs by organization and commissioner (handle both string and number types)
        const organizationGigs = gigs.filter((gig: any) =>
          gig.organizationId === userData.organizationId &&
          String(gig.commissionerId) === String(userId)
        );
        const organizationGigIds = organizationGigs.map((gig: any) => gig.id);

        // Filter applications for this organization's gigs only
        const organizationApplications = applications.filter((app: Application) =>
          organizationGigIds.includes(app.gigId)
        );

        // Filter gig requests for this commissioner (handle both string and number types)
        const organizationGigRequests = gigRequests.filter((req: GigRequest) =>
          String(req.commissionerId) === String(userId) &&
          req.organizationId === userData.organizationId
        );

        // Combine application data (public applications)
        const applicationCandidates: CandidateData[] = organizationApplications.map((app: Application) => {
          const freelancer = freelancers.find((f: Freelancer) => f.id === app.freelancerId);
          const user = users.find((u: User) => u.id === freelancer?.userId);
          const gig = gigs.find((g: Gig) => g.id === app.gigId);

          return {
            application: app,
            freelancer,
            user,
            gig,
            type: 'public' as const
          };
        }).filter((candidate: CandidateData) =>
          candidate.freelancer && candidate.user && candidate.gig
        );

        // Combine gig request data (private requests)
        const requestCandidates: CandidateData[] = organizationGigRequests.map((req: GigRequest) => {
          const freelancer = freelancers.find((f: Freelancer) => f.id === req.freelancerId);
          const user = users.find((u: User) => u.id === freelancer?.userId);
          const gig = gigs.find((g: Gig) => g.id === req.gigId) || {
            id: req.gigId,
            title: req.title
          };

          return {
            gigRequest: req,
            freelancer,
            user,
            gig,
            type: 'private' as const
          };
        }).filter((candidate: CandidateData) =>
          candidate.freelancer && candidate.user && candidate.gig
        );

        // Create placeholder entries for gigs without applications
        const gigsWithApplications = new Set([
          ...organizationApplications.map((app: Application) => app.gigId),
          ...organizationGigRequests.map((req: GigRequest) => req.gigId)
        ]);

        const gigsWithoutApplications = organizationGigs.filter((gig: any) =>
          !gigsWithApplications.has(gig.id)
        );

        const gigPlaceholders: CandidateData[] = gigsWithoutApplications.map((gig: any) => ({
          application: null,
          gigRequest: null,
          freelancer: null,
          user: null,
          gig,
          type: 'placeholder' as const
        }));

        // Filter candidates based on view mode
        let candidateData: CandidateData[] = [];

        switch (viewMode) {
          case 'all':
            // Show both public applications, private requests, and gigs without applications
            candidateData = [...applicationCandidates, ...requestCandidates, ...gigPlaceholders];
            break;
          case 'gig-listings':
            // Show only public gig applications (pending) and gigs without applications
            candidateData = [
              ...applicationCandidates.filter(c =>
                !c.application?.status || c.application.status === 'pending'
              ),
              ...gigPlaceholders.filter(p => (p.gig as any).isPublic !== false)
            ];
            break;
          case 'gig-requests':
            // Show only private gig requests that are unaccepted
            candidateData = requestCandidates.filter(c =>
              !c.gigRequest?.status ||
              c.gigRequest.status === 'pending' ||
              c.gigRequest.status === 'Pending' ||
              c.gigRequest.status === 'Available'
            );
            break;
          case 'matched-listings':
            // Show only accepted public gig applications
            candidateData = applicationCandidates.filter(c =>
              c.application?.status === 'accepted'
            );
            break;
          case 'rejected-listings':
            // Show only rejected public gig applications
            candidateData = applicationCandidates.filter(c =>
              c.application?.status === 'rejected'
            );
            break;
          case 'accepted-requests':
            // Show only accepted private gig requests
            candidateData = requestCandidates.filter(c =>
              c.gigRequest?.status === 'accepted' || c.gigRequest?.status === 'Accepted'
            );
            break;
          case 'rejected-requests':
            // Show only rejected private gig requests
            candidateData = requestCandidates.filter(c =>
              c.gigRequest?.status === 'rejected' || c.gigRequest?.status === 'Rejected'
            );
            break;
          default:
            candidateData = [...applicationCandidates, ...requestCandidates];
        }

        // Sort by most recent submissions first
        const sortedCandidates = candidateData.sort((a, b) => {
          const dateA = a.type === 'public'
            ? new Date(a.application!.submittedAt).getTime()
            : new Date(a.gigRequest!.createdAt || 0).getTime();
          const dateB = b.type === 'public'
            ? new Date(b.application!.submittedAt).getTime()
            : new Date(b.gigRequest!.createdAt || 0).getTime();
          return dateB - dateA; // Newest first
        });

        setCandidates(sortedCandidates);

        // Calculate tab counts and send to parent
        if (onTabCountsUpdate) {
          const counts: Record<ViewMode, number> = {
            'all': [...applicationCandidates, ...requestCandidates, ...gigPlaceholders].length,
            'gig-listings': [
              ...applicationCandidates.filter(c => !c.application?.status || c.application.status === 'pending'),
              ...gigPlaceholders.filter(p => (p.gig as any).isPublic !== false)
            ].length,
            'gig-requests': requestCandidates.filter(c => !c.gigRequest?.status || c.gigRequest.status === 'pending' || c.gigRequest.status === 'Pending' || c.gigRequest.status === 'Available').length,
            'matched-listings': applicationCandidates.filter(c => c.application?.status === 'accepted').length,
            'rejected-listings': applicationCandidates.filter(c => c.application?.status === 'rejected').length,
            'accepted-requests': requestCandidates.filter(c => c.gigRequest?.status === 'accepted' || c.gigRequest?.status === 'Accepted').length,
            'rejected-requests': requestCandidates.filter(c => c.gigRequest?.status === 'rejected' || c.gigRequest?.status === 'Rejected').length
          };
          onTabCountsUpdate(counts);
        }
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [session?.user?.id, viewMode]);

  // Since filtering is now done at data fetch level, just use all candidates
  const filteredCandidates = candidates;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3 h-3 md:w-4 md:h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-xs md:text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1155a] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get view title
  const getViewTitle = () => {
    switch (viewMode) {
      case 'all':
        return 'All Candidates & Requests';
      case 'gig-listings':
        return 'Gig Listings';
      case 'gig-requests':
        return 'Gig Requests';
      case 'matched-listings':
        return 'Matched Listings';
      case 'rejected-listings':
        return 'Rejected Listings';
      case 'accepted-requests':
        return 'Accepted Requests';
      case 'rejected-requests':
        return 'Rejected Requests';
      default:
        return 'Candidates';
    }
  };

  // Helper function to get empty state message
  const getEmptyMessage = () => {
    switch (viewMode) {
      case 'all':
        return 'No candidates or requests found.';
      case 'gig-listings':
        return 'No public gig applications found.';
      case 'gig-requests':
        return 'No private gig requests received.';
      case 'matched-listings':
        return 'No matched public applications yet.';
      case 'rejected-listings':
        return 'No rejected public applications yet.';
      case 'accepted-requests':
        return 'No accepted private requests yet.';
      case 'rejected-requests':
        return 'No rejected private requests yet.';
      default:
        return 'No candidates found.';
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{getViewTitle()}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {filteredCandidates.length} {filteredCandidates.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden">
        <table className="w-full divide-y divide-gray-200" style={{ maxWidth: '100%', tableLayout: 'fixed' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/5 md:w-auto">
                {viewMode === 'gig-listings' || viewMode === 'matched-listings' || viewMode === 'rejected-listings' ? 'Candidate Name' : 'Freelancer Name'}
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5 md:w-auto">
                Rating
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {viewMode === 'gig-listings' || viewMode === 'matched-listings' || viewMode === 'rejected-listings' ? 'Applied Gig' : 'Request Title'}
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {viewMode === 'gig-listings' || viewMode === 'matched-listings' || viewMode === 'rejected-listings' ? 'Application Date' : 'Request Date'}
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {viewMode === 'gig-listings' || viewMode === 'matched-listings' || viewMode === 'rejected-listings' ? 'Attachments' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCandidates.map((candidate) => {
              const candidateId = candidate.type === 'public'
                ? candidate.application?.id
                : candidate.gigRequest?.id;
              const submittedDate = candidate.type === 'public'
                ? candidate.application?.submittedAt
                : candidate.gigRequest?.createdAt;
              const attachmentCount = candidate.type === 'public'
                ? candidate.application?.sampleLinks?.length || 0
                : 0;

              return (
                <tr
                  key={`${candidate.type}-${candidateId}`}
                  onClick={() => onCandidateSelect(candidate)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                <td className="px-3 md:px-6 py-4 w-3/5 md:w-auto">
                  {candidate.type === 'placeholder' ? (
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.5" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-2 md:ml-4 min-w-0 flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          No applications yet
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          Gig is active and accepting applications
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                        <Image
                          className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover"
                          src={candidate.user?.avatar || '/default-avatar.png'}
                          alt={candidate.user?.name || 'User'}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div className="ml-2 md:ml-4 min-w-0 flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {candidate.user?.name}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          {candidate.user?.title}
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 md:px-6 py-4 w-2/5 md:w-auto">
                  <div className="flex justify-start">
                    {candidate.type === 'placeholder' ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      renderStars(candidate.freelancer?.rating || 0)
                    )}
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4">
                  <div className="min-w-0 max-w-xs">
                    <div className="text-sm text-gray-900 truncate">{candidate.gig.title}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {candidate.type === 'placeholder'
                        ? 'Awaiting applications'
                        : candidate.type === 'public'
                        ? candidate.freelancer?.category
                        : candidate.gigRequest?.budget
                          ? `$${candidate.gigRequest.budget.min?.toLocaleString()} - $${candidate.gigRequest.budget.max?.toLocaleString()}`
                          : candidate.freelancer?.category
                      }
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submittedDate ? formatDate(submittedDate) : 'N/A'}
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                  {candidate.type === 'public' ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {attachmentCount} files
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        candidate.gigRequest?.status === 'accepted' || candidate.gigRequest?.status === 'Accepted'
                          ? 'bg-green-100 text-green-800'
                          : candidate.gigRequest?.status === 'rejected' || candidate.gigRequest?.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {candidate.gigRequest?.status || 'Pending'}
                      </span>
                      {(candidate.gigRequest?.status === 'accepted' || candidate.gigRequest?.status === 'Accepted') && candidate.gigRequest?.projectId && (
                        <a
                          href={`/commissioner-dashboard/projects-and-invoices/project-details/${candidate.gigRequest.projectId}`}
                          className="text-xs text-[#eb1966] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Project #{candidate.gigRequest.projectId}
                        </a>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
          <p className="text-gray-500">{getEmptyMessage()}</p>
        </div>
      )}
    </div>
  );
}
