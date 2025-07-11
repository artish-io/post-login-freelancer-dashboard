'use client';

import { useState } from 'react';
import ChooseWithdrawalMethodModal from './choose-withdrawal-method-modal';

export default function ChangeWithdrawalCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMethodSelect = (method: 'bank_transfer' | 'paypal') => {
    console.log('Selected withdrawal method:', method);
    // Handle the selected method here - could navigate to specific setup page
    // or trigger next step in the flow
  };

  return (
    <>
      <div className="w-full rounded-3xl border border-gray-300 bg-white px-6 py-8 shadow-sm">
        <h3 className="text-2xl font-extrabold text-black mb-2">
          Change method of withdrawal
        </h3>
        <p className="text-base text-gray-600 mb-6 max-w-md">
          Edit your payout method or add a secondary method of withdrawal via Bank Transfer or PayPal
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition"
        >
          Get Started
        </button>
      </div>

      <ChooseWithdrawalMethodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleMethodSelect}
      />
    </>
  );
}