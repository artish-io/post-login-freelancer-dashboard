'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Contact = {
  id: number;
  name: string;
  email: string;
  title?: string;
  avatar: string;
};

type Props = {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  anchorRef: React.RefObject<HTMLInputElement | null>;
  visible: boolean;
  setVisible: (val: boolean) => void;
  noMatches?: boolean; // NEW PROP
};

export default function ContactSuggestionDropdown({
  contacts,
  onSelect,
  anchorRef,
  visible,
  setVisible,
  noMatches = false,
}: Props) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [animate, setAnimate] = useState(false);

  // Dismiss on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [anchorRef, setVisible]);

  // Entrance animation
  useEffect(() => {
    if (visible) {
      setAnimate(true);
    } else {
      const timeout = setTimeout(() => setAnimate(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  if (!visible && !animate) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto transition-all duration-200 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
    >
      {noMatches ? (
        <div className="px-4 py-3 text-sm text-gray-500 text-center">No matches found</div>
      ) : (
        contacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onSelect(contact)}
            className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-100 transition"
          >
            <Image
              src={contact.avatar || '/default-avatar.png'}
              alt={contact.name}
              width={44}
              height={44}
              className="rounded-full object-cover"
            />
            <div className="flex flex-col">
              <span className="text-base font-semibold text-gray-900">
                {contact.name}
              </span>
              {contact.title && (
                <span className="text-sm text-gray-500">{contact.title}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}