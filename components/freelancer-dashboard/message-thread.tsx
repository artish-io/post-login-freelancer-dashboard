'use client';

// NOTE TO DEV TEAM:
// This component uses `useSession()` and fetches messages client-side from `/api/dashboard/messages/[threadId]?userId=...`
// It also PATCHes `/api/dashboard/messages/[threadId]/mark-read` to mark messages as read once loaded.
// In production, migrate to SSR + secure tokens. Do not expose raw query params in public APIs.

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEncryption } from '@/hooks/useEncryption';

type Message = {
  senderId: number;
  timestamp: string;
  text: string;
  isEncrypted?: boolean;
};

type Props = {
  threadId: string;
};

type GroupedMessage = {
  dateLabel: string;
  messages: Message[];
};

export default function MessageThread({ threadId }: Props) {
  const { data: session } = useSession();
  const { isReady, decryptMessage } = useEncryption();
  const userId = Number(session?.user?.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to scroll to bottom
  const scrollToBottom = (delay = 100) => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (scrollElement) {
            scrollElement.scrollTo({
              top: scrollElement.scrollHeight,
              behavior: 'smooth'
            });
            console.log('📜 Scrolled to bottom');
          }
        }, delay);
      });
    }
  };

  // Helper: Group messages by date label
  const groupMessagesByDate = (msgs: Message[]): GroupedMessage[] => {
    const groups: { [key: string]: Message[] } = {};
    const today = new Date();

    for (const msg of msgs) {
      const ts = new Date(msg.timestamp);
      let label = '';

      if (ts.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (
        new Date(today.getTime() - 86400000).toDateString() === ts.toDateString()
      ) {
        label = 'Yesterday';
      } else {
        label = ts.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(msg);
    }

    return Object.entries(groups).map(([dateLabel, messages]) => ({
      dateLabel,
      messages,
    }));
  };

  // Fetch messages and mark them as read using /mark-read
  const fetchAndMarkRead = useCallback(async () => {
    if (!threadId || !userId) return;

    try {
      const res = await fetch(`/api/dashboard/messages/${threadId}?userId=${userId}`);
      const json = await res.json();

      if (json?.messages) {
        // Decrypt messages if encryption is ready
        if (isReady) {
          const decryptedMessages = await Promise.all(
            json.messages.map(async (msg: Message) => {
              if (msg.isEncrypted && msg.senderId !== userId) {
                try {
                  const decryptedText = await decryptMessage(msg.text, msg.senderId.toString());
                  return { ...msg, text: decryptedText };
                } catch (error) {
                  console.error('Failed to decrypt message:', error);
                  return { ...msg, text: '[Encrypted message - decryption failed]' };
                }
              }
              return msg;
            })
          );
          setMessages(decryptedMessages);
        } else {
          // If encryption not ready, show encrypted messages as-is
          setMessages(json.messages);
        }
      }

      // PATCH to mark all messages in thread as read
      const markReadRes = await fetch(`/api/dashboard/messages/${threadId}/mark-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      // Trigger unread count refresh if marking as read was successful
      if (markReadRes.ok) {
        console.log('📧 Messages marked as read, refreshing unread count');
        window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
      }
    } catch (err) {
      console.error('[message-thread] Failed to load or mark messages:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId, userId, isReady, decryptMessage]);

  useEffect(() => {
    fetchAndMarkRead();
    // Scroll to bottom when thread first loads
    scrollToBottom(500);
  }, [threadId, userId]);

  // Listen for message sent events to refresh the thread
  useEffect(() => {
    const handleMessageSent = () => {
      console.log('📨 Message sent event received, refreshing thread');
      fetchAndMarkRead();

      // Force scroll to bottom after a message is sent with longer delay
      scrollToBottom(300);
    };

    window.addEventListener('messageSent', handleMessageSent);
    return () => window.removeEventListener('messageSent', handleMessageSent);
  }, [fetchAndMarkRead]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!threadId || !userId) return;

    const interval = setInterval(() => {
      console.log('🔄 Polling for new messages...');
      fetchAndMarkRead();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchAndMarkRead]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom(100);
  }, [messages]);

  // Scroll to bottom when loading completes and we have messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(200);
    }
  }, [loading, messages.length]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">Loading conversation...</div>;
  }

  const grouped = groupMessagesByDate(messages);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 pt-4 pb-2 scroll-smooth"
    >
      <div className="space-y-8 pb-4">
        {grouped.map(({ dateLabel, messages }, idx) => (
          <div key={idx} className="space-y-4">
            <div className="text-center text-xs text-gray-400 font-medium">{dateLabel}</div>
            {messages.map((msg, i) => {
              const isUser = msg.senderId === userId;
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm max-w-[75%] break-words ${
                      isUser
                        ? 'bg-[#FCD5E3] text-black'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[10px] block mt-1 text-right text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}