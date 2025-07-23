'use client';

import { useSearchParams } from 'next/navigation';
import SettingsLayout from '../../../../components/shared/settings/settings-layout';
import CommissionerSettingsSidebarNav from '../../../../components/commissioner-dashboard/settings/commissioner-settings-sidebar-nav';
import AccountSettings from '../../../../components/freelancer-dashboard/settings/account-settings';
import CommissionerMainSettings from '../../../../components/commissioner-dashboard/settings/commissioner-main-settings';

export default function CommissionerSettingsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'account';

  const renderContent = () => {
    switch (tab) {
      case 'payments':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Payments and Settlements</h1>
            <p className="text-gray-600">Payment settings coming soon...</p>
          </div>
        );
      case 'account':
      default:
        return <AccountSettings />;
    }
  };

  return (
    <SettingsLayout
      sidebar={<CommissionerSettingsSidebarNav />}
      mobileComponent={<CommissionerMainSettings />}
    >
      {renderContent()}
    </SettingsLayout>
  );
}