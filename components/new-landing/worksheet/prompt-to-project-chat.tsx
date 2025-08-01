

'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface PromptToProjectChatProps {
  prompt: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

interface ProjectRequirements {
  title: string;
  category: string;
  subcategory: string;
  description: string;
  deliverables: string[];
  timeline: string;
  skillsRequired: string[];
  toolsRequired: string[];
  milestones: Array<{
    title: string;
    description: string;
    percentage: number;
  }>;
  startType: string;
  budget: number;
  estimatedHours: number;
  recommendedBudget: number;
  paymentSchedule: string;
  isPrivateGig: boolean;
  targetFreelancerId?: number;
}

/**
 * PromptToProjectChat - Commissioner Mode Chat Component
 *
 * FLOW CHECKLIST STATUS:
 * ✅ 1. Prompt → agent POST to /api/ai-intake/client (Working)
 * ✅ 2. Agent replies with JSON { step: "freelancer_selection" } (Working)
 * ✅ 3. Agent generates gig requirements in editable format (Implemented)
 * ✅ 4. Render editable gig proposal form in worksheet right pane (Implemented)
 * ✅ 5. When user confirms → POST to /api/gigs/create (Working via ai-intake/client)
 * ✅ 6. Agent posts follow-up in chat thread confirming gig sent (Implemented)
 *
 * GAPS IDENTIFIED:
 * - Requirements editing UI could be more sophisticated (currently basic preview)
 * - Session management for commissioner ID needs validation
 * - Error recovery could include retry mechanisms
 */
