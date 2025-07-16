'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import TopNavbar from '../../../components/commissioner-dashboard/top-navbar';
import CommissionerSidebar from '../../../components/commissioner-dashboard/commissioner-sidebar';

export default function CommissionerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if current page is messages to remove padding for full-width layout
  const isMessagesPage = pathname === '/commissioner-dashboard/messages';

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login-commissioner');
      return;
    }

    // Optional: Check if user is actually a commissioner
    // if (session.user.userType !== 'commissioner') {
    //   router.push('/login-commissioner');
    //   return;
    // }
  }, [session, status, router]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ overflow: 'hidden', maxWidth: '100vw' }}>
      {/* Top Navbar - fixed at top, stretches full width */}
      <TopNavbar
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={handleMobileMenuToggle}
      />

      {/* Content Area with Sidebar - starts below fixed navbar */}
      <div className="pt-20 flex" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
        {/* Sidebar */}
        <CommissionerSidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={handleMobileMenuClose}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 lg:ml-60 ${isMessagesPage ? '' : 'py-6'}`}
          style={{ maxWidth: '100%', overflow: 'hidden' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}