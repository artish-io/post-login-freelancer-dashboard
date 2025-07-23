'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Fragment, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentMethod: any) => void;
  userCountry: string;
  addressData: any;
};

export default function BankInfoModal({
  isOpen,
  onClose,
  onSubmit,
  userCountry,
  addressData,
}: Props) {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    swiftCode: '',
    bicCode: '',
    sortCode: '',
    routingNumber: '',
    ifscCode: '',
  });

  const supportedCountries = ['Nigeria', 'Canada', 'United States', 'United Kingdom', 'India'];
  const isSupported = supportedCountries.includes(userCountry);

  const nigerianBanks = [
    'Access Bank',
    'First Bank of Nigeria',
    'Guaranty Trust Bank',
    'United Bank for Africa',
    'Zenith Bank',
    'Fidelity Bank',
    'Union Bank',
    'Sterling Bank',
    'Stanbic IBTC Bank',
    'Ecobank Nigeria',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.accountNumber && formData.confirmAccountNumber && 
        formData.accountNumber === formData.confirmAccountNumber) {
      
      let bankDetails = '';
      if (userCountry === 'Nigeria') {
        bankDetails = `${formData.bankName} - ${formData.accountNumber}`;
      } else if (userCountry === 'United Kingdom') {
        bankDetails = `${formData.bankName} - Sort: ${formData.sortCode}`;
      } else if (['United States', 'Canada'].includes(userCountry)) {
        bankDetails = `${formData.bankName} - Routing: ${formData.routingNumber}`;
      } else if (userCountry === 'India') {
        bankDetails = `${formData.bankName} - IFSC: ${formData.ifscCode}`;
      } else {
        bankDetails = `${formData.bankName} - SWIFT: ${formData.swiftCode}`;
      }

      const newPaymentMethod = {
        id: Date.now().toString(),
        type: 'bank' as const,
        name: formData.bankName,
        details: formData.accountNumber.slice(-4).padStart(10, 'X'),
        isDefault: false,
      };
      
      onSubmit(newPaymentMethod);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderCountrySpecificFields = () => {
    if (!isSupported) {
      return (
        <>
          <div>
            <input
              type="text"
              placeholder="SWIFT/BIC Code"
              value={formData.swiftCode}
              onChange={(e) => handleChange('swiftCode', e.target.value)}
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>
        </>
      );
    }

    switch (userCountry) {
      case 'Nigeria':
        return (
          <div className="relative">
            <select
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-2xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            >
              <option value="">Bank name</option>
              {nigerianBanks.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );

      case 'United Kingdom':
        return (
          <>
            <div>
              <input
                type="text"
                placeholder="Bank name"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Sort Code"
                value={formData.sortCode}
                onChange={(e) => handleChange('sortCode', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
          </>
        );

      case 'United States':
      case 'Canada':
        return (
          <>
            <div>
              <input
                type="text"
                placeholder="Bank name"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Routing Number"
                value={formData.routingNumber}
                onChange={(e) => handleChange('routingNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
          </>
        );

      case 'India':
        return (
          <>
            <div>
              <input
                type="text"
                placeholder="Bank name"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="IFSC Code"
                value={formData.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
          </>
        );

      default:
        return (
          <div>
            <input
              type="text"
              placeholder="Bank name"
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>
        );
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white p-6 md:p-8 text-left shadow-xl transition-all w-full max-w-md">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 flex items-center mb-6 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>

                <Dialog.Title className="text-xl font-bold mb-2">
                  {isSupported ? 'Select financial institution' : 'Provide bank details'}
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {renderCountrySpecificFields()}

                  <div>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange('accountNumber', e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm Account Number</label>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={formData.confirmAccountNumber}
                      onChange={(e) => handleChange('confirmAccountNumber', e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!formData.accountNumber || !formData.confirmAccountNumber || 
                             formData.accountNumber !== formData.confirmAccountNumber}
                    className="w-full bg-black text-white py-3 rounded-2xl font-medium hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
                  >
                    Confirm
                  </button>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
