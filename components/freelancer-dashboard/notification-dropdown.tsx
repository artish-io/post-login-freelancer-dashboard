'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const mockNotifications = [
  {
    id: 1,
    name: 'Leslie Wacombo',
    message: 'accepted your request to pause project',
    project: 'Mobile app documentation',
    time: 'Just now',
    avatar: '/avatar.png',
  },
  {
    id: 2,
    name: 'Fadeel',
    message: 'marked tasks you submitted for review as completed',
    project: 'Lagos State Park Services Web Redesign',
    time: '12 hours ago',
    avatar: '/avatar.png',
  },
  {
    id: 3,
    name: 'Matt Hannery',
    message: 'rated you 4/5 stars after project completion of',
    project: 'Corlax iOS app development',
    time: 'Friday 10th, 4:00pm',
    avatar: '/avatar.png',
    rating: 4,
  },
];

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition"
      >
        <Image src="/bell-icon.png" alt="Notifications" width={20} height={20} />
      </button>

      {open && (
        <div className="absolute right-2 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white rounded-xl shadow-xl p-4 z-50">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Notifications</h3>
          <ul className="space-y-3 max-h-[400px] overflow-y-auto">
            {mockNotifications.map((notif) => (
              <li key={notif.id} className="flex items-start gap-3">
                <Image
                  src={notif.avatar}
                  alt={notif.name}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <div className="text-sm">
                  <p className="text-black leading-snug">
                    <span className="font-semibold">{notif.name}</span> {notif.message}{' '}
                    <span className="font-semibold">{notif.project}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                  {notif.rating && (
                    <div className="mt-1 text-yellow-500 text-sm">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i}>{i < notif.rating ? '★' : '☆'}</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}