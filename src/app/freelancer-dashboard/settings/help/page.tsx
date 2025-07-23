'use client';

import SettingsSidebarNav from '../../../../../components/freelancer-dashboard/settings/settings-sidebar-nav';
import ContactHelp from '../../../../../components/freelancer-dashboard/settings/contact-help';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        <aside className="w-full lg:w-1/4 lg:max-w-xs">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <SettingsSidebarNav />
          </div>
        </aside>
        <main className="w-full lg:w-3/4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <ContactHelp />
          </div>
        </main>
      </div>
    </div>
  );
}
