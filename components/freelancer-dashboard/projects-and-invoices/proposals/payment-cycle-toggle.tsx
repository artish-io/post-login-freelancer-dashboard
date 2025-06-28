'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useRef, useLayoutEffect, useState } from 'react';

type PaymentCycle = 'Fixed Amount' | 'Hourly Rate';

type Props = {
  value: PaymentCycle;
  onChange: (val: PaymentCycle) => void;
};

const OPTIONS: PaymentCycle[] = ['Fixed Amount', 'Hourly Rate'];

export default function ProposalPaymentCycleToggle({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const selectedIdx = OPTIONS.indexOf(value);

  useLayoutEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      setButtonWidth(containerWidth / OPTIONS.length);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[48px] flex items-center bg-white border border-gray-300 rounded-2xl"
    >
      {/* Sliding Thumb */}
      <motion.div
        className="absolute top-1 left-1 h-[36px] rounded-xl bg-black z-0 shadow"
        style={{ width: `${buttonWidth - 8}px` }} // 4px side margin per button
        animate={{ x: selectedIdx * buttonWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />

      {OPTIONS.map((option) => (
        <button
          key={option}
          className={clsx(
            'relative z-10 flex-1 h-full text-sm font-semibold text-center px-4 truncate whitespace-nowrap transition-colors duration-150 flex items-center justify-center rounded-xl',
            value === option ? 'text-white' : 'text-black'
          )}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}