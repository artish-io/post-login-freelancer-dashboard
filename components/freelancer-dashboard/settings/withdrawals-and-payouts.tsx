'use client';

import { useState } from 'react';
import { Edit2, Building2 } from 'lucide-react';
import ChooseWithdrawalMethodModal from '../wallet/choose-withdrawal-method-modal';
import {
  PhoneVerificationModal,
  PayPalInfoModal,
  BankAddressModal,
  BankInfoModal
} from './edit-payment';

interface PaymentMethod {
  id: string;
  type: 'bank' | 'paypal';
  name: string;
  details: string;
  isDefault: boolean;
}

export default function WithdrawalsAndPayouts() {
  const [showChooseMethodModal, setShowChooseMethodModal] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [showPayPalInfoModal, setShowPayPalInfoModal] = useState(false);
  const [showBankAddressModal, setShowBankAddressModal] = useState(false);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bank_transfer' | 'paypal' | null>(null);
  const [userCountry] = useState('United States'); // This should come from account settings
  const [addressData, setAddressData] = useState<any>(null);
  const [, setEditingPaymentMethod] = useState<string | null>(null);

  // Mock payment methods - in real app this would come from API
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'bank',
      name: 'FIRST BANK OF NIGERIA',
      details: '1234XXXXXX',
      isDefault: true
    }
  ]);

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
    setPaymentMethods(prev => [...prev, newMethod]);
    // Close all modals
    setShowPayPalInfoModal(false);
    setShowBankInfoModal(false);
    setSelectedMethod(null);
    setAddressData(null);
    setEditingPaymentMethod(null);
  };

  const handleEditPaymentMethod = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method?.type === 'bank') {
      setEditingPaymentMethod(methodId);
      setSelectedMethod('bank_transfer');
      setShowPhoneVerificationModal(true);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold mb-2">Withdrawals & Payouts</h1>
        <p className="text-sm lg:text-base text-gray-600">Manage your withdrawal methods and payout preferences</p>
      </div>

      {/* Add Method of Withdrawal Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 lg:p-6 shadow-sm">
        <h2 className="text-lg lg:text-xl font-semibold mb-2">Add method of withdrawal</h2>
        <p className="text-sm lg:text-base text-gray-600 mb-4">
          Edit your payout method or add a secondary method of withdrawal via Bank Transfer or PayPal
        </p>
        <button
          onClick={() => setShowChooseMethodModal(true)}
          className="bg-black text-white px-4 lg:px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition text-sm lg:text-base w-full lg:w-auto"
        >
          Get Started
        </button>
      </div>

      {/* Existing Payment Methods */}
      {paymentMethods.length > 0 && (
        <div className="space-y-3 lg:space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="bg-white border border-gray-200 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="flex items-start lg:items-center justify-between gap-3">
                <div className="flex items-start lg:items-center gap-3 lg:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base lg:text-lg">
                      {method.type === 'bank' ? 'Edit bank information' : 'Edit PayPal information'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs lg:text-sm text-gray-600">Payouts Account</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />
                        <span className="font-medium text-sm lg:text-base truncate">{method.name}</span>
                      </div>
                      <div className="flex items-center gap-2 lg:ml-0">
                        <span className="text-gray-600 text-sm lg:text-base">{method.details}</span>
                        {method.isDefault && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                            DEFAULT ACCOUNT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEditPaymentMethod(method.id)}
                  className="p-2 hover:bg-gray-50 rounded-lg transition flex-shrink-0"
                >
                  <Edit2 className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ChooseWithdrawalMethodModal
        isOpen={showChooseMethodModal}
        onClose={() => setShowChooseMethodModal(false)}
        onSelect={handleMethodSelect}
      />

      <PhoneVerificationModal
        isOpen={showPhoneVerificationModal}
        onClose={() => {
          setShowPhoneVerificationModal(false);
          setSelectedMethod(null);
          setEditingPaymentMethod(null);
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
    </div>
  );
}