'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import NotificationDropdown from './notification-dropdown';

export default function TopNavbar() {
  const { data: session } = useSession();

  const [avatar, setAvatar] = useState('/avatar.png');
  const [name, setName] = useState('...');

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
    <div className="flex items-center justify-between w-full px-6 py-5 bg-white border-b border-gray-200">
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

      {/* Icons */}
      <div className="flex items-center gap-5 pr-2">
        <NotificationDropdown />

        <Image
          src={avatar}
          alt={`${name}'s Avatar`}
          width={44}
          height={44}
          className="rounded-full border-2 border-black/10 shadow-sm hover:shadow-md transition object-cover"
          onError={() => setAvatar('/avatar.png')}
        />
      </div>
    </div>
  );
}