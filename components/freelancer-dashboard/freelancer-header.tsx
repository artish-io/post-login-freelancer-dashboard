'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { requireFreelancerSession } from '../../src/lib/freelancer-access-control';

export default function FreelancerHeader() {
  const { data: session } = useSession();

  // Ensure user is a freelancer before rendering
  const freelancerSession = requireFreelancerSession(session?.user as any);
  if (!freelancerSession) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-medium">
          Access denied: Freelancer authentication required
        </div>
      </div>
    );
  }

  const [status, setStatus] = useState<'Available' | 'Away' | 'Busy'>('Available');
  const [name, setName] = useState('...');
  const [avatar, setAvatar] = useState('/default-avatar.png');
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile/${session.user.id}`);
        const data = await res.json();

        setName(data.name || 'Unknown');
        setAvatar(data.avatar || '/default-avatar.png');
        setStatus(data.availability || 'Unavailable');
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const statusDotColor =
    status === 'Available'
      ? 'bg-green-500'
      : status === 'Away'
      ? 'bg-yellow-400'
      : 'bg-red-500';

  const statusTextColor =
    status === 'Available'
      ? 'text-green-600'
      : status === 'Away'
      ? 'text-yellow-500'
      : 'text-red-500';

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });

  const handleStatusChange = async (newStatus: 'Available' | 'Away' | 'Busy') => {
    if (!session?.user?.id) return;

    setStatus(newStatus);
    setDropdownOpen(false);

    try {
      await fetch('/api/updateAvailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.user.id, status: newStatus }),
      });
    } catch (error) {
      console.error('Failed to update availability status', error);
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center">
      {/* Left: Avatar and Name */}
      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <Image
            src={avatar}
            alt="Freelancer Avatar"
            width={64}
            height={64}
            className="rounded-full object-cover"
            onError={() => setAvatar('/default-avatar.png')}
          />
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusDotColor}`}
          />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-gray-900">{name}</h2>
          <div className="relative">
            <button
              className={`text-sm underline underline-offset-2 flex items-center gap-1 ${statusTextColor}`}
              onClick={() => setDropdownOpen(!isDropdownOpen)}
            >
              {status}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute mt-2 w-36 bg-white shadow-lg rounded-md z-10">
                {['Available', 'Away', 'Busy'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleStatusChange(option as any)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Date and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0 items-center">
        {/* Calendar - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-800">
          <Image src="/calendar-icon.png" alt="Calendar" width={16} height={16} />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full w-full sm:w-72">
          <Image src="/search-icon.png" alt="Search" width={16} height={16} />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>
      </div>
    </div>
  );
}