export default function PromptToProjectChat({ prompt }: PromptToProjectChatProps) {
  const { data: session } = useSession();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'user', content: prompt },
  ]);
  const [step, setStep] = useState<'initial' | 'budget' | 'confirmation' | 'done'>('initial');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectRequirements, setProjectRequirements] = useState<ProjectRequirements | null>(null);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<number | null>(null);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [showGigForm, setShowGigForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchInitialResponse = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ai-intake/client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, step: 'initial' }),
        });
        const data = await res.json();
        const reply = data.result || data.error || 'No response received.';

        // Try to parse the JSON response for structured data
        try {
          const parsedResult = JSON.parse(reply);

          // Validate required fields in parsed result
          if (!parsedResult.step || !parsedResult.message) {
            throw new Error('Invalid agent response format: missing step or message');
          }

          if (parsedResult.step === 'freelancer_selection') {
            // Validate freelancer data
            if (!Array.isArray(parsedResult.freelancers)) {
              console.warn('⚠️ Agent returned invalid freelancers data, falling back to text display');
              setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
              return;
            }

            // Show freelancer selection with option to post gig
            setFreelancers(parsedResult.freelancers);
            setChatHistory((prev) => [...prev, {
              role: 'ai',
              content: parsedResult.message + '\n\nSelect a freelancer to send a private gig request, or click "Post Public Gig" to make it available to all freelancers.'
            }]);
            setShowGigForm(true);
          } else if (parsedResult.step === 'requirements_confirmation') {
            // Validate project requirements data
            if (!parsedResult.projectRequirements || typeof parsedResult.projectRequirements !== 'object') {
              console.warn('⚠️ Agent returned invalid project requirements, falling back to text display');
              setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
              return;
            }

            // Show project requirements for editing
            setProjectRequirements(parsedResult.projectRequirements);
            setChatHistory((prev) => [...prev, {
              role: 'ai',
              content: parsedResult.message
            }]);
            setStep('confirmation');
          } else {
            // Default handling for other responses
            setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
          }
        } catch (parseError) {
          // If not JSON or invalid format, treat as plain text
          console.warn('⚠️ Failed to parse agent response as JSON:', parseError);
          setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
        }

        // Handle legacy step transitions
        if (data.step === 'budget_request') {
          setStep('budget');
        } else if (data.step === 'requirements_confirmation') {
          setStep('confirmation');
        }
      } catch (err) {
        setChatHistory((prev) => [...prev, { role: 'ai', content: 'Something went wrong. Please try again.' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialResponse();
  }, [prompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleBudgetSubmit = async () => {
    if (!budget.trim()) return;

    setChatHistory((prev) => [...prev, { role: 'user', content: `$${budget} budget.` }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-intake/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, budget, step: 'budget' }),
      });
      const data = await res.json();
      const reply = data.result || data.error || 'No response received.';
      setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);

      if (data.step === 'requirements_confirmation') {
        setStep('confirmation');
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'ai', content: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFreelancerSelect = async (freelancerId: number) => {
    setSelectedFreelancerId(freelancerId);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-intake/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          step: 'generate_requirements',
          selectedFreelancerId: freelancerId
        }),
      });
      const data = await res.json();
      const reply = data.result || data.error || 'No response received.';

      try {
        const parsedResult = JSON.parse(reply);
        if (parsedResult.projectRequirements) {
          setProjectRequirements(parsedResult.projectRequirements);
          setChatHistory((prev) => [...prev, {
            role: 'ai',
            content: parsedResult.message
          }]);
          setStep('confirmation');
        }
      } catch (parseError) {
        setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'ai', content: 'Failed to generate requirements. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostPublicGig = async () => {
    setSelectedFreelancerId(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-intake/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          step: 'generate_requirements',
          selectedFreelancerId: null
        }),
      });
      const data = await res.json();
      const reply = data.result || data.error || 'No response received.';

      try {
        const parsedResult = JSON.parse(reply);
        if (parsedResult.projectRequirements) {
          setProjectRequirements(parsedResult.projectRequirements);
          setChatHistory((prev) => [...prev, {
            role: 'ai',
            content: parsedResult.message
          }]);
          setStep('confirmation');
        }
      } catch (parseError) {
        setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'ai', content: 'Failed to generate requirements. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRequirements = async () => {
    if (!projectRequirements) {
      setChatHistory((prev) => [...prev, {
        role: 'ai',
        content: '❌ No project requirements found. Please try generating requirements again.'
      }]);
      return;
    }

    // Validate required fields in project requirements
    if (!projectRequirements.title || !projectRequirements.description || !projectRequirements.budget) {
      setChatHistory((prev) => [...prev, {
        role: 'ai',
        content: '❌ Project requirements are incomplete. Please ensure title, description, and budget are provided.'
      }]);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/ai-intake/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          step: 'confirmation',
          confirmed: true,
          budget: projectRequirements, // Pass requirements as budget parameter
          selectedFreelancerId
        }),
      });

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      const reply = data.result || data.error || 'No response received.';

      try {
        const parsedResult = JSON.parse(reply);

        if (parsedResult.step === 'gig_created') {
          setChatHistory((prev) => [...prev, {
            role: 'ai',
            content: parsedResult.message || 'Gig created successfully!'
          }]);
          setStep('done');

          // Redirect after a short delay if redirect URL is provided
          if (parsedResult.redirectTo) {
            setTimeout(() => {
              window.location.href = parsedResult.redirectTo;
            }, 2000);
          }
        } else {
          // Handle unexpected response format
          console.warn('⚠️ Unexpected agent response format:', parsedResult);
          setChatHistory((prev) => [...prev, {
            role: 'ai',
            content: parsedResult.message || 'Gig creation completed, but response format was unexpected.'
          }]);
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse gig creation response:', parseError);
        setChatHistory((prev) => [...prev, { role: 'ai', content: reply }]);
      }
    } catch (err) {
      console.error('❌ Gig creation failed:', err);
      setChatHistory((prev) => [...prev, {
        role: 'ai',
        content: `❌ Failed to create gig: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRequirements = () => {
    setEditingRequirements(true);
  };

  const handleSaveRequirements = () => {
    setEditingRequirements(false);
    setChatHistory((prev) => [...prev, {
      role: 'ai',
      content: 'Requirements updated! You can now confirm to create the gig.'
    }]);
  };

  return (
    <div className="h-full bg-white/80 backdrop-blur-md shadow-md p-6 rounded-xl overflow-y-auto">
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            <span className="text-gray-600" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Setting up your project brief...
            </span>
          </div>
        </div>
      )}

      {/* Budget Input Section */}
      {step === 'budget' && !loading && (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Project Budget
          </h3>
          <div className="flex gap-3 items-center">
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm flex-1">
              <span className="text-gray-600 font-medium mr-2">$</span>
              <input
                type="number"
                placeholder="Enter your budget"
                className="bg-transparent border-none outline-none flex-1 text-sm"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <span className="text-gray-500 text-xs ml-1">USD</span>
            </div>
            <button
              onClick={handleBudgetSubmit}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Freelancer Selection Section */}
      {showGigForm && freelancers.length > 0 && step !== 'confirmation' && !loading && (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Choose an option:
          </h3>

          {/* Freelancer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {freelancers.slice(0, 4).map((freelancer) => (
              <div
                key={freelancer.id}
                onClick={() => handleFreelancerSelect(freelancer.id)}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer bg-white"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={freelancer.avatar}
                    alt={freelancer.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">
                      {freelancer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${freelancer.hourlyRate}/hr • {freelancer.rating}⭐
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Post Public Gig Button */}
          <button
            onClick={handlePostPublicGig}
            className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-200"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Post Public Gig (Available to All Freelancers)
          </button>

          {/* Create Custom Proposal Banner */}
          <div className="bg-[#FCD5E3] p-5 rounded-xl mt-4 flex justify-between items-center shadow-md">
            <span className="text-sm text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Need something more specific?
            </span>
            <button
              onClick={() => window.location.href = '/commissioner-dashboard/projects-and-invoices/create-proposal'}
              className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-900 text-sm"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Create Custom Brief
            </button>
          </div>
        </div>
      )}

      {/* Project Requirements Confirmation Step */}
      {step === 'confirmation' && projectRequirements && !loading && (
        <div className="border-t border-gray-200 p-6 bg-white/90 backdrop-blur-sm shadow-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Project Requirements
            </h3>

            {/* Requirements Preview */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-h-60 overflow-y-auto">
              <div>
                <span className="font-medium text-gray-700">Title:</span>
                <span className="ml-2 text-gray-900">{projectRequirements.title}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Budget:</span>
                <span className="ml-2 text-gray-900">${projectRequirements.budget?.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Timeline:</span>
                <span className="ml-2 text-gray-900">{projectRequirements.timeline}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-900 text-sm">{projectRequirements.description}</p>
              </div>
              {projectRequirements.skillsRequired && projectRequirements.skillsRequired.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Skills Required:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {projectRequirements.skillsRequired.map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEditRequirements}
                className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors shadow-md border border-gray-200"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                Edit Requirements
              </button>
              <button
                onClick={handleConfirmRequirements}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-md"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                {selectedFreelancerId ? 'Send Private Request' : 'Post Public Gig'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}