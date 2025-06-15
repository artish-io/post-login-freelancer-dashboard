'use client';

// NOTE TO DEV TEAM:
// This component uses `useSession()` and fetches messages client-side from `/api/dashboard/messages/[threadId]?userId=...`
// It also PATCHes `/api/dashboard/messages/[threadId]/mark-read` to mark messages as read once loaded.
// In production, migrate to SSR + secure tokens. Do not expose raw query params in public APIs.

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

type Message = {
  senderId: number;
  timestamp: string;
  text: string;
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
  const userId = Number(session?.user?.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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
  useEffect(() => {
    if (!threadId || !userId) return;

    const fetchAndMarkRead = async () => {
      try {
        const res = await fetch(`/api/dashboard/messages/${threadId}?userId=${userId}`);
        const json = await res.json();

        if (json?.messages) {
          setMessages(json.messages);
        }

        // PATCH to mark all messages in thread as read
        await fetch(`/api/dashboard/messages/${threadId}/mark-read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (err) {
        console.error('[message-thread] Failed to load or mark messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndMarkRead();
  }, [threadId, userId]);

  // Auto scroll to bottom on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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