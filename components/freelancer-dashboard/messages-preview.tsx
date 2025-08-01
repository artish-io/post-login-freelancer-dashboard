'use client';

// NOTE TO DEV TEAM:
// This preview component renders recent message contacts with a visual indicator for unread threads.
// Unread threads are fetched from `/api/dashboard/messages/preview?userId=...`.
// This allows the pink badge and bold name behavior to match Figma spec.

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Contact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
};

type ThreadPreview = {
  threadId: string;
  isUnread: boolean;
};

export default function MessagesPreview() {
  const { data: session } = useSession();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unreadThreads, setUnreadThreads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = Number(session?.user?.id);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        // Fetch contacts
        const res = await fetch(`/api/dashboard/contact-profiles?userId=${userId}`);
        const contactData: Contact[] = await res.json();
        setContacts(Array.isArray(contactData) ? contactData : []);

        // Fetch unread thread preview
        const previewRes = await fetch(`/api/dashboard/messages/preview?userId=${userId}`);
        const previewData: ThreadPreview[] = await previewRes.json();

        const unread = previewData
          .filter((thread) => thread.isUnread)
          .map((thread) => thread.threadId);

        setUnreadThreads(unread);
      } catch (err) {
        console.error('[messages-preview] Failed to fetch preview data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleContactClick = (contactId: number) => {
    const sorted = [userId, contactId].sort((a, b) => a - b);
    const threadId = `${sorted[0]}-${sorted[1]}`;
    router.push(`/freelancer-dashboard/messages?thread=${threadId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-900">Messages</h2>
        <div className="flex items-center gap-2 text-sm bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
          <span className="text-lg">👤</span>
          <span>{contacts.length}</span>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="relative">
        <div className="space-y-4 overflow-y-auto pr-1 max-h-[240px]">
          {loading && <p className="text-sm text-gray-400">Loading contacts...</p>}
          {!loading && contacts.length === 0 && (
            <p className="text-sm text-gray-400">No contacts found.</p>
          )}
          {!loading &&
            contacts.map((contact) => {
              const threadId = [userId, contact.id].sort((a, b) => a - b).join('-');
              const isUnread = unreadThreads.includes(threadId);

              return (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={contact.avatar}
                      alt={contact.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div className="flex flex-col text-sm">
                      <span
                        className={`truncate ${
                          isUnread ? 'font-semibold text-gray-900' : 'text-gray-800'
                        }`}
                      >
                        {contact.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{contact.title}</span>
                    </div>
                  </div>

                  <div
                    className={`rounded-full p-2 transition ${
                      isUnread ? 'bg-[#FCD5E3]' : ''
                    }`}
                  >
                    <Image
                      src="/icons/mail-icon.svg"
                      alt="message"
                      width={16}
                      height={16}
                      className={`${isUnread ? 'opacity-100' : 'opacity-50'}`}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl" />
      </div>

      {/* Down Caret Button */}
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