'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import TopNavbar from '../../../components/commissioner-dashboard/top-navbar';
import CommissionerSidebar from '../../../components/commissioner-dashboard/commissioner-sidebar';
import AuthGuard from '../../../components/auth/auth-guard';

export default function CommissionerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if current page is messages to remove padding for full-width layout
  const isMessagesPage = pathname === '/commissioner-dashboard/messages';

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <AuthGuard
      redirectTo="/login-commissioner"
      requiredUserType="commissioner"
      allowCrossUserTypeProfiles={true}
    >
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
    </AuthGuard>
  );
}