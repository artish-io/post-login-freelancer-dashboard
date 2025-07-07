'use client';

// NOTE TO DEV TEAM:
// This component displays the contact list and highlights unread threads.
// It delegates display rendering to <ContactListCard />, styled to match Figma spec.
// Contact data is fetched from `/api/dashboard/contact-profiles?userId=...`.
// Unread state is derived from `/api/dashboard/messages/preview?userId=...`.
// Selecting a contact also PATCHes `/api/dashboard/messages/[threadId]/mark-read`.

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ContactListCard from './messages/contact-list-card';

export type Contact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
};

type Props = {
  userId: string;
  selectedThreadId: string | null;
  setSelectedThreadId: (threadId: string) => void;
  setActiveContact: (contactId: number) => void;
};

export default function MessagesContacts({
  userId,
  selectedThreadId,
  setSelectedThreadId,
  setActiveContact,
}: Props) {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unreadThreads, setUnreadThreads] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/dashboard/contact-profiles?userId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) setContacts(data);
      } catch (err) {
        console.error('[messages-contacts] Failed to load contacts:', err);
      }
    };

    fetchContacts();
  }, [userId]);

  useEffect(() => {
    const fetchUnreadThreads = async () => {
      try {
        const res = await fetch(`/api/dashboard/messages/preview?userId=${userId}`);
        const previews = await res.json();

        console.log('[messages-contacts] previews:', previews);

        const unread = previews
          .filter((t: any) => t.isUnread)
          .map((t: any) => t.threadId);

        setUnreadThreads(unread);
        console.log('[messages-contacts] unreadThreads:', unread);
      } catch (err) {
        console.error('[messages-contacts] Error loading unread status:', err);
      }
    };

    fetchUnreadThreads();
  }, [userId]);

  const handleSelect = async (contactId: number) => {
    const sorted = [Number(userId), contactId].sort((a, b) => a - b);
    const threadId = `${sorted[0]}-${sorted[1]}`;

    setSelectedThreadId(threadId);
    setActiveContact(contactId);

    try {
      const res = await fetch(`/api/dashboard/messages/${threadId}/mark-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        console.warn(`[messages-contacts] Failed to mark thread ${threadId} as read: ${res.status}`);
        return;
      }

      // ✅ Only remove badge after server confirms write
      setUnreadThreads((prev) => prev.filter((id) => id !== threadId));
      console.log(`[messages-contacts] Marked thread ${threadId} as read`);

      // Trigger unread count refresh
      console.log('📧 Thread marked as read, refreshing unread count');
      window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
    } catch (err) {
      console.warn(`[messages-contacts] Failed to mark thread ${threadId} as read`, err);
    }
  };

  return (
    <aside className="w-full max-w-xs py-4 px-2 overflow-y-auto">
      <ul className="space-y-2">
        {contacts.map((contact) => {
          const threadId = [Number(userId), contact.id].sort((a, b) => a - b).join('-');
          const isActive = threadId === selectedThreadId;
          const isUnread = unreadThreads.includes(threadId);

          return (
            <li key={contact.id}>
              <ContactListCard
                id={contact.id}
                name={contact.name}
                title={contact.title}
                avatar={contact.avatar}
                isActive={isActive}
                isUnread={isUnread}
                onClick={() => handleSelect(contact.id)}
              />
            </li>
          );
        })}
      </ul>
    </aside>
  );
}