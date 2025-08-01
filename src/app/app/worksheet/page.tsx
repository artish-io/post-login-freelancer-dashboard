

// src/app/app/worksheet/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar1 from '../../../../components/navbar1';
import FreelancerTopNavbar from '../../../../components/freelancer-dashboard/top-navbar';
import CommissionerTopNavbar from '../../../../components/commissioner-dashboard/top-navbar';
import AIChatThread from '../../../../components/new-landing/worksheet/ai-chat-thread';
import PromptToGigChat from '../../../../components/new-landing/worksheet/prompt-to-gig-chat';
import PromptToProjectChat from '../../../../components/new-landing/worksheet/prompt-to-project-chat';

export default function WorksheetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = decodeURIComponent(searchParams.get('prompt') || '');
  const [mode, setMode] = useState<'building' | 'executing'>('building');
  useEffect(() => {
    if (status === 'loading') return;

    // If no prompt provided, redirect to homepage
    if (!prompt.trim()) {
      router.push('/app');
      return;
    }

    if (!session?.user) {
      // Not logged in, redirect to login with redirect and prompt
      router.push(`/auth/login?redirect=/app/worksheet&prompt=${encodeURIComponent(prompt)}`);
    } else {
      const userType = (session.user as any)?.userType;
      setMode(userType === 'freelancer' ? 'executing' : 'building');
    }
  }, [session, status, router, prompt]);

  const renderNavbar = () => {
    if (!session) return <Navbar1 />;
    const userType = (session.user as any)?.userType;
    if (userType === 'freelancer') return <FreelancerTopNavbar />;
    if (userType === 'commissioner') return <CommissionerTopNavbar />;
    return <Navbar1 />;
  };

  const backgroundImagePath = `/images/pages/${mode === 'building' ? 'commisioners' : 'freelancers'}.png`;

  // Show loading state while session is being checked
  if (status === 'loading') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <img
          src={backgroundImagePath}
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover z-0"
        />
        <div className="relative z-10 flex flex-col h-screen">
          <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
            {renderNavbar()}
          </header>
          <main className="flex-1 overflow-hidden flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/30">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <span className="ml-3 text-gray-600 text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Loading worksheet...
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Shared Background Image - Fixed behind both panels */}
      <img
        src={backgroundImagePath}
        alt="Background"
        className="fixed inset-0 w-full h-full object-cover z-0"
      />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-screen">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
          {renderNavbar()}
        </header>

        <div className="relative z-10 flex h-screen overflow-hidden">
          {/* Left Panel: AI Chat Thread */}
          <motion.div
            className="min-w-[320px] max-w-[35%] h-full overflow-y-auto"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <AIChatThread
              prompt={prompt}
              userType={(session?.user as any)?.userType}
            />
          </motion.div>

          {/* Right Panel: Worksheet Content */}
          <motion.div
            className="flex-1 h-full"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut', delay: 0.1 }}
          >
            {mode === 'executing' ? (
              <PromptToGigChat prompt={prompt} />
            ) : (
              <PromptToProjectChat prompt={prompt} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}