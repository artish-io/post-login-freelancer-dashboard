'use client';

import { useState } from 'react';
import PaymentSettingsModal from './payment-settings-modal';

export default function PaymentSettingsCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payment' | 'withdrawal'>('payment');

  const handleEditPaymentMethod = () => {
    setModalType('payment');
    setIsModalOpen(true);
  };

  const handleEditWithdrawalMethod = () => {
    setModalType('withdrawal');
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="w-full rounded-3xl border border-gray-300 bg-white px-6 py-8 shadow-sm">
        <h3 className="text-2xl font-extrabold text-black mb-2">
          Payment Settings
        </h3>
        <p className="text-base text-gray-600 mb-6 max-w-md">
          Manage your payment methods for commissioning freelancers and withdrawal methods for receiving earnings
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleEditPaymentMethod}
            className="flex-1 bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition"
          >
            Edit Payment Method
          </button>
          
          <button
            onClick={handleEditWithdrawalMethod}
            className="flex-1 border border-gray-300 text-gray-900 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Edit Withdrawal Method
          </button>
        </div>
      </div>

      <PaymentSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
      />
    </>
  );
}
