'use client';

import TopNavbar from '../../../components/freelancer-dashboard/top-navbar';

export default function FreelancerDashboardPage() {
  return (
    <main className="min-h-screen flex bg-white">
      {/* Sidebar placeholder */}
      <aside className="w-60 hidden md:block bg-gray-100 h-screen">
        <div className="p-4 font-semibold">Sidebar</div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 bg-gray-50">
        <header className="sticky top-0 z-50 bg-white shadow">
          <TopNavbar />
        </header>

        {/* Placeholder content */}
        <section className="p-6">
          <h1 className="text-xl font-bold mb-4">Freelancer Dashboard</h1>
          <p className="text-gray-600">Dashboard widgets coming soon...</p>
        </section>
      </div>
    </main>
  );
}