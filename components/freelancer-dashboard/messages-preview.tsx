'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type ThreadPreview = {
  threadId: string;
  contactId: number;
  name: string;
  title: string;
  avatar: string;
  lastMessage: string;
  lastTimestamp: string;
  isUnread: boolean;
};

export default function MessagesPreview() {
  const { data: session } = useSession();
  const router = useRouter();

  const [threadPreviews, setThreadPreviews] = useState<ThreadPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = Number(session?.user?.id);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch thread previews using universal API
        const previewRes = await fetch(`/api/messages/preview?userId=${userId}`);
        const rawPreview = await previewRes.json();
        console.log('[messages-preview] Raw preview data:', rawPreview);

        // Defensive check before setting data
        if (!Array.isArray(rawPreview)) {
          console.warn('[messages-preview] Invalid preview data, skipping:', rawPreview);
          setThreadPreviews([]);
          return;
        }

        setThreadPreviews(rawPreview);
      } catch (err) {
        console.error('[messages-preview] Failed to fetch preview data:', err);
        setThreadPreviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleContactClick = (threadId: string) => {
    // For now, assume freelancer route - can be enhanced later
    const route = `/freelancer-dashboard/messages?thread=${threadId}`;

    router.push(route);

    // Optimistically mark as read
    setThreadPreviews(prev =>
      prev.map(thread =>
        thread.threadId === threadId
          ? { ...thread, isUnread: false }
          : thread
      )
    );
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
          <span>{threadPreviews.length}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-4 overflow-y-auto pr-1 max-h-[240px]">
          {loading && <p className="text-sm text-gray-400">Loading conversations...</p>}
          {!loading && threadPreviews.length === 0 && (
            <p className="text-sm text-gray-400">No conversations found.</p>
          )}
          {!loading &&
            threadPreviews.map((thread) => {

              return (
                <div
                  key={thread.threadId}
                  onClick={() => handleContactClick(thread.threadId)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleAvatarClick(e, thread.contactId)}
                      className="rounded-full hover:ring-2 hover:ring-[#FCD5E3] hover:ring-offset-1 transition-all"
                      title={`View ${thread.name}'s profile`}
                    >
                      <Image
                        src={thread.avatar}
                        alt={thread.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </button>
                    <div className="flex flex-col text-sm">
                      <span
                        className={`truncate ${
                          thread.isUnread ? 'font-semibold text-gray-900' : 'text-gray-800'
                        }`}
                      >
                        {thread.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{thread.title}</span>
                    </div>
                  </div>

                  <div
                    className={`rounded-full p-2 transition ${
                      thread.isUnread ? 'bg-[#FCD5E3]' : ''
                    }`}
                  >
                    <Image
                      src="/icons/mail-icon.svg"
                      alt="message"
                      width={16}
                      height={16}
                      className={`${thread.isUnread ? 'opacity-100' : 'opacity-50'}`}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl" />
      </div>

      {/* Only show expansion caret if there are multiple conversations */}
      {threadPreviews.length > 1 && (
        <div className="flex justify-center mt-4">
          <button
            className="bg-pink-100 hover:bg-pink-200 p-2 rounded-full shadow-sm transition-colors"
            onClick={() => router.push('/commissioner-dashboard/messages')}
            title="View all messages"
          >
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
      )}
    </div>
  );
}