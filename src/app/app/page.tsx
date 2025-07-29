'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartIntakePrompt from '../../../components/new-landing/smart-intake-prompt';
import Navbar1 from '../../../components/navbar1';
import FreelancerTopNavbar from '../../../components/freelancer-dashboard/top-navbar';
import CommissionerTopNavbar from '../../../components/commissioner-dashboard/top-navbar';
import Footer from '../../../components/footer';

type IntakeMode = 'building' | 'executing';

export default function Home() {
  const [mode, setMode] = useState<IntakeMode>('building');
  const { data: session } = useSession();

  // Debug mode changes
  const handleModeChange = (newMode: IntakeMode) => {
    console.log('Mode changing from', mode, 'to', newMode);
    setMode(newMode);
  };

  // Simple background path without hydration issues
  const backgroundImagePath = `/images/pages/${mode === 'building' ? 'commisioners' : 'freelancers'}.png`;

  // Debug the path
  console.log('Current mode:', mode);
  console.log('Background image path:', backgroundImagePath);

  // Determine which navbar to show based on session
  const renderNavbar = () => {
    if (!session) {
      return <Navbar1 />;
    }

    const userType = (session.user as any)?.userType;
    if (userType === 'freelancer') {
      return <FreelancerTopNavbar />;
    } else if (userType === 'commissioner') {
      return <CommissionerTopNavbar />;
    }

    // Fallback to default navbar
    return <Navbar1 />;
  };



  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={backgroundImagePath}
          src={backgroundImagePath}
          alt="Background"
          className="fixed inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onLoad={() => console.log('✅ Background image loaded successfully:', backgroundImagePath)}
          onError={(e) => {
            console.error('❌ Background image failed to load:', backgroundImagePath);
            console.error('Error details:', e);
          }}
        />
      </AnimatePresence>



      {/* Content Layer */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Navbar with backdrop */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
          {renderNavbar()}
        </header>

        {/* Main Content */}
        <main className="h-screen flex items-center justify-center px-6 md:px-12 -mt-16">
          <SmartIntakePrompt mode={mode} onModeChange={handleModeChange} />
        </main>

        {/* Spacer to push footer down */}
        <div className="h-32"></div>

        {/* Footer with backdrop */}
        <div className="bg-white/90 backdrop-blur-sm">
          <Footer />
        </div>
      </div>
    </div>
  );
}
