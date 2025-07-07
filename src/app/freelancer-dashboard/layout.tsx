'use client';

import TopNavbar from '../../../components/freelancer-dashboard/top-navbar';
import FreelancerSidebar from '../../../components/freelancer-dashboard/freelancer-sidebar';
import { useEffect, useState } from 'react';

export default function FreelancerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* DayPicker Custom Overrides (safe to keep for specific class tweaks) */}
      <style jsx global>{`
        .rdp .rdp-day_selected {
          background-color: #FCD5E3 !important;
          color: #eb1966 !important;
          border-radius: 9999px !important;
          border: 2px solid #eb1966 !important;
        }
        .rdp .rdp-day_selected:hover {
          background-color: #eb1966 !important;
          color: #fff !important;
        }
        .rdp .rdp-nav_button,
        .rdp .rdp-nav_button svg {
          color: #000 !important;
          fill: #000 !important;
        }
      `}</style>

      <header className="sticky top-0 z-50 w-full bg-white shadow">
        <TopNavbar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
      </header>

      <div className="flex flex-1">
        {/* Responsive Sidebar */}
        <FreelancerSidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={handleMobileMenuClose}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-50 ml-0 md:ml-16 lg:ml-60">
          {children}
        </div>
      </div>
    </main>
  );
}