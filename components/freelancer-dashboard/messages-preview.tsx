'use client';

import Image from 'next/image';

const messages = [
  {
    id: 1,
    name: 'Billy Parker',
    role: 'PM',
    avatar: '/avatars/billy.png',
  },
  {
    id: 2,
    name: 'Nancy Salmon',
    role: 'Sales Manager',
    avatar: '/avatars/nancy.png',
  },
  {
    id: 3,
    name: 'Billy Parker',
    role: 'PM',
    avatar: '/avatars/billy.png',
  },
  {
    id: 4,
    name: 'Nancy Salmon',
    role: 'Sales Manager',
    avatar: '/avatars/nancy.png',
  },
  {
    id: 5,
    name: 'Stella Maxwell',
    role: 'Designer',
    avatar: '/avatars/stella.png',
  },
  {
    id: 6,
    name: 'Stella Maxwell',
    role: 'Designer',
    avatar: '/avatars/stella.png',
  },
];

export default function MessagesPreview() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-900">Messages</h2>
        <div className="flex items-center gap-2 text-sm bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
          <span className="text-lg">👤</span>
          <span>63</span>
        </div>
      </div>

      {/* Scrollable List with Clipping */}
      <div className="relative">
        {/* Scroll area */}
        <div className="space-y-4 overflow-y-auto pr-1 max-h-[240px]">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src={msg.avatar}
                  alt={msg.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-gray-800">{msg.name}</span>
                  <span className="text-xs text-gray-500">{msg.role}</span>
                </div>
              </div>

              <button className="bg-pink-100 hover:bg-pink-200 p-2 rounded-full">
                <Image src="/icons/mail-icon.svg" alt="message" width={16} height={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl" />
      </div>

      {/* Down Caret Button (not triggering anything yet) */}
      <div className="flex justify-center mt-4">
        <button className="bg-pink-100 hover:bg-pink-200 p-2 rounded-full shadow-sm">
          <svg
            className="w-4 h-4 text-pink-700"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}