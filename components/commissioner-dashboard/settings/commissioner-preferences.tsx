'use client';

import { useState } from 'react';
import ToggleSwitch from '../../shared/settings/toggle-switch';
import SettingsActionButtons from '../../shared/settings/settings-action-buttons';

export default function CommissionerPreferences() {
  const [openToProposals, setOpenToProposals] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving preferences:', {
      openToProposals,
      marketingEmails
    });
  };

  const handleCancel = () => {
    // TODO: Reset to original values or navigate back
    console.log('Cancelling changes');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Open to proposals toggle */}
      <ToggleSwitch
        enabled={openToProposals}
        onChange={setOpenToProposals}
        label="Open to proposals"
        description="Toggle this setting on to freelancers know you're available to take new proposals."
      />

      {/* Marketing emails toggle */}
      <ToggleSwitch
        enabled={marketingEmails}
        onChange={setMarketingEmails}
        label="Emails"
        description="Receive promotional and marketing emails"
      />

      {/* Action Buttons */}
      <SettingsActionButtons
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
