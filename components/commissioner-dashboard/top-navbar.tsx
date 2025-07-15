'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import NotificationDropdown from '../freelancer-dashboard/notification-dropdown';
import MobileMenuToggle from '../freelancer-dashboard/mobile-menu-toggle';
import UserProfileDropdown from '../freelancer-dashboard/user-profile-dropdown';

interface TopNavbarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function TopNavbar({
  isMobileMenuOpen = false,
  onMobileMenuToggle
}: TopNavbarProps = {}) {
  const { data: session } = useSession();

  const [avatar, setAvatar] = useState('/avatar.png');
  const [name, setName] = useState('...');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile/${session.user.id}`);
        const data = await res.json();

        setName(data.name || 'User');
        setAvatar(data.avatar || '/avatar.png');
      } catch (error) {
        console.error('Failed to fetch avatar for top navbar:', error);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between w-full h-20 px-6 bg-white border-b border-gray-200">
      {/* Left side: Mobile menu toggle + Logo */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle (only on small screens) */}
        {onMobileMenuToggle && (
          <MobileMenuToggle
            isOpen={isMobileMenuOpen}
            onToggle={onMobileMenuToggle}
          />
        )}

        {/* Logo */}
        <div className="pl-2">
          <Image
            src="/artish-logo.png"
            alt="Artish Logo"
            width={42}
            height={42}
            className="rounded-full shadow-sm hover:shadow-md transition"
          />
        </div>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-5 pr-2">
        <NotificationDropdown />

        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="focus:outline-none"
          >
            <Image
              src={avatar}
              alt={`${name}'s Avatar`}
              width={44}
              height={44}
              className="rounded-full border-2 border-black/10 shadow-sm hover:shadow-md transition object-cover cursor-pointer"
              onError={() => setAvatar('/avatar.png')}
            />
          </button>

          <UserProfileDropdown
            isOpen={isProfileDropdownOpen}
            onToggle={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            onClose={() => setIsProfileDropdownOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}