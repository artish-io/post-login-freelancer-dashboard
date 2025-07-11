'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Fragment } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: 'bank_transfer' | 'paypal') => void;
};

export default function ChooseWithdrawalMethodModal({
  isOpen,
  onClose,
  onSelect,
}: Props) {
  const handleSelect = (method: 'bank_transfer' | 'paypal') => {
    onSelect(method);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background overlay with minimal blur */}
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
            {/* Modal panel with slide-up animation */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white p-6 md:p-8 text-left shadow-xl transition-all w-full max-w-xl">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 flex items-center mb-4 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>

                <Dialog.Title className="text-2xl font-bold mb-1">
                  Change method of withdrawal
                </Dialog.Title>
                <p className="text-sm text-gray-500 mb-6">
                  Edit your payout method or add a secondary method of withdrawal via Bank Transfer or PayPal
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSelect('bank_transfer')}
                    className="w-full rounded-2xl border border-gray-200 hover:shadow-md p-6 text-center transition"
                  >
                    <Image
                      src="/icons/bank-outline.png"
                      alt="Bank Transfer"
                      width={36}
                      height={36}
                      className="mx-auto mb-2"
                    />
                    <p className="font-semibold text-lg">Bank Transfer</p>
                  </button>

                  <button
                    onClick={() => handleSelect('paypal')}
                    className="w-full rounded-2xl border border-gray-200 hover:shadow-md p-6 text-center transition"
                  >
                    <Image
                      src="/icons/paypal-logo.png"
                      alt="PayPal"
                      width={40}
                      height={40}
                      className="mx-auto mb-2"
                    />
                    <p className="font-semibold text-lg">PayPal</p>
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}