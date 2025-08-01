'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import IntakeToggle from './intake-toggle';
import ResultsDropdown from './results-dropdown';

type IntakeMode = 'building' | 'executing';

interface SmartIntakePromptProps {
  mode: IntakeMode;
  onModeChange: (mode: IntakeMode) => void;
}

export default function SmartIntakePrompt({ mode, onModeChange }: SmartIntakePromptProps) {
  const { data: session } = useSession();
  const [input, setInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [step, setStep] = useState<'initial' | 'secondary' | 'confirmation' | 'generate_requirements'>('initial');
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<number | null>(null);
  const [selectedGigId, setSelectedGigId] = useState<number | null>(null);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [editedRequirements, setEditedRequirements] = useState<any>(null);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  const [budgetData, setBudgetData] = useState({
    totalBudget: '',
    paymentSchedule: 'completion' // 'completion' or 'milestone'
  });

  // Auto-detect user type and set appropriate mode
  useEffect(() => {
    if (session?.user) {
      const userType = (session.user as any)?.userType;
      if (userType === 'commissioner' && mode !== 'building') {
        onModeChange('building');
      } else if (userType === 'freelancer' && mode !== 'executing') {
        onModeChange('executing');
      }
    }
  }, [session, mode, onModeChange]);

  // Determine if toggle should be shown (only for non-logged-in users)
  const showToggle = !session?.user;

  const handleSubmit = async (confirmed?: boolean, editedData?: any, budgetInfo?: any) => {
    // For initial prompt submission, redirect to worksheet instead of API call
    if (step === 'initial' && !confirmed && !editedData && !budgetInfo) {
      if (!input.trim()) return;

      const encodedPrompt = encodeURIComponent(input);

      // Check if user is logged in
      if (!session?.user) {
        // Redirect to login with worksheet redirect
        window.location.href = `/auth/login?redirect=/app/worksheet&prompt=${encodedPrompt}`;
        return;
      } else {
        // User is logged in, redirect directly to worksheet
        window.location.href = `/app/worksheet?prompt=${encodedPrompt}`;
        return;
      }
    }

    // For subsequent steps (budget, confirmation, etc.), continue with existing API logic
    setLoading(true);
    setShowResults(true);

    const endpoint =
      mode === 'building' ? '/api/ai-intake/client' : '/api/ai-intake/freelancer';

    const budget = budgetInfo?.totalBudget || budgetData.totalBudget || (step === 'secondary' ? secondaryInput : undefined);

    const body = mode === 'building'
      ? {
          prompt: input,
          budget: budget,
          paymentSchedule: budgetInfo?.paymentSchedule || budgetData.paymentSchedule,
          step: step,
          selectedFreelancerId: selectedFreelancerId,
          editedRequirements: editedData,
          confirmed: confirmed
        }
      : {
          intent: input,
          preferences: step === 'secondary' ? secondaryInput : undefined,
          step: step,
          selectedGigId: selectedGigId,
          createProposal: showCreateProposal
        };

    const res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    const resultData = data.result || data.error;
    setResult(resultData);

    // Try to parse JSON result for structured data
    try {
      const parsed = JSON.parse(resultData);
      setParsedResult(parsed);

      // Handle different step transitions
      if (parsed.step === 'budget_request') {
        setStep('secondary');
      } else if (parsed.step === 'requirements_confirmation') {
        setStep('confirmation');
      } else if (parsed.step === 'gig_created') {
        // Gig has been created successfully
        setLoading(false);

        // Show success message
        alert(parsed.message || 'Gig created successfully!');

        // Redirect to the appropriate page
        if (parsed.redirectTo) {
          window.location.href = parsed.redirectTo;
        }
        return; // Exit early to avoid setting loading to false again
      }
    } catch (e) {
      // If not JSON, treat as plain text
      setParsedResult(null);
    }

    setLoading(false);
  };



  const handleFreelancerSelect = (freelancerId: number | null) => {
    setSelectedFreelancerId(freelancerId);
    setStep('generate_requirements');
  };

  // Use useEffect to trigger API call when step changes to generate_requirements
  useEffect(() => {
    if (step === 'generate_requirements' && selectedFreelancerId !== undefined) {
      handleSubmit();
    }
  }, [step, selectedFreelancerId]);

  const handleConfirmRequirements = () => {
    // Get project requirements from the parsed result
    let projectRequirements = null;
    try {
      const currentResult = JSON.parse(result || '{}');
      projectRequirements = currentResult?.projectRequirements;
    } catch (error) {
      console.error('Failed to parse project requirements:', error);
    }

    // Submit with project requirements as budget parameter (API expects it there)
    handleSubmit(true, null, projectRequirements);
  };

  const handleBudgetSubmit = () => {
    // Now submit with budget data
    handleSubmit(true, null, budgetData);
    setShowBudgetPrompt(false);
  };

  const handleEditRequirements = () => {
    setEditingRequirements(true);
    // Parse the current result to get project requirements
    try {
      const currentResult = JSON.parse(result || '{}');
      setEditedRequirements(currentResult?.projectRequirements);
    } catch (error) {
      console.error('Failed to parse current result for editing:', error);
    }
  };

  const handleSaveEdits = () => {
    setEditingRequirements(false);
    handleSubmit(true, editedRequirements);
  };

  const handleGigSelect = (gigId: number) => {
    setSelectedGigId(gigId);
    // Trigger auto-generation for this specific gig
    handleSubmit();
  };

  const handleCreateProposal = () => {
    setShowCreateProposal(true);
    // Trigger commissioner search and proposal generation
    handleSubmit();
  };

  const handleApplyForGig = () => {
    // Navigate to the apply page for the selected gig
    if (selectedGigId) {
      window.location.href = `/freelancer-dashboard/gigs/${selectedGigId}/apply`;
    } else {
      console.error('No gig selected for application');
    }
  };

  const handleShowOtherGigs = () => {
    // Reset to show other gigs
    setSelectedGigId(null);
    setShowCreateProposal(false);
    // Go back to opportunities list
    handleSubmit();
  };

  return (
    <div className="w-full max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
      {/* Prompt Box */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30 relative z-10">
        {/* Heading */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            For builders and creators.
          </h1>
          <p className="text-sm font-light text-gray-600">
            Start something bold. Find work worth doing.
          </p>
        </div>
        {/* Centered Toggle - only show for non-logged-in users */}
        {showToggle && (
          <div className="flex justify-center mb-4">
            <IntakeToggle mode={mode} onChange={onModeChange} />
          </div>
        )}

        {/* Main Input */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              className="w-full p-3 pr-20 border-2 border-black rounded-xl text-sm placeholder-gray-500 focus:border-black focus:outline-none resize-none transition-all bg-gradient-to-r from-white to-gray-50"
              rows={2}
              placeholder={
                mode === 'building'
                  ? 'What are you trying to build?'
                  : 'What kind of work are you looking for?'
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Reset conversation state when user modifies input
                if (e.target.value !== input) {
                  setStep('initial');
                  setShowResults(false);
                  setResult(null);
                  setParsedResult(null);
                  setSelectedFreelancerId(null);
                  setSelectedGigId(null);
                  setEditingRequirements(false);
                  setEditedRequirements(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !loading) {
                    handleSubmit();
                  }
                }
              }}
              disabled={false}
            />
            {/* Embedded Submit Button */}
            <button
              className="absolute bottom-2 right-2 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSubmit()}
              disabled={loading || !input}
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {/* Budget Input - Always show for commissioners */}
          {mode === 'building' && (
            <div className="mt-4">
              <div className="flex items-center gap-2 max-w-xs">
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600 font-medium mr-2">$</span>
                  <input
                    type="number"
                    placeholder="Budget"
                    className="bg-transparent border-none outline-none w-24 text-sm"
                    value={budgetData.totalBudget}
                    onChange={(e) => setBudgetData({...budgetData, totalBudget: e.target.value})}
                  />
                  <span className="text-gray-500 text-xs ml-1">USD</span>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Input - Budget only (for commissioners) */}
          {step === 'secondary' && parsedResult && mode === 'building' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 mb-3">{parsedResult.message}</p>

                {/* Show categories/tools for selection */}
                {parsedResult.categories && parsedResult.categories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Relevant Categories:</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.categories.map((category: any, index: number) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {typeof category === 'string' ? category : category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedResult.tools && parsedResult.tools.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Tools:</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.tools.map((tool: any, index: number) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {typeof tool === 'string' ? tool : tool.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  className="w-full p-3 pr-20 border-2 border-black rounded-xl text-sm placeholder-gray-500 focus:border-black focus:outline-none resize-none transition-all bg-gradient-to-r from-white to-gray-50"
                  rows={2}
                  placeholder={
                    mode === 'building'
                      ? 'What\'s your budget range? (e.g., $5,000 - $10,000)'
                      : 'Which of these categories/tools seem interesting to you?'
                  }
                  value={secondaryInput}
                  onChange={(e) => setSecondaryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (secondaryInput.trim() && !loading) {
                        handleSubmit();
                      }
                    }
                  }}
                />
                <button
                  className="absolute bottom-2 right-2 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSubmit()}
                  disabled={loading || !secondaryInput}
                >
                  {loading ? '...' : 'Find'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {loading && showResults && (
        <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30 relative z-10">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            <span className="ml-2 text-gray-600 text-sm">Finding matches...</span>
          </div>
        </div>
      )}

      {/* Budget Prompt Modal */}
      {showBudgetPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set Your Budget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget (USD)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  value={budgetData.totalBudget}
                  onChange={(e) => setBudgetData({...budgetData, totalBudget: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Schedule
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentSchedule"
                      value="completion"
                      checked={budgetData.paymentSchedule === 'completion'}
                      onChange={(e) => setBudgetData({...budgetData, paymentSchedule: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-sm">Pay on Completion</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentSchedule"
                      value="milestone"
                      checked={budgetData.paymentSchedule === 'milestone'}
                      onChange={(e) => setBudgetData({...budgetData, paymentSchedule: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-sm">Milestone-based</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBudgetSubmit}
                disabled={!budgetData.totalBudget}
                className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                onClick={() => setShowBudgetPrompt(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      <div className="relative z-10">
        <ResultsDropdown
          results={result || ''}
          isVisible={showResults && !loading && !!result && !showBudgetPrompt}
          mode={mode}
          onFreelancerSelect={handleFreelancerSelect}
          onConfirmRequirements={handleConfirmRequirements}
          onEditRequirements={handleEditRequirements}
          onSaveEdits={handleSaveEdits}
          onGigSelect={handleGigSelect}
          onCreateProposal={handleCreateProposal}
          onApplyForGig={handleApplyForGig}
          onShowOtherGigs={handleShowOtherGigs}
          editingRequirements={editingRequirements}
          editedRequirements={editedRequirements}
          onRequirementsChange={setEditedRequirements}
        />
      </div>
    </div>
  );
}