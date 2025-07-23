'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeft, CreditCard, Building, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { Fragment, useEffect, useState } from 'react';

type PaymentMethod = {
  id: number;
  type: 'credit_card';
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
};

type WithdrawalMethod = {
  id: number;
  type: 'bank_transfer' | 'paypal';
  bankName?: string;
  accountLast4?: string;
  email?: string;
  holderName?: string;
  isDefault: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  type: 'payment' | 'withdrawal';
};

export default function PaymentSettingsModal({ isOpen, onClose, type }: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/commissioner-dashboard/payments/settings');
      const data = await res.json();
      setPaymentMethods(data.paymentMethods || []);
      setWithdrawalMethods(data.withdrawalMethods || []);
    } catch (error) {
      console.error('Failed to load payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand: string) => {
    // For now, use CreditCard icon for all brands
    // In production, you would use actual brand logos
    return <CreditCard className="w-8 h-8 text-gray-600" />;
  };

  const formatCardNumber = (last4: string) => `•••• •••• •••• ${last4}`;

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const renderPaymentMethods = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment Methods</h3>
      <p className="text-sm text-gray-600 mb-4">
        Manage credit cards used for paying freelancers
      </p>
      
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No payment methods found</p>
          <button className="mt-4 bg-black text-white px-4 py-2 rounded-lg text-sm">
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              {getCardIcon(method.brand)}
              <div className="flex-1">
                <div className="font-medium">
                  {formatCardNumber(method.last4)}
                </div>
                <div className="text-sm text-gray-500">
                  Expires {formatExpiry(method.expiryMonth, method.expiryYear)}
                </div>
              </div>
              {method.isDefault && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </div>
          ))}
          <button className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition">
            + Add New Payment Method
          </button>
        </div>
      )}
    </div>
  );

  const renderWithdrawalMethods = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Withdrawal Methods</h3>
      <p className="text-sm text-gray-600 mb-4">
        Manage accounts for receiving earnings from digital sales
      </p>
      
      {withdrawalMethods.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No withdrawal methods found</p>
          <button className="mt-4 bg-black text-white px-4 py-2 rounded-lg text-sm">
            Add Withdrawal Method
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawalMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              {method.type === 'bank_transfer' ? (
                <Building className="w-8 h-8 text-gray-600" />
              ) : (
                <Image
                  src="/icons/paypal-logo.png"
                  alt="PayPal"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              )}
              <div className="flex-1">
                {method.type === 'bank_transfer' ? (
                  <>
                    <div className="font-medium">{method.bankName}</div>
                    <div className="text-sm text-gray-500">
                      •••• •••• •••• {method.accountLast4}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-500">{method.email}</div>
                  </>
                )}
              </div>
              {method.isDefault && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </div>
          ))}
          <button className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition">
            + Add New Withdrawal Method
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <button
                  onClick={onClose}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                  </div>
                ) : (
                  <>
                    {type === 'payment' ? renderPaymentMethods() : renderWithdrawalMethods()}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
