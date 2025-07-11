'use client';

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
  const [refreshKey, setRefreshKey] = useState(0);

  const userId = Number(session?.user?.id);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch contacts
        const res = await fetch(`/api/dashboard/contact-profiles?userId=${userId}`);
        const contactData = await res.json();
        setContacts(Array.isArray(contactData) ? contactData : []);

        // Fetch thread previews
        const previewRes = await fetch(`/api/dashboard/messages/preview?userId=${userId}`);
        const rawPreview = await previewRes.json();
        console.log('[messages-preview] Raw preview data:', rawPreview);

        // ✅ Defensive check before filtering
        if (!Array.isArray(rawPreview)) {
          console.warn('[messages-preview] Invalid preview data, skipping:', rawPreview);
          setUnreadThreads([]);
          return;
        }

        const unread = rawPreview
          .filter((thread: ThreadPreview) => thread.isUnread)
          .map((thread: ThreadPreview) => thread.threadId);

        setUnreadThreads(unread);
      } catch (err) {
        console.error('[messages-preview] Failed to fetch preview data:', err);
        setContacts([]);
        setUnreadThreads([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, refreshKey]);

  const handleContactClick = (contactId: number) => {
    const sorted = [userId, contactId].sort((a, b) => a - b);
    const threadId = `${sorted[0]}-${sorted[1]}`;

    router.push(`/freelancer-dashboard/messages?thread=${threadId}`);

    // Optimistically mark as read
    setUnreadThreads((prev) => prev.filter((id) => id !== threadId));

    // Allow backend to process
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1);
    }, 500);
  };

  const handleAvatarClick = (e: React.MouseEvent, contactId: number) => {
    e.stopPropagation(); // Prevent triggering the card's onClick
    router.push(`/freelancer-dashboard/profile/${contactId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-900">Messages</h2>
        <div className="flex items-center gap-2 text-sm bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
          <span className="text-lg">👤</span>
          <span>{contacts.length}</span>
        </div>
      </div>

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
                    <button
                      onClick={(e) => handleAvatarClick(e, contact.id)}
                      className="rounded-full hover:ring-2 hover:ring-[#FCD5E3] hover:ring-offset-1 transition-all"
                      title={`View ${contact.name}'s profile`}
                    >
                      <Image
                        src={contact.avatar}
                        alt={contact.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </button>
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

        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl" />
      </div>

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