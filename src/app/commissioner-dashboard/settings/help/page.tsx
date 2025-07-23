'use client';

import SettingsLayout from '../../../../../components/shared/settings/settings-layout';
import CommissionerSettingsSidebarNav from '../../../../../components/commissioner-dashboard/settings/commissioner-settings-sidebar-nav';
import ContactHelp from '../../../../../components/freelancer-dashboard/settings/contact-help';

export default function CommissionerHelpPage() {
  return (
    <SettingsLayout
      sidebar={<CommissionerSettingsSidebarNav />}
    >
      <ContactHelp />
    </SettingsLayout>
  );
}
