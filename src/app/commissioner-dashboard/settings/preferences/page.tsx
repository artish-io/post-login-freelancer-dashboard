'use client';

import SettingsLayout from '../../../../../components/shared/settings/settings-layout';
import CommissionerSettingsSidebarNav from '../../../../../components/commissioner-dashboard/settings/commissioner-settings-sidebar-nav';
import CommissionerPreferences from '../../../../../components/commissioner-dashboard/settings/commissioner-preferences';

export default function CommissionerPreferencesPage() {
  return (
    <SettingsLayout
      sidebar={<CommissionerSettingsSidebarNav />}
    >
      <CommissionerPreferences />
    </SettingsLayout>
  );
}