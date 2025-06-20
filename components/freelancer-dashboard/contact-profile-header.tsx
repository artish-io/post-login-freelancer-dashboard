'use client';

// NOTE TO DEV TEAM:
// This component fetches the contact's profile based on contactId.
// It renders a pink (#FCD5E3) header matching Figma and includes call, video, and more icons.
// The header styling intentionally uses inline style for precise brand color matching.

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface ContactProfileHeaderProps {
  contactId: number;
}

type Contact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
};

export default function ContactProfileHeader({ contactId }: ContactProfileHeaderProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await fetch('/api/dashboard/contact-profiles?userId=31');
        const data: Contact[] = await res.json();
        const found = data.find((c) => c.id === contactId);
        if (found) setContact(found);
      } catch (err) {
        console.error('[contact-profile-header] Failed to load contact', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [contactId]);

  if (loading || !contact) {
    return (
      <div
        className="text-center text-sm text-gray-500 px-6 py-6 rounded-t-2xl"
        style={{ backgroundColor: '#FCD5E3' }}
      >
        Loading profile...
      </div>
    );
  }

  return (
    <div className="pt-6 pb-4 px-4 rounded-t-2xl" style={{ backgroundColor: '#FCD5E3' }}>
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 relative mb-3">
          <Image
            src={contact.avatar}
            alt={contact.name}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">{contact.name}</h2>
        <p className="text-sm text-gray-600">{contact.title}</p>

        <div className="flex gap-4 mt-4">
          <button className="bg-white p-2 rounded-full shadow-sm">
            <Image src="/icons/video.svg" alt="video" width={20} height={20} />
          </button>
          <button className="bg-white p-2 rounded-full shadow-sm">
            <Image src="/icons/call.svg" alt="call" width={20} height={20} />
          </button>
          <button className="bg-white p-2 rounded-full shadow-sm">
            <Image src="/icons/more.svg" alt="more" width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
}