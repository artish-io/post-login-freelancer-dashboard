'use client';

// NOTE TO DEV TEAM:
// This component fetches the contact's profile based on contactId.
// It renders a pink (#FCD5E3) header matching Figma and includes call, video, and more icons.
// The header styling intentionally uses inline style for precise brand color matching.

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';

interface ContactProfileHeaderProps {
  contactId: number;
  onBack?: () => void;
  showBackButton?: boolean;
}

type Contact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
};

export default function ContactProfileHeader({ contactId, onBack, showBackButton = false }: ContactProfileHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchContact = async () => {
      try {
        const res = await fetch(`/api/dashboard/contact-profiles?userId=${session.user.id}`);
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
  }, [contactId, session?.user?.id]);

  const handleAvatarClick = () => {
    if (contact) {
      router.push(`/freelancer-dashboard/profile/${contact.id}`);
    }
  };

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
    <div className="pt-6 pb-4 px-4 rounded-t-2xl relative" style={{ backgroundColor: '#FCD5E3' }}>
      {/* Back Button - Mobile Only */}
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 top-6 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors md:hidden"
          title="Back to contacts"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      <div className="flex flex-col items-center justify-center text-center">
        <button
          onClick={handleAvatarClick}
          className="w-20 h-20 relative mb-3 group cursor-pointer transition-transform hover:scale-105"
          title={`View ${contact.name}'s profile`}
        >
          <Image
            src={contact.avatar}
            alt={contact.name}
            fill
            className="rounded-full object-cover group-hover:ring-2 group-hover:ring-white group-hover:ring-offset-2 transition-all"
          />
        </button>
        <button
          onClick={handleAvatarClick}
          className="text-lg font-semibold text-gray-800 hover:text-gray-900 transition-colors cursor-pointer"
          title={`View ${contact.name}'s profile`}
        >
          {contact.name}
        </button>
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