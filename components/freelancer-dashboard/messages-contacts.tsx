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
  lastMessageTime?: string;
};

type Props = {
  userId: string;
  selectedThreadId: string | null;
  setSelectedThreadId: (contactId: number, threadId: string) => void;
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

  const currentUserType = (session?.user as any)?.userType;

  // Define fetchContacts outside useEffect so it can be called from event handlers
  const fetchContacts = async () => {
    if (!userId) return;

    try {
      // Fetch from messages preview API to get contacts sorted by last message timestamp
      const res = await fetch(`/api/dashboard/messages/preview?userId=${userId}&t=${Date.now()}`);
      const data = await res.json();

      // Check if the response is an error or not an array
      if (!Array.isArray(data)) {
        console.error('[messages-contacts] API returned non-array response:', data);
        setContacts([]);
        return;
      }

      // Filter out threads with no messages and convert preview data to contact format
      const contactsFromPreviews = data
        .filter((preview: any) => preview.lastMessageText && preview.lastMessageText !== 'No messages yet')
        .map((preview: any) => ({
          id: preview.contactId,
          name: preview.name,
          title: preview.title,
          avatar: preview.avatar,
          lastMessageTime: preview.lastMessageTime
        }));

      // Sort by last message timestamp DESC (most recent first)
      const sortedContacts = contactsFromPreviews.sort((a: any, b: any) =>
        new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
      );

      console.log('[messages-contacts] Sorted contacts by timestamp:', sortedContacts.map(c => ({ name: c.name, lastMessageTime: c.lastMessageTime })));
      setContacts(sortedContacts);
    } catch (err) {
      console.error('[messages-contacts] Failed to load contacts:', err);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [userId]);

  useEffect(() => {
    const fetchUnreadThreads = async () => {
      try {
        const endpoint = `/api/dashboard/messages/preview?userId=${userId}`;
        console.log('[messages-contacts] Fetching unread threads from:', endpoint);

        const res = await fetch(endpoint);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const previews = await res.json();
        console.log('[messages-contacts] previews:', previews);

        // Check if the response is an error or not an array
        if (!Array.isArray(previews)) {
          console.error('[messages-contacts] API returned non-array response:', previews);
          setUnreadThreads([]);
          return;
        }

        // Use corrected unread logic: only count as unread if user is recipient and read status is false
        const unread = previews
          .filter((t: any) => {
            // Double-check unread calculation on client side for consistency
            const isUnread = t.isUnread;
            console.log(`[messages-contacts] Thread ${t.threadId}: isUnread=${isUnread}, lastSender=${t.lastMessage?.senderId}, currentUser=${userId}`);
            return isUnread;
          })
          .map((t: any) => t.threadId);

        setUnreadThreads(unread);
        console.log('[messages-contacts] unreadThreads:', unread);
      } catch (err) {
        console.error('[messages-contacts] Error loading unread status:', err);
        console.error('[messages-contacts] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
      }
    };

    fetchUnreadThreads();

    // Listen for real-time updates
    const handleUnreadCountChange = () => {
      console.log('📧 Unread count changed, refreshing contact list unread state');
      fetchUnreadThreads();
    };

    const handleMessageSent = () => {
      console.log('📨 Message sent, refreshing contact list and unread state');
      fetchContacts(); // Refresh contacts to update order
      fetchUnreadThreads();
    };

    const handleRefreshUnreadCount = () => {
      console.log('📧 Manual refresh triggered, refreshing contact list unread state');
      fetchUnreadThreads();
    };

    // Listen for various events that should trigger unread state refresh
    window.addEventListener('unreadCountChanged', handleUnreadCountChange);
    window.addEventListener('messageSent', handleMessageSent);
    window.addEventListener('refreshUnreadCount', handleRefreshUnreadCount);

    // Poll for unread state changes every 5 seconds (slightly longer than message thread polling)
    const interval = setInterval(() => {
      console.log('🔄 Polling for contact list unread state changes...');
      fetchUnreadThreads();
    }, 5000);

    return () => {
      window.removeEventListener('unreadCountChanged', handleUnreadCountChange);
      window.removeEventListener('messageSent', handleMessageSent);
      window.removeEventListener('refreshUnreadCount', handleRefreshUnreadCount);
      clearInterval(interval);
    };
  }, [userId]);

  const handleSelect = async (contactId: number) => {
    const sorted = [Number(userId), contactId].sort((a, b) => a - b);
    const threadId = `${sorted[0]}-${sorted[1]}`;

    setSelectedThreadId(contactId, threadId);
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
    <aside className="w-full h-full py-4 px-2 overflow-y-auto max-h-full">
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
                viewerUserType={currentUserType}
                onClick={() => handleSelect(contact.id)}
              />
            </li>
          );
        })}
      </ul>
    </aside>
  );
}