'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, User, Building2, Star, DollarSign, MapPin } from 'lucide-react';
import { getRelativeTime } from '../../utils/date-utils';
import Image from 'next/image';

interface ResultsDropdownProps {
  results: string;
  isVisible: boolean;
  mode: 'building' | 'executing';
  onFreelancerSelect?: (freelancerId: number) => void;
  onConfirmRequirements?: () => void;
  onEditRequirements?: () => void;
  onSaveEdits?: () => void;
  onGigSelect?: (gigId: number) => void;
  onCreateProposal?: () => void;
  onApplyForGig?: () => void;
  onShowOtherGigs?: () => void;
  editingRequirements?: boolean;
  editedRequirements?: any;
  onRequirementsChange?: (requirements: any) => void;
}

interface ParsedResults {
  step?: string;
  message?: string;
  freelancers?: Array<{
    id: number;
    name: string;
    title: string;
    skills: string[];
    hourlyRate: number;
    rating: number;
    avatar: string;
    completedProjects: number;
    estimatedCost: number;
  }>;
  opportunities?: Array<{
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
    postedDate: string;
    deadline?: string;
  }>;
  organizations?: Array<{
    id: number;
    name: string;
    description: string;
    activeGigs: number;
  }>;
  categories?: string[];
  tools?: string[];
  showPostGigButton?: boolean;
  projectDetails?: {
    description: string;
    budget: string;
    categories: string[];
  };
  totalOpportunities?: number;
}

