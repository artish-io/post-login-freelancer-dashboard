'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../src/lib/utils';

interface AddCustomerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export default function AddCustomerButton({ className, ...props }: AddCustomerButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'w-full rounded-xl bg-gray-100 hover:bg-gray-200 transition text-center text-[16px] font-semibold py-4 text-gray-900',
        className
      )}
    >
      Add Customer
    </button>
  );
}