

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function CommissionerHeader() {
  const { data: session } = useSession();

  const [name, setName] = useState('...');
  const [avatar, setAvatar] = useState('/default-avatar.png');
  const [organizationName, setOrganizationName] = useState('...');
  const [isOnline, setIsOnline] = useState(true); // default to online

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile/${session.user.id}`);
        const data = await res.json();

        setName(data.name || 'Unknown');
        setAvatar(data.avatar || '/default-avatar.png');
        // Extract organization name from the organization object
        setOrganizationName(data.organization?.name || 'No Organization');
        setIsOnline(data.isOnline ?? true);
      } catch (error) {
        console.error('Failed to fetch commissioner profile:', error);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
      {/* Left: Avatar and Name */}
      <div className="flex items-center gap-4 relative flex-shrink-0">
        <div className="relative">
          <Image
            src={avatar}
            alt="Commissioner Avatar"
            width={64}
            height={64}
            className="rounded-full object-cover"
            onError={() => setAvatar('/default-avatar.png')}
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg text-gray-900 truncate">{name}</h2>
          <p className="text-sm text-gray-500 truncate">{organizationName}</p>
        </div>
      </div>

      {/* Right: Date and Search */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        {/* Calendar - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-800 whitespace-nowrap">
          <Image src="/calendar-icon.png" alt="Calendar" width={16} height={16} />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full w-full sm:w-80 lg:w-72">
          <Image src="/search-icon.png" alt="Search" width={16} height={16} />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none w-full text-sm min-w-0"
          />
        </div>
      </div>
    </div>
  );
}