export default function ResultsDropdown({
  results,
  isVisible,
  mode,
  onFreelancerSelect,
  onConfirmRequirements,
  onEditRequirements,
  onSaveEdits,
  onGigSelect,
  onCreateProposal,
  onApplyForGig,
  onShowOtherGigs,
  editingRequirements,
  editedRequirements,
  onRequirementsChange
}: ResultsDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedResults>({});
  const { data: session } = useSession();
  const router = useRouter();

  const handleFreelancerSelect = (freelancerId: number) => {
    if (!session) {
      // Redirect to commissioner login if not logged in
      router.push('/login-commissioner');
      return;
    }

    // If callback provided, use it (for AI flow), otherwise navigate to profile
    if (onFreelancerSelect) {
      onFreelancerSelect(freelancerId);
    } else {
      router.push(`/commissioner-dashboard/freelancers/${freelancerId}`);
    }
  };

  const handleGigApply = (gigId: number) => {
    if (!session) {
      // Redirect to freelancer login if not logged in
      router.push('/login');
      return;
    }

    // For "Available Opportunities" section, always navigate directly to apply page
    // Don't use the AI flow callback for this
    router.push(`/freelancer-dashboard/gigs/${gigId}/apply`);
  };

  const handlePostAsGig = () => {
    if (!session) {
      // Redirect to commissioner login if not logged in
      router.push('/login-commissioner');
      return;
    }

    // Trigger AI agent to generate gig outline
    if (onFreelancerSelect) {
      // Use the AI flow to generate project requirements
      onFreelancerSelect(null); // Pass null to indicate "post as gig" mode
    } else {
      // Fallback to manual post gig page
      router.push('/commissioner-dashboard/job-listings/post');
    }
  };

  const handleSendGigRequest = (freelancerId: number) => {
    if (!session) {
      // Redirect to commissioner login if not logged in
      router.push('/login-commissioner');
      return;
    }

    // Trigger AI agent to generate requirements for private gig request
    if (onFreelancerSelect) {
      onFreelancerSelect(freelancerId);
    } else {
      // Fallback to manual post gig page
      router.push(`/commissioner-dashboard/projects-and-invoices/post-a-gig/step-1?targetFreelancer=${freelancerId}`);
    }
  };

  useEffect(() => {
    if (results) {
      try {
        // Try to parse as JSON first (new structured format)
        const parsed = JSON.parse(results);
        setParsedResults(parsed);
        setIsExpanded(true);
      } catch (e) {
        // Fallback to old text parsing for backward compatibility
        const parsed: ParsedResults = {};

        // Extract freelancers
        const freelancerMatches = results.match(/\*\*Top Freelancers:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
        if (freelancerMatches) {
          parsed.freelancers = freelancerMatches[1]
            .split('\n')
            .filter(line => line.trim().startsWith('•'))
            .map(line => {
              const match = line.match(/• (.+?) - (.+?) \((.+?)\) - (.+)/);
              return match ? {
                id: 0,
                name: match[1],
                title: match[2],
                skills: match[3].split(', '),
                hourlyRate: parseInt(match[4].replace(/[^0-9]/g, '')) || 50,
                rating: 4.5,
                avatar: '',
                completedProjects: 0,
                estimatedCost: 0
              } : null;
            })
            .filter(Boolean) as any[];
        }

        // Extract categories and tools
        const categoriesMatch = results.match(/\*\*Relevant Categories:\*\* (.+)/);
        if (categoriesMatch) {
          parsed.categories = categoriesMatch[1].split(', ').filter(Boolean);
        }

        const toolsMatch = results.match(/\*\*(?:Suggested Tools|In-Demand Tools):\*\* (.+)/);
        if (toolsMatch) {
          parsed.tools = toolsMatch[1].split(', ').filter(Boolean);
        }

        // Extract main message
        const messageMatch = results.match(/^(.+?)(?=\n\*\*)/s);
        if (messageMatch) {
          parsed.message = messageMatch[1].trim();
        }

        setParsedResults(parsed);
        setIsExpanded(true);
      }
    }
  }, [results]);

  if (!isVisible) return null;

  return (
    <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-30 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div
        className="p-6 bg-gradient-to-r from-white/80 to-white/60 border-b border-white/30 cursor-pointer flex items-center justify-between hover:bg-white/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            {mode === 'building' ? (
              <Building2 className="w-5 h-5 text-white" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'building' ? 'Recommended Freelancers & Teams' : 'Available Opportunities'}
            </h3>
            <p className="text-sm text-gray-600">
              {parsedResults.message || 'Click to view detailed matches'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          
          {/* Freelancers Section */}
          {parsedResults.freelancers && parsedResults.freelancers.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Top Freelancers ({parsedResults.freelancers.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                {parsedResults.freelancers.map((freelancer, index) => (
                  <div
                    key={freelancer.id || index}
                    className="p-6 bg-white rounded-3xl border border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg hover:shadow-gray-100/50 cursor-pointer"
                    onClick={() => handleFreelancerSelect(freelancer.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center overflow-hidden ring-2 ring-[#eb1966] ring-offset-2">
                        {freelancer.avatar ? (
                          <img src={freelancer.avatar} alt={freelancer.name} className="w-14 h-14 rounded-3xl object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-gray-900">{freelancer.name}</h5>
                            <p className="text-sm text-gray-600">{freelancer.title}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                              <DollarSign className="w-3 h-3" />
                              ${freelancer.hourlyRate}/hr
                            </div>
                            {freelancer.rating && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {freelancer.rating}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span>{freelancer.completedProjects} projects completed</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{freelancer.location}</span>
                          </div>
                        </div>

                        {/* Send Gig Request Button */}
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleSendGigRequest(freelancer.id);
                            }}
                            className="bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors text-xs font-medium"
                          >
                            Send Gig Request
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Post a Gig Banner - Always show for building mode */}
              {mode === 'building' && (
                <div className="mt-6 p-6 bg-white rounded-3xl border-2 border-[#FCD5E3] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900">Don't see the perfect match?</h5>
                      <p className="text-sm text-gray-600 mt-1">Post your project as a gig to attract more freelancers</p>
                    </div>
                    <button
                      onClick={handlePostAsGig}
                      className="bg-[#eb1966] text-white px-6 py-3 rounded-2xl font-medium hover:bg-[#d1175a] transition-all hover:shadow-md"
                    >
                      Post a Gig
                    </button>
                  </div>
                </div>
              )}

              {/* Post as Gig Button - Legacy support */}
              {parsedResults.showPostGigButton && mode !== 'building' && (
                <div className="mt-6 p-6 bg-white rounded-3xl border-2 border-[#FCD5E3] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900">Don't see the perfect match?</h5>
                      <p className="text-sm text-gray-600 mt-1">Post your project as a gig to attract more freelancers</p>
                    </div>
                    <button
                      onClick={handlePostAsGig}
                      className="bg-[#eb1966] text-white px-6 py-3 rounded-2xl font-medium hover:bg-[#d1175a] transition-all hover:shadow-md"
                    >
                      Post as Gig
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opportunities Section (for freelancers) */}
          {parsedResults.opportunities && parsedResults.opportunities.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Available Opportunities ({parsedResults.totalOpportunities || parsedResults.opportunities.length})
              </h4>
              <div className="grid gap-4">
                {parsedResults.opportunities.map((opportunity, index) => (
                  <div key={opportunity.gigId || index} className="p-6 bg-white rounded-3xl border border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg hover:shadow-gray-100/50">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Organization Logo */}
                      <div className="flex-shrink-0">
                        {opportunity.organization.logo ? (
                          <Image
                            src={opportunity.organization.logo}
                            alt={`${opportunity.organization.name} logo`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-2xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-lg mb-1 truncate">{opportunity.projectName}</h5>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600 font-medium">{opportunity.organization.name}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {getRelativeTime(opportunity.postedDate)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{opportunity.description}</p>
                      </div>

                      {/* Budget */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-gray-900">{opportunity.budget}</div>
                        {opportunity.deadline && (
                          <div className="text-xs text-gray-500 mt-1">
                            Deadline: {getRelativeTime(opportunity.deadline)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {opportunity.skillsRequired.slice(0, 4).map((skill, skillIndex) => (
                        <span key={skillIndex} className="px-3 py-1.5 bg-pink-50 text-pink-700 text-xs font-medium rounded-full border border-pink-100">
                          {skill}
                        </span>
                      ))}
                      {opportunity.skillsRequired.length > 4 && (
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-500 text-xs font-medium rounded-full border border-gray-100">
                          +{opportunity.skillsRequired.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Apply Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleGigApply(opportunity.gigId)}
                        className="bg-black text-white px-6 py-2.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-all hover:shadow-md"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create Proposal Button */}
              {parsedResults.opportunities && parsedResults.opportunities.length > 0 && (
                <div className="mt-6 p-6 bg-white rounded-3xl border-2 border-[#FCD5E3] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900">Don't see the perfect opportunity?</h5>
                      <p className="text-sm text-gray-600 mt-1">Create a custom proposal for commissioners in your field</p>
                    </div>
                    <button
                      onClick={onCreateProposal}
                      className="bg-[#eb1966] text-white px-6 py-3 rounded-2xl font-medium hover:bg-[#d1175a] transition-all hover:shadow-md"
                    >
                      Create Proposal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}





          {/* Gig Application Auto-Generation Section */}
          {parsedResults.step === 'gig_application_generated' && parsedResults.gigApplication && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📝 Auto-Generated Gig Application
              </h4>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Applying for: {parsedResults.gigApplication.gigTitle}</h5>
                  <p className="text-sm text-gray-600">at {parsedResults.gigApplication.organization}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Your Pitch (Editable)</label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                      rows={6}
                      defaultValue={parsedResults.gigApplication.autoPitch}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Matching Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {parsedResults.gigApplication.matchingSkills.map((skill: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Tool Familiarity</label>
                      <div className="flex flex-wrap gap-2">
                        {parsedResults.gigApplication.toolFamiliarity.map((tool: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Reference Link 1</label>
                      <input
                        type="url"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Reference Link 2</label>
                      <input
                        type="url"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Reference Link 3</label>
                      <input
                        type="url"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onApplyForGig}
                  className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Apply For Gig
                </button>
                <button
                  onClick={onShowOtherGigs}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Show Me Other Gigs
                </button>
              </div>
            </div>
          )}

          {/* Proposal Generation Section */}
          {parsedResults.step === 'proposal_requirements_generated' && parsedResults.proposalRequirements && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                💼 Generated Proposal for Top Commissioner
              </h4>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Proposing to: {parsedResults.proposalRequirements.selectedContact.name}</h5>
                  <p className="text-sm text-gray-600">at {parsedResults.proposalRequirements.selectedContact.organization?.name}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Project Name</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                      defaultValue={parsedResults.proposalRequirements.projectName}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Project Scope (Editable)</label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                      rows={6}
                      defaultValue={parsedResults.proposalRequirements.projectScope}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Total Amount</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                        defaultValue={`$${parsedResults.proposalRequirements.totalAmount}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Execution Method</label>
                      <select className="w-full p-3 border border-gray-300 rounded-lg text-sm">
                        <option value="completion" selected={parsedResults.proposalRequirements.executionMethod === 'completion'}>
                          Payment on Completion
                        </option>
                        <option value="milestone" selected={parsedResults.proposalRequirements.executionMethod === 'milestone'}>
                          Milestone-based Payment
                        </option>
                      </select>
                    </div>
                  </div>

                  {parsedResults.proposalRequirements.milestones && parsedResults.proposalRequirements.milestones.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Milestones</label>
                      <div className="space-y-2">
                        {parsedResults.proposalRequirements.milestones.map((milestone: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <h6 className="font-medium text-sm">{milestone.title}</h6>
                                <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium">${milestone.amount}</span>
                                <span className="text-xs text-gray-500 block">({milestone.percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onApplyForGig} // Reuse for proposal submission
                  className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Send Proposal
                </button>
                <button
                  onClick={onEditRequirements}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Nah, let me tweak it
                </button>
              </div>
            </div>
          )}

          {/* No Matching Commissioners Section */}
          {parsedResults.step === 'no_matching_commissioners' && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                😔 No Matching Commissioners
              </h4>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-700 mb-4">{parsedResults.message}</p>

                {parsedResults.suggestions && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Suggestions:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {parsedResults.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Requirements Confirmation Section */}
          {parsedResults.step === 'requirements_confirmation' && parsedResults.projectRequirements && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📋 Project Requirements Confirmation
              </h4>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Project Details</h5>
                    <div className="space-y-2 text-sm">
                      {editingRequirements ? (
                        <>
                          <div>
                            <label className="font-medium">Title:</label>
                            <input
                              type="text"
                              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                              value={editedRequirements?.title || ''}
                              onChange={(e) => onRequirementsChange?.({...editedRequirements, title: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="font-medium">Timeline:</label>
                            <input
                              type="text"
                              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                              value={editedRequirements?.timeline || ''}
                              onChange={(e) => onRequirementsChange?.({...editedRequirements, timeline: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="font-medium">Payment Schedule:</label>
                            <select
                              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                              value={editedRequirements?.paymentSchedule || 'completion'}
                              onChange={(e) => onRequirementsChange?.({...editedRequirements, paymentSchedule: e.target.value})}
                            >
                              <option value="completion">Pay on Completion</option>
                              <option value="milestone">Milestone-based</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium">Title:</span> {parsedResults.projectRequirements.title}</p>
                          <p><span className="font-medium">Category:</span> {parsedResults.projectRequirements.category}</p>
                          <p><span className="font-medium">Subcategory:</span> {parsedResults.projectRequirements.subcategory}</p>
                          <p><span className="font-medium">Timeline:</span> {parsedResults.projectRequirements.timeline}</p>
                          <p><span className="font-medium">Budget:</span> ${parsedResults.projectRequirements.budget?.toLocaleString() || 'Not specified'}</p>
                          <p><span className="font-medium">Start:</span> {parsedResults.projectRequirements.startType}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Deliverables</h5>
                    <div className="space-y-1 text-sm">
                      {parsedResults.projectRequirements.deliverables?.map((deliverable: string, index: number) => (
                        <p key={index} className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          {deliverable}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                  {editingRequirements ? (
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      rows={3}
                      value={editedRequirements?.description || ''}
                      onChange={(e) => onRequirementsChange?.({...editedRequirements, description: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsedResults.projectRequirements.description}</p>
                  )}
                </div>

                {parsedResults.projectRequirements.skillsRequired && parsedResults.projectRequirements.skillsRequired.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Required Skills</h5>
                    <div className="flex flex-wrap gap-2">
                      {parsedResults.projectRequirements.skillsRequired.map((skill: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedResults.projectRequirements.toolsRequired && parsedResults.projectRequirements.toolsRequired.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Tools Required</h5>
                    <div className="flex flex-wrap gap-2">
                      {parsedResults.projectRequirements.toolsRequired.map((tool: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedResults.projectRequirements.milestones && parsedResults.projectRequirements.milestones.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Milestones</h5>
                    <div className="space-y-2">
                      {editingRequirements ? (
                        editedRequirements?.milestones?.map((milestone: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                className="flex-1 p-1 border border-gray-300 rounded text-sm"
                                value={milestone.title || ''}
                                onChange={(e) => {
                                  const newMilestones = [...(editedRequirements?.milestones || [])];
                                  newMilestones[index] = {...milestone, title: e.target.value};
                                  onRequirementsChange?.({...editedRequirements, milestones: newMilestones});
                                }}
                              />
                              <input
                                type="number"
                                className="w-16 p-1 border border-gray-300 rounded text-sm"
                                value={milestone.percentage || ''}
                                onChange={(e) => {
                                  const newMilestones = [...(editedRequirements?.milestones || [])];
                                  newMilestones[index] = {...milestone, percentage: parseInt(e.target.value) || 0};
                                  onRequirementsChange?.({...editedRequirements, milestones: newMilestones});
                                }}
                              />
                              <span className="text-sm self-center">%</span>
                            </div>
                            <textarea
                              className="w-full p-1 border border-gray-300 rounded text-xs"
                              rows={2}
                              value={milestone.description || ''}
                              onChange={(e) => {
                                const newMilestones = [...(editedRequirements?.milestones || [])];
                                newMilestones[index] = {...milestone, description: e.target.value};
                                onRequirementsChange?.({...editedRequirements, milestones: newMilestones});
                              }}
                            />
                          </div>
                        ))
                      ) : (
                        parsedResults.projectRequirements.milestones.map((milestone: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                            <h6 className="font-medium text-sm">{milestone.title} ({milestone.percentage}%)</h6>
                            <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                {editingRequirements ? (
                  <>
                    <button
                      onClick={onSaveEdits}
                      className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onConfirmRequirements}
                      className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                      {parsedResults.isPrivateGig ? 'Send Gig Request' : 'Post Gig Publicly'}
                    </button>
                    <button
                      onClick={onEditRequirements}
                      className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      No, let me tweak it a little
                    </button>
                  </>
                )}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
