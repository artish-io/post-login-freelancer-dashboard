'use client';

import { useSearchParams } from 'next/navigation';
import SettingsSidebarNav from '../../../../components/freelancer-dashboard/settings/settings-sidebar-nav';
import AccountSettings from '../../../../components/freelancer-dashboard/settings/account-settings';
import WithdrawalsAndPayouts from '../../../../components/freelancer-dashboard/settings/withdrawals-and-payouts';
import MainSettings from '../../../../components/freelancer-dashboard/settings/main-settings';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'account';

  const renderContent = () => {
    switch (tab) {
      case 'payouts':
        return <WithdrawalsAndPayouts />;
      case 'account':
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Mobile: Show only MainSettings component */}
        <div className="lg:hidden w-full">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <MainSettings />
          </div>
        </div>

        {/* Desktop: Show sidebar + content layout */}
        <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:w-full">
          <aside className="w-1/4 max-w-xs">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <SettingsSidebarNav />
            </div>
          </aside>
          <main className="w-3/4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
