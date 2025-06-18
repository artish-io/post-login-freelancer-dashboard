'use client';

// NOTE TO DEV TEAM:
// This component renders a single contact row in the messaging UI.
// It accepts `isUnread` and `isActive` flags to control visual state.
// It is used inside `messages-contacts.tsx` to handle styling and click behavior.
// A debug `console.log` is included to help verify unread logic in development.

import Image from 'next/image';
import { useEffect } from 'react';

type Props = {
  id: number;
  name: string;
  title: string;
  avatar: string;
  isUnread: boolean;
  isActive: boolean;
  onClick: () => void;
};

export default function ContactListCard({
  id,
  name,
  title,
  avatar,
  isUnread,
  isActive,
  onClick,
}: Props) {
  useEffect(() => {
    console.log(`[ContactListCard] Rendered for ${name} (ID: ${id}) → isUnread: ${isUnread} | isActive: ${isActive}`);
  }, [isUnread, isActive, id, name]);

  return (
    <li
      onClick={onClick}
      className={`flex items-center justify-between cursor-pointer px-4 py-3 rounded-xl transition ${
        isActive
          ? 'bg-pink-100'
          : isUnread
          ? 'bg-[#FFF5F8] hover:bg-[#FCEAF0]'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Image
          src={avatar}
          alt={name}
          width={40}
          height={40}
          className="rounded-full object-cover shrink-0"
        />
        <div className="flex flex-col overflow-hidden">
          <span
            className={`text-sm truncate ${
              isUnread ? 'font-semibold text-gray-900' : 'text-gray-800'
            }`}
          >
            {name}
          </span>
          <span className="text-xs text-gray-500 truncate">{title}</span>
        </div>
      </div>

      <div
        className={`rounded-full p-2 transition ${
          isUnread ? 'bg-[#FCD5E3]' : ''
        }`}
      >
        <Image
          src="/icons/mail-icon.svg"
          alt="Chat"
          width={16}
          height={16}
          className={`${isUnread ? 'opacity-100' : 'opacity-50'}`}
        />
      </div>
    </li>
  );
}