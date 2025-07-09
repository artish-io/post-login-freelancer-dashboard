'use client';

import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import clsx from 'clsx';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export default function WalletSetUpModal({ isOpen, onClose, onContinue }: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
          <Dialog.Title className="text-2xl font-bold text-gray-900 mb-4">
            Continue to complete wallet set-up
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-700 mb-6 max-w-lg leading-relaxed">
            ARTISH partners with different payment partners to verify customer bank details and process
            payments. By clicking “Continue”, you agree to our{' '}
            <a href="/legal/service-agreement" className="underline hover:text-black font-medium">
              Service Agreement
            </a>{' '}
            and{' '}
            <a href="/legal/privacy-policy" className="underline hover:text-black font-medium">
              Privacy Policy
            </a>.
          </Dialog.Description>

          <div className="flex justify-end gap-4">
            <button
              onClick={onContinue}
              className="px-6 py-2 border border-black text-black text-sm rounded-xl hover:bg-black hover:text-white transition"
            >
              Continue
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-black text-white text-sm rounded-xl hover:opacity-90"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}