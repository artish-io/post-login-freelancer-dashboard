'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import IntakeToggle from './intake-toggle';

type IntakeMode = 'building' | 'executing';

interface SmartIntakePromptProps {
  mode: IntakeMode;
  onModeChange: (mode: IntakeMode) => void;
}

export default function SmartIntakePrompt({ mode, onModeChange }: SmartIntakePromptProps) {
  const { data: session } = useSession();
  const [input, setInput] = useState('');

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

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const encodedPrompt = encodeURIComponent(input);

    // Check if user is logged in
    if (!session?.user) {
      // Redirect to login with worksheet redirect
      window.location.href = `/auth/login?redirect=/app/worksheet&prompt=${encodedPrompt}`;
      return;
    }

    // Always route to worksheet - let it handle the AI agent routing and task flow
    window.location.href = `/app/worksheet?prompt=${encodedPrompt}`;
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
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
              disabled={!input}
            >
              Search
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
        </div>
      </div>
    </div>
  );
}