'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import NotificationDropdown from '../shared/notification-dropdown';
import MobileMenuToggle from './mobile-menu-toggle';
import UserProfileDropdown from './user-profile-dropdown';
import CartIcon from '../storefront/cart-icon';
import ChatHistoryButton from '../new-landing/worksheet/chat-history-button';

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

        if (!res.ok) {
          console.warn(`Profile API returned ${res.status}: ${res.statusText}`);
          // Use fallback values
          setName(session.user.name || 'User');
          setAvatar('/avatar.png');
          return;
        }

        const data = await res.json();
        setName(data.name || session.user.name || 'User');
        setAvatar(data.avatar || '/avatar.png');
      } catch (error) {
        console.error('Failed to fetch avatar for top navbar:', error);
        // Use fallback values from session
        setName(session.user.name || 'User');
        setAvatar('/avatar.png');
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  return (
    <div className="flex items-center justify-between w-full px-6 py-5 bg-white border-b border-gray-200">
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
          <a href="/app" className="block">
            <Image
              src="/artish-logo.png"
              alt="Artish Logo"
              width={42}
              height={42}
              className="rounded-full shadow-sm hover:shadow-md transition cursor-pointer"
            />
          </a>
        </div>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-5 pr-2">
        <CartIcon />
        <NotificationDropdown dashboardType="freelancer" />

        {/* Chat History Button - moved to right side */}
        <div className="flex items-center">
          <ChatHistoryButton />
        </div>

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