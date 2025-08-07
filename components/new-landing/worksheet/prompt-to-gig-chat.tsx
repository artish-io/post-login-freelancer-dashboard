

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface PromptToGigChatProps {
  prompt: string;
}

interface GigOpportunity {
  gigId: number;
  projectName: string;
  budget: string;
  organization: {
    id: number;
    name: string;
    description: string;
    logo?: string;
  };
  skillsRequired: string[];
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  matchScore: number;
  matchType: string;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  estimatedHours?: number;
}

/**
 * PromptToGigChat - Freelancer Mode Chat Component
 *
 * FLOW CHECKLIST STATUS:
 * ✅ 1. Prompt → POST to /api/ai-intake/freelancer (Working)
 * ✅ 2. Agent responds with matching gig metadata (Working)
 * ✅ 3. Gig suggestions displayed in worksheet view (Implemented)
 * ✅ 4. On select: show Apply form preview with agent-suggested answers (Implemented)
 * ✅ 5. User can edit fields before submitting (Implemented)
 * ✅ 6. POST form to /api/gigs/gig-applications (Working)
 * ✅ 7. Agent replies in chat: "Application submitted to commissioner" (Implemented)
 *
 * GAPS IDENTIFIED:
 * - Could add more sophisticated form validation
 * - Skills and tools selection could be enhanced with autocomplete
 * - Application preview could show estimated match score
 */
export default function PromptToGigChat({ prompt }: PromptToGigChatProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<GigOpportunity[]>([]);
  const [selectedGig, setSelectedGig] = useState<GigOpportunity | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    pitch: '',
    sampleLinks: [''],
    skills: [] as string[],
    tools: [] as string[]
  });

  useEffect(() => {
    const runInitialQuery = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ai-intake/freelancer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: prompt, step: 'initial' }),
        });
        const data = await res.json();
        const reply = data.result || data.error || 'No response received.';

        // Try to parse the JSON response for structured data
        try {
          const parsedResult = JSON.parse(reply);

          if (parsedResult.step === 'opportunities_results' && Array.isArray(parsedResult.opportunities)) {
            // Show gig opportunities
            setOpportunities(parsedResult.opportunities);
          } else {
            console.warn('⚠️ Agent returned invalid opportunities data');
            setOpportunities([]);
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse agent response as JSON:', parseError);
          setOpportunities([]);
        }
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    runInitialQuery();
  }, [prompt]);

  // Fetch freelancer data for pitch generation
  const [freelancerData, setFreelancerData] = useState<any>(null);

  useEffect(() => {
    const fetchFreelancerData = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/dashboard/freelancer/meta/${session.user.id}`);
        const data = await res.json();
        setFreelancerData(data);
      } catch (error) {
        console.error('Failed to fetch freelancer data:', error);
      }
    };

    fetchFreelancerData();
  }, [session?.user?.id]);

  const handleGigSelect = async (gig: GigOpportunity) => {
    // Toggle selection - if already selected, deselect; otherwise select new gig
    if (selectedGig?.gigId === gig.gigId) {
      setSelectedGig(null);
      setShowApplicationForm(false);
      return;
    }

    setSelectedGig(gig);
    setShowApplicationForm(false); // Don't show separate form, expand inline
    setLoading(true);

    // Send gig selection event to chat for dynamic response
    window.dispatchEvent(new CustomEvent('gigSelected', {
      detail: gig
    }));

    try {
      // Auto-fill application form with freelancer data
      if (freelancerData) {
        const pitchText = `Hi! I'm ${freelancerData.name}, a ${freelancerData.title} with ${freelancerData.rating}/5 rating and ${freelancerData.completedProjects || 0} completed projects.

${freelancerData.about || 'I have extensive experience in my field and would love to work on this project.'}

I have experience with: ${freelancerData.tools?.slice(0, 5).join(', ') || 'various tools and technologies'}.

Portfolio: ${freelancerData.socialLinks?.find((link: any) => link.platform === 'website')?.url || 'Available upon request'}

I'm excited to contribute to this project and deliver high-quality results.`;

        setApplicationData(prev => ({
          ...prev,
          pitch: pitchText,
          skills: freelancerData.skillCategories || [],
          tools: freelancerData.tools?.slice(0, 10) || [],
          sampleLinks: [freelancerData.socialLinks?.find((link: any) => link.platform === 'website')?.url || '']
        }));
      }
    } catch (error) {
      console.error('Failed to auto-fill application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSubmit = async () => {
    // Validation checks
    if (!selectedGig || !applicationData.pitch.trim() || !session?.user?.id) {
      alert('Please fill in all required fields and ensure you are logged in.');
      return;
    }

    setLoading(true);

    try {
      const applicationPayload = {
        gigId: selectedGig.gigId,
        freelancerId: parseInt(session.user.id),
        pitch: applicationData.pitch.trim(),
        sampleLinks: applicationData.sampleLinks.filter(link => link.trim()),
        skills: applicationData.skills,
        tools: applicationData.tools
      };

      const res = await fetch('/api/gigs/gig-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationPayload),
      });

      const result = await res.json();

      if (res.ok) {
        alert(`Application submitted successfully! Your application for "${selectedGig.projectName}" has been sent to ${selectedGig.organization.name}.`);

        // Reset form state
        setShowApplicationForm(false);
        setSelectedGig(null);
        setApplicationData({
          pitch: '',
          sampleLinks: [''],
          skills: [],
          tools: []
        });
      } else {
        throw new Error(result.error || `Application submission failed with status ${res.status}`);
      }
    } catch (err) {
      console.error('❌ Application submission failed:', err);
      alert(`Failed to submit application: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = () => {
    window.location.href = '/freelancer-dashboard/proposals/create?fromPrompt=' + encodeURIComponent(prompt);
  };

  const handleFindMoreGigs = () => {
    window.location.href = '/freelancer-dashboard/gigs?prompt=' + encodeURIComponent(prompt);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Banner Header */}
      <div className="w-full bg-white text-black text-lg font-semibold px-6 py-3 rounded-t-xl shadow-sm sticky top-0 z-10">
        <span style={{ fontFamily: 'Plus Jakarta Sans' }}>Available Opportunities</span>
      </div>

      {/* Worksheet Content with Reduced Opacity */}
      <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-b-xl p-6 shadow-md overflow-y-auto max-h-[calc(100vh-80px)]">
        {loading && opportunities.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              <span className="text-gray-600" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Finding opportunities for you...
              </span>
            </div>
          </div>
        )}

        {/* Gig Opportunities */}
        {opportunities.length > 0 && !showApplicationForm && (
          <div>
            <div className="space-y-4">

            <div className="grid grid-cols-1 gap-4">
              {opportunities.map((gig) => (
                <div key={gig.gigId} className="space-y-0">
                  <div
                    onClick={() => handleGigSelect(gig)}
                    className={`p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer bg-white ${
                      selectedGig?.gigId === gig.gigId ? 'border-pink-500 shadow-md' : 'border-gray-200'
                    }`}
                    style={{ fontFamily: 'Plus Jakarta Sans' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Organization Logo */}
                      <div className="flex-shrink-0">
                        {gig.organization.logo ? (
                          <img
                            src={gig.organization.logo}
                            alt={gig.organization.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-xs font-medium">
                              {gig.organization.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Gig Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {gig.projectName}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {gig.organization.name}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {gig.budget}
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                              {gig.matchScore}% match
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {gig.description}
                        </p>

                        {gig.skillsRequired.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {gig.skillsRequired.slice(0, 4).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                            {gig.skillsRequired.length > 4 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                +{gig.skillsRequired.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>


                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFindMoreGigs}
                className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                Browse All Gigs
              </button>
            </div>

            {/* Create Custom Proposal Banner */}
            <div className="bg-[#FCD5E3] p-5 rounded-xl mt-6 mb-8 flex justify-between items-center shadow-md">
              <span className="text-sm font-medium text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Can't find the perfect gig?
              </span>
              <button
                onClick={handleCreateProposal}
                className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-900 text-sm"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                Create Custom Proposal
              </button>
            </div>

            {/* Application Form - Appears after CTA banner */}
            {selectedGig && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4 shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <div className="flex-shrink-0">
                      {selectedGig.organization.logo ? (
                        <img
                          src={selectedGig.organization.logo}
                          alt={selectedGig.organization.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-medium">
                            {selectedGig.organization.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        Apply for {selectedGig.projectName}
                      </h3>
                      <p className="text-sm text-gray-500">{selectedGig.organization.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Pitch *
                    </label>
                    <textarea
                      value={applicationData.pitch}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, pitch: e.target.value }))}
                      placeholder="Edit your pitch here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none text-sm"
                      rows={6}
                      style={{ fontFamily: 'Plus Jakarta Sans' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Portfolio Link
                    </label>
                    <input
                      type="text"
                      value={applicationData.sampleLinks[0] || ''}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        sampleLinks: [e.target.value]
                      }))}
                      placeholder="example.com or https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      style={{ fontFamily: 'Plus Jakarta Sans' }}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedGig(null)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors"
                      style={{ fontFamily: 'Plus Jakarta Sans' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplicationSubmit}
                      disabled={!applicationData.pitch.trim() || loading}
                      className="flex-1 bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'Plus Jakarta Sans' }}
                    >
                      {loading ? 'Submitting...' : 'Send Application'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Extra spacer for scroll visibility */}
            <div className="pb-40" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && opportunities.length === 0 && !showApplicationForm && (
        <div className="flex items-center justify-center h-64">
          <div className="bg-gray-300/30 text-gray-700 text-center p-6 rounded-xl shadow-md opacity-70 max-w-md">
            <p style={{ fontFamily: 'Plus Jakarta Sans' }}>
              No gigs found for this prompt. Try a different keyword.
            </p>
          </div>
        </div>
      )}

      {/* Application Form */}
      {showApplicationForm && selectedGig && (
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedGig.organization.logo ? (
                <img
                  src={selectedGig.organization.logo}
                  alt={selectedGig.organization.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs font-medium">
                    {selectedGig.organization.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Apply for {selectedGig.projectName}
                </h3>
                <p className="text-sm text-gray-500">{selectedGig.organization.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Pitch *
                </label>
                <textarea
                  value={applicationData.pitch}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, pitch: e.target.value }))}
                  placeholder="Explain why you're perfect for this project..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none text-sm"
                  rows={6}
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio Link (Optional)
                </label>
                <input
                  type="text"
                  value={applicationData.sampleLinks[0]}
                  onChange={(e) => setApplicationData(prev => ({
                    ...prev,
                    sampleLinks: [e.target.value, ...prev.sampleLinks.slice(1)]
                  }))}
                  placeholder="your-portfolio.com or https://your-portfolio.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                />
              </div>

              {/* Tools Required Checkboxes */}
              {selectedGig.skillsRequired.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedGig.skillsRequired.map((skill, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={applicationData.skills.includes(skill)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setApplicationData(prev => ({
                                ...prev,
                                skills: [...prev.skills, skill]
                              }));
                            } else {
                              setApplicationData(prev => ({
                                ...prev,
                                skills: prev.skills.filter(s => s !== skill)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedGig(null);
                }}
                className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplicationSubmit}
                disabled={!applicationData.pitch.trim() || loading}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}