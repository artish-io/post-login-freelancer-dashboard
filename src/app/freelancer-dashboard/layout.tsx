// src/app/freelancer-dashboard/layout.tsx
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
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Global Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white shadow">
        <TopNavbar />
      </header>

      {/* Sidebar + Content Layout */}
      <div className="flex flex-1">
        {/* Sidebar: Sticky below TopNavbar */}
        <aside className="hidden md:block fixed top-[80px] left-0 h-[calc(100vh-80px)] w-60 z-40">
          <FreelancerSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-50 ml-0 md:ml-60">{children}</div>
      </div>
    </main>
  );
}