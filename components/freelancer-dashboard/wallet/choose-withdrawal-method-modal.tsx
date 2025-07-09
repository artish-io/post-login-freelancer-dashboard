'use client';

import { Dialog } from '@headlessui/react';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

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
  const [selected, setSelected] = useState<'bank_transfer' | 'paypal' | null>(null);

  const handleSelect = (method: 'bank_transfer' | 'paypal') => {
    setSelected(method);
    onSelect(method);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-6 md:p-8">
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
      </div>
    </Dialog>
  );
}