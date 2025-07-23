'use client';

import { useState } from 'react';

export default function ContactHelp() {
  const [isReadingFAQ, setIsReadingFAQ] = useState(false);
  const [isContactingSupport, setIsContactingSupport] = useState(false);

  const handleReadFAQ = () => {
    setIsReadingFAQ(true);
    // Simulate loading and then navigate to FAQ
    setTimeout(() => {
      setIsReadingFAQ(false);
      // In a real implementation, you would navigate to FAQ page
      // window.location.href = '/faq';
      // or use Next.js router: router.push('/faq');
      console.log('Navigating to FAQ page...');
    }, 500);
  };

  const handleContactUs = () => {
    setIsContactingSupport(true);
    // Simulate loading and then open contact form
    setTimeout(() => {
      setIsContactingSupport(false);
      // In a real implementation, you would open contact form or navigate to support
      // window.location.href = '/contact';
      // or open a modal: setShowContactModal(true);
      console.log('Opening contact form...');
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Learn more about ARTISH mission */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Learn more about the ARTISH mission
        </h3>
        <button
          onClick={handleReadFAQ}
          disabled={isReadingFAQ}
          className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReadingFAQ ? 'Loading...' : 'Read our FAQ'}
        </button>
      </div>

      {/* Contact support team */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Still need help? Contact our support team:
        </h3>
        <button
          onClick={handleContactUs}
          disabled={isContactingSupport}
          className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isContactingSupport ? 'Loading...' : 'Contact Us'}
        </button>
      </div>
    </div>
  );
}