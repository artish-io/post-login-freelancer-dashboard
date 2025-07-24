'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut } from 'lucide-react';

interface UserProfileDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  dashboardType?: 'freelancer' | 'commissioner';
}

export default function UserProfileDropdown({
  isOpen,
  onToggle,
  onClose,
  dashboardType = 'freelancer'
}: UserProfileDropdownProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleViewProfile = () => {
    if (session?.user?.id) {
      const profilePath = dashboardType === 'commissioner'
        ? `/commissioner-dashboard/profile/${session.user.id}`
        : `/freelancer-dashboard/profile/${session.user.id}`;
      router.push(profilePath);
      onClose();
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
    onClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          >
            {/* View Profile Option */}
            <button
              onClick={handleViewProfile}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <User className="w-4 h-4" />
              View Profile
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1" />

            {/* Logout Option */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
