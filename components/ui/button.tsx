'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-2xl px-8 py-4 text-base font-medium transition-all';

  const variantStyles = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'border-[1.5px] border-black text-black hover:bg-black hover:text-white flex items-center gap-2',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    />
  );
}