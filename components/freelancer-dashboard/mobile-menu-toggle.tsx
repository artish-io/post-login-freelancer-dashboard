'use client';

import { motion } from 'framer-motion';

interface MobileMenuToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function MobileMenuToggle({ isOpen, onToggle }: MobileMenuToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="sm:hidden flex flex-col justify-center items-center w-8 h-8 relative focus:outline-none"
      aria-label="Toggle mobile menu"
    >
      {/* Hamburger lines with animation */}
      <motion.span
        className="block w-6 h-0.5 bg-gray-800 rounded-sm"
        animate={{
          rotate: isOpen ? 45 : 0,
          y: isOpen ? 6 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className="block w-6 h-0.5 bg-gray-800 rounded-sm mt-1.5"
        animate={{
          opacity: isOpen ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className="block w-6 h-0.5 bg-gray-800 rounded-sm mt-1.5"
        animate={{
          rotate: isOpen ? -45 : 0,
          y: isOpen ? -6 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </button>
  );
}
