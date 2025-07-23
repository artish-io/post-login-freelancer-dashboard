

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomDropdown from './custom-dropdown';

export default function AccountSettings() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'English',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h (am/pm)',
    country: 'United States',
    timeZone: 'Central Time - US & Canada',
  });
  const [isLoading, setIsLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState<string>('');

  // Dropdown options
  const languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'French', label: 'French' },
    { value: 'Spanish', label: 'Spanish' },
  ];

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  ];

  const timeFormatOptions = [
    { value: '12h (am/pm)', label: '12h (am/pm)' },
    { value: '24h', label: '24h' },
  ];

  const countryOptions = [
    { value: 'United States', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'United Kingdom', label: 'United Kingdom' },
  ];

  const timeZoneOptions = [
    { value: 'Central Time - US & Canada', label: 'Central Time - US & Canada' },
    { value: 'Eastern Time - US & Canada', label: 'Eastern Time - US & Canada' },
    { value: 'WAT - West Africa Time', label: 'WAT - West Africa Time' },
    { value: 'GMT - Greenwich Mean Time', label: 'GMT - Greenwich Mean Time' },
  ];

  // Fetch user data from session and API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get basic info from session
        const sessionName = session.user.name || '';
        const sessionEmail = session.user.email || '';

        // Try to get additional profile data from API
        const response = await fetch(`/api/user/profile/${session.user.id}`);
        if (response.ok) {
          const profileData = await response.json();

          setFormData(prev => ({
            ...prev,
            name: profileData.name || sessionName,
            email: profileData.email || sessionEmail,
            phone: profileData.phone || prev.phone,
            // Keep existing preferences or use defaults
            language: profileData.language || prev.language,
            dateFormat: profileData.dateFormat || prev.dateFormat,
            timeFormat: profileData.timeFormat || prev.timeFormat,
            country: profileData.country || prev.country,
            timeZone: profileData.timeZone || prev.timeZone,
          }));
        } else {
          // Fallback to session data if API fails
          setFormData(prev => ({
            ...prev,
            name: sessionName,
            email: sessionEmail,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Fallback to session data
        setFormData(prev => ({
          ...prev,
          name: session.user.name || '',
          email: session.user.email || '',
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [session?.user?.id, session?.user?.name, session?.user?.email]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    try {
      // TODO: Implement API endpoint to save user settings
      console.log('Saving user data:', formData);
      // For now, just show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleCancel = () => {
    // Reset form to original values by refetching
    if (session?.user?.id) {
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <div className="space-y-6">
        {/* Name and Email Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name <span className="text-gray-400">ⓘ</span></label>
            <input
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">E-Mail <span className="text-gray-400">ⓘ</span></label>
            <input
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
            />
          </div>
        </div>

        {/* Phone Number Field */}
        <div className="max-w-sm">
          <label className="block text-sm font-medium mb-2">Phone Number <span className="text-gray-400">ⓘ</span></label>
          <div className="flex items-center gap-2">
            <input
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
              value={formData.phone}
              readOnly
            />
            <button
              type="button"
              className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => {
                // TODO: Trigger phone verification modal
                console.log('Edit phone number');
              }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Language Field */}
        <div className="max-w-sm">
          <label className="block text-sm font-medium mb-2">Language</label>
          <CustomDropdown
            options={languageOptions}
            value={formData.language}
            onChange={(value) => handleChange('language', value)}
            placeholder="Select language"
          />
        </div>

        {/* Date Format and Time Format Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Date Format <span className="text-gray-400">ⓘ</span></label>
            <CustomDropdown
              options={dateFormatOptions}
              value={formData.dateFormat}
              onChange={(value) => handleChange('dateFormat', value)}
              placeholder="Select date format"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time Format <span className="text-gray-400">ⓘ</span></label>
            <CustomDropdown
              options={timeFormatOptions}
              value={formData.timeFormat}
              onChange={(value) => handleChange('timeFormat', value)}
              placeholder="Select time format"
            />
          </div>
        </div>

        {/* Country Field */}
        <div className="max-w-sm">
          <label className="block text-sm font-medium mb-2">Country</label>
          <CustomDropdown
            options={countryOptions}
            value={formData.country}
            onChange={(value) => handleChange('country', value)}
            placeholder="Select country"
          />
        </div>

        {/* Time Zone Field */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-1">
            <label className="block text-sm font-medium">Time Zone</label>
            <span className="text-sm text-gray-500">Current Time: {currentTime}</span>
          </div>
          <div className="max-w-md">
            <CustomDropdown
              options={timeZoneOptions}
              value={formData.timeZone}
              onChange={(value) => handleChange('timeZone', value)}
              placeholder="Select time zone"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSave}
          className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={handleCancel}
          className="border border-gray-300 text-gray-700 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Delete Account Button */}
      <div className="mt-16 flex justify-center sm:justify-end">
        <button className="bg-red-600 text-white px-6 py-3 rounded-2xl font-medium hover:bg-red-700 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}