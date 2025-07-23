'use client';

import { useState } from 'react';
import ChooseWithdrawalMethodModal from './choose-withdrawal-method-modal';
import {
  PhoneVerificationModal,
  PayPalInfoModal,
  BankAddressModal,
  BankInfoModal
} from '../settings/edit-payment';

interface PaymentMethod {
  id: string;
  type: 'bank' | 'paypal';
  name: string;
  details: string;
  isDefault: boolean;
}

export default function ChangeWithdrawalCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [showPayPalInfoModal, setShowPayPalInfoModal] = useState(false);
  const [showBankAddressModal, setShowBankAddressModal] = useState(false);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bank_transfer' | 'paypal' | null>(null);
  const [userCountry] = useState('United States'); // This should come from account settings
  const [addressData, setAddressData] = useState<any>(null);

  const handleMethodSelect = (method: 'bank_transfer' | 'paypal') => {
    setSelectedMethod(method);
    setShowPhoneVerificationModal(true);
  };

  const handlePhoneVerified = () => {
    setShowPhoneVerificationModal(false);

    if (selectedMethod === 'paypal') {
      setShowPayPalInfoModal(true);
    } else if (selectedMethod === 'bank_transfer') {
      setShowBankAddressModal(true);
    }
  };

  const handleAddressSubmitted = (data: any) => {
    setAddressData(data);
    setShowBankAddressModal(false);
    setShowBankInfoModal(true);
  };

  const handlePaymentMethodAdded = (newMethod: PaymentMethod) => {
    console.log('Payment method added:', newMethod);
    // Close all modals
    setShowPayPalInfoModal(false);
    setShowBankInfoModal(false);
    setSelectedMethod(null);
    setAddressData(null);
    // You could add logic here to update the UI or navigate somewhere
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

      <PhoneVerificationModal
        isOpen={showPhoneVerificationModal}
        onClose={() => {
          setShowPhoneVerificationModal(false);
          setSelectedMethod(null);
        }}
        onVerified={handlePhoneVerified}
        userCountry={userCountry}
      />

      <PayPalInfoModal
        isOpen={showPayPalInfoModal}
        onClose={() => {
          setShowPayPalInfoModal(false);
          setSelectedMethod(null);
        }}
        onSubmit={handlePaymentMethodAdded}
      />

      <BankAddressModal
        isOpen={showBankAddressModal}
        onClose={() => {
          setShowBankAddressModal(false);
          setSelectedMethod(null);
        }}
        onSubmit={handleAddressSubmitted}
      />

      <BankInfoModal
        isOpen={showBankInfoModal}
        onClose={() => {
          setShowBankInfoModal(false);
          setSelectedMethod(null);
          setAddressData(null);
        }}
        onSubmit={handlePaymentMethodAdded}
        userCountry={userCountry}
        addressData={addressData}
      />
    </>
  );
}