'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronRight, User, CreditCard, HelpCircle, LogOut } from 'lucide-react';
import AccountSettings from './account-settings';
import WithdrawalsAndPayouts from './withdrawals-and-payouts';

type SettingsPage = 'main' | 'account' | 'payouts' | 'preferences' | 'help';

interface SettingsOption {
  id: SettingsPage;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

export default function MainSettings() {
  const [currentPage, setCurrentPage] = useState<SettingsPage>('main');

  const settingsOptions: SettingsOption[] = [
    {
      id: 'account',
      label: 'Account',
      icon: <User className="w-5 h-5" />,
      description: 'Personal information and preferences'
    },
    {
      id: 'payouts',
      label: 'Withdrawals & Payouts',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Manage payment methods and withdrawals'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: <User className="w-5 h-5" />,
      description: 'App preferences and notifications'
    },
    {
      id: 'help',
      label: 'Help',
      icon: <HelpCircle className="w-5 h-5" />,
      description: 'Support and documentation'
    }
  ];

  const handleNavigate = (page: SettingsPage) => {
    setCurrentPage(page);
  };

  const handleBack = () => {
    setCurrentPage('main');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'account':
        return <AccountSettings />;
      case 'payouts':
        return <WithdrawalsAndPayouts />;
      case 'preferences':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Preferences</h1>
            <p className="text-gray-600">Preferences settings coming soon...</p>
          </div>
        );
      case 'help':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Help</h1>
            <p className="text-gray-600">Help and support coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (currentPage !== 'main') {
    return (
      <div className="space-y-6">
        {/* Mobile Back Button - Sticky header style */}
        <div className="lg:hidden sticky top-0 bg-white z-10 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Settings</span>
          </button>
        </div>

        {/* Desktop Back Button - Hidden on mobile */}
        <div className="hidden lg:block">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Settings</span>
          </button>
        </div>

        {/* Page Content */}
        <div className="lg:mt-0 mt-4">
          {renderCurrentPage()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* Settings Options */}
      <div className="space-y-2">
        {settingsOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleNavigate(option.id)}
            className="w-full flex items-center justify-between px-4 py-5 lg:p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-all group active:scale-[0.98] lg:active:scale-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 lg:w-10 lg:h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 group-hover:bg-gray-200 transition-colors">
                {option.icon}
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">{option.label}</h3>
                {option.description && (
                  <p className="text-sm text-gray-500 mt-1 hidden lg:block">{option.description}</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        ))}

        {/* Logout Option */}
        <button className="w-full flex items-center justify-between px-4 py-5 lg:p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-all group hover:bg-red-50 hover:border-red-200 active:scale-[0.98] lg:active:scale-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 lg:w-10 lg:h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">Logout</h3>
              <p className="text-sm text-gray-500 mt-1 hidden lg:block">Sign out of your account</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    </div>
  );
}
