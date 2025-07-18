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

interface CandidateData {
  application: Application;
  freelancer: Freelancer;
  user: User;
  gig: Gig;
}

interface CandidateTableProps {
  onCandidateSelect: (candidate: CandidateData) => void;
}

export default function CandidateTable({ onCandidateSelect }: CandidateTableProps) {
  const { data: session } = useSession();
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    const fetchCandidates = async () => {
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

        // Fetch applications
        const applicationsRes = await fetch('/api/gigs/gig-applications');
        const applications = await applicationsRes.json();

        // Fetch freelancers
        const freelancersRes = await fetch('/api/freelancers');
        const freelancers = await freelancersRes.json();

        // Fetch users
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();

        // Fetch gigs
        const gigsRes = await fetch('/api/gigs');
        const gigs = await gigsRes.json();

        // Filter gigs by organization
        const organizationGigs = gigs.filter((gig: any) => gig.organizationId === userData.organizationId);
        const organizationGigIds = organizationGigs.map((gig: any) => gig.id);

        // Filter applications for this organization's gigs only
        const organizationApplications = applications.filter((app: Application) =>
          organizationGigIds.includes(app.gigId)
        );

        // Combine data
        const candidateData: CandidateData[] = organizationApplications.map((app: Application) => {
          const freelancer = freelancers.find((f: Freelancer) => f.id === app.freelancerId);
          const user = users.find((u: User) => u.id === freelancer?.userId);
          const gig = gigs.find((g: Gig) => g.id === app.gigId);

          return {
            application: app,
            freelancer,
            user,
            gig
          };
        }).filter((candidate: CandidateData) =>
          candidate.freelancer && candidate.user && candidate.gig
        );

        setCandidates(candidateData);
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [session?.user?.id]);

  const filteredCandidates = candidates.filter(candidate => {
    const status = candidate.application.status || 'pending';
    if (activeTab === 'all') return true;
    return status === activeTab;
  });

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

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'all', label: 'All', count: candidates.length },
            { key: 'accepted', label: 'Accepted', count: candidates.filter(c => c.application.status === 'accepted').length },
            { key: 'rejected', label: 'Rejected', count: candidates.filter(c => c.application.status === 'rejected').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-[#eb1966] text-[#eb1966]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden">
        <table className="w-full divide-y divide-gray-200" style={{ maxWidth: '100%', tableLayout: 'fixed' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/5 md:w-auto">
                Candidate Name
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5 md:w-auto">
                Rating
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applied Gig
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Application Date
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attachments
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCandidates.map((candidate) => (
              <tr
                key={candidate.application.id}
                onClick={() => onCandidateSelect(candidate)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-3 md:px-6 py-4 w-3/5 md:w-auto">
                  <div className="flex items-center min-w-0">
                    <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                      <Image
                        className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover"
                        src={candidate.user.avatar || '/default-avatar.png'}
                        alt={candidate.user.name}
                        width={40}
                        height={40}
                      />
                    </div>
                    <div className="ml-2 md:ml-4 min-w-0 flex-1 overflow-hidden">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {candidate.user.name}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 truncate">
                        {candidate.user.title}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 w-2/5 md:w-auto">
                  <div className="flex justify-start">
                    {renderStars(candidate.freelancer.rating)}
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{candidate.gig.title}</div>
                  <div className="text-sm text-gray-500">{candidate.freelancer.category}</div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(candidate.application.submittedAt)}
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {candidate.application.sampleLinks.length} files
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No candidates found for this filter.</p>
        </div>
      )}
    </div>
  );
}
