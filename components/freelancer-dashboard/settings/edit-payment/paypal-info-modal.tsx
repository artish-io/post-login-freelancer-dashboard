'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeft } from 'lucide-react';
import { Fragment, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentMethod: any) => void;
};

export default function PayPalInfoModal({
  isOpen,
  onClose,
  onSubmit,
}: Props) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.email && formData.name) {
      const newPaymentMethod = {
        id: Date.now().toString(),
        type: 'paypal' as const,
        name: 'PayPal',
        details: formData.email,
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

                <Dialog.Title className="text-xl font-bold mb-6">
                  Provide PayPal details
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="PayPal email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Name on account"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!formData.email || !formData.name}
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
