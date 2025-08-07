'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import ApplyModal from '../../../../../components/freelancer-dashboard/gigs/apply';
import CategoryDropdown from '../../../../../components/freelancer-dashboard/gigs/category-dropdown';
import { useErrorToast } from '@/components/ui/toast';

type Gig = {
  id: number;
  title: string;
  organizationId: number;
  category: string;
  tags: string[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  status: string;
  postedDate: string;
  description?: string;
  estimatedHours?: number;
  deliveryTimeWeeks?: number;
};

type Organization = {
  id: number;
  name: string;
  logo: string;
};

// Helper function to check if description is a placeholder
const isPlaceholderDescription = (description: string): boolean => {
  const placeholders = ['wewewe', 'placeholder', 'lorem ipsum', 'test', 'sample'];
  const cleanDesc = description.toLowerCase().trim();
  return placeholders.some(placeholder => cleanDesc === placeholder || cleanDesc.includes(placeholder));
};

export default function ExploreGigsPage() {
  const { data: session } = useSession();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const showErrorToast = useErrorToast();

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [gigsRes, orgsRes, applicationsRes] = await Promise.all([
          fetch('/api/gigs'),
          fetch('/api/organizations'),
          session?.user?.id ? fetch('/api/gigs/gig-applications') : Promise.resolve({ ok: true, json: () => [] })
        ]);

        if (!gigsRes.ok || !orgsRes.ok || !applicationsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [gigsData, orgsData, applicationsData] = await Promise.all([
          gigsRes.json(),
          orgsRes.json(),
          applicationsRes.json()
        ]);

        if (isMounted) {
          setGigs(Array.isArray(gigsData) ? gigsData : []);
          setOrganizations(Array.isArray(orgsData) ? orgsData : []);

          // Filter applications for current user
          if (session?.user?.id) {
            const userApps = Array.isArray(applicationsData) ? applicationsData.filter((app: any) =>
              app.freelancerId === parseInt(session.user.id)
            ) : [];
            setUserApplications(userApps);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load gigs');
          console.error('Failed to fetch gigs:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  // Filter gigs based on search and category
  const filteredGigs = useMemo(() => {
    return gigs.filter(gig => {
      // Category filter
      if (categoryFilter !== 'All Categories' && gig.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          gig.title.toLowerCase().includes(query) ||
          gig.category.toLowerCase().includes(query) ||
          gig.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [gigs, categoryFilter, searchQuery]);

  // Get organization for a gig
  const getOrganization = useCallback((organizationId: number) => {
    return organizations.find(org => org.id === organizationId);
  }, [organizations]);

  // Check application status for a gig
  const getApplicationStatus = useCallback((gigId: number) => {
    if (!session?.user?.id) return null;

    const applications = userApplications.filter(app => app.gigId === gigId);
    if (applications.length === 0) return null;

    const latestApplication = applications[applications.length - 1];

    // Check for pending or accepted applications
    if (latestApplication.status === 'pending' || latestApplication.status === 'accepted' || !latestApplication.status) {
      return {
        status: latestApplication.status || 'pending',
        canApply: false,
        buttonText: 'Applied',
        buttonClass: 'ml-4 bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed'
      };
    }

    // Check for rejected applications with cooldown
    if (latestApplication.status === 'rejected' && latestApplication.rejectedAt) {
      const rejectionDate = new Date(latestApplication.rejectedAt);
      const cooldownEnd = new Date(rejectionDate.getTime() + 21 * 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now < cooldownEnd) {
        const daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'cooldown',
          canApply: false,
          buttonText: `Wait ${daysRemaining}d`,
          buttonClass: 'ml-4 bg-red-400 text-white px-6 py-2 rounded-lg cursor-not-allowed',
          daysRemaining
        };
      }
    }

    return null; // Can apply normally
  }, [session?.user?.id, userApplications]);

  // Handle apply button click
  const handleApplyClick = useCallback((gig: Gig) => {
    if (!session?.user?.id) {
      showErrorToast('Authentication Required', 'Please log in to apply for gigs');
      return;
    }

    const appStatus = getApplicationStatus(gig.id);
    if (appStatus && !appStatus.canApply) {
      if (appStatus.status === 'cooldown' && appStatus.daysRemaining) {
        showErrorToast('Cannot Apply Yet', `You must wait ${appStatus.daysRemaining} more day${appStatus.daysRemaining > 1 ? 's' : ''} before re-applying to this gig.`);
      } else {
        showErrorToast('Already Applied', 'You have already applied to this gig.');
      }
      return;
    }

    setSelectedGig(gig);
    setShowApplyModal(true);
  }, [session?.user?.id, showErrorToast, getApplicationStatus]);

  // Format posted date
  const formatPostedDate = useCallback((dateStr: string) => {
    const now = new Date();
    const posted = new Date(dateStr);
    const diffDays = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }, []);

  if (loading) {
    return (
      <section className="p-4 md:p-8">
        <FreelancerHeader />
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading gigs...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="p-4 md:p-8">
        <FreelancerHeader />
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 md:p-8">
      <FreelancerHeader />

      {/* Search and Filters */}
      <div className="mb-8 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            />
            <div className="min-w-[180px]">
              <CategoryDropdown
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="All Categories"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredGigs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No gigs found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGigs.map((gig) => {
            const organization = getOrganization(gig.organizationId);

            return (
              <div
                key={gig.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {organization?.logo && (
                        <img
                          src={organization.logo}
                          alt={organization.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                        <p className="text-sm text-gray-600">{organization?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="bg-gray-100 px-2 py-1 rounded">{gig.category}</span>
                      <span>${gig.hourlyRateMin}–${gig.hourlyRateMax}/hr</span>
                      <span>{formatPostedDate(gig.postedDate)}</span>
                    </div>

                    {gig.description && gig.description.trim() && !isPlaceholderDescription(gig.description) && (
                      <p className="text-gray-700 text-sm mb-3 line-clamp-2">{gig.description}</p>
                    )}

                    {gig.tags && gig.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {gig.tags.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const appStatus = getApplicationStatus(gig.id);
                    if (appStatus) {
                      return (
                        <button
                          onClick={() => handleApplyClick(gig)}
                          className={appStatus.buttonClass}
                          disabled={!appStatus.canApply}
                        >
                          {appStatus.buttonText}
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleApplyClick(gig)}
                        className="ml-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Apply
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedGig && (
        <ApplyModal
          gigId={selectedGig.id}
          gigTitle={selectedGig.title}
          isOpen={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedGig(null);
          }}
          onSuccess={async () => {
            // Refresh applications list to update button states
            try {
              if (session?.user?.id) {
                const applicationsRes = await fetch('/api/gigs/gig-applications');
                if (applicationsRes.ok) {
                  const applicationsData = await applicationsRes.json();
                  const userApps = Array.isArray(applicationsData) ? applicationsData.filter((app: any) =>
                    app.freelancerId === parseInt(session.user.id)
                  ) : [];
                  setUserApplications(userApps);
                }
              }
            } catch (error) {
              console.error('Failed to refresh applications:', error);
            }

            setShowApplyModal(false);
            setSelectedGig(null);
          }}
        />
      )}
    </section>
  );
}
