// components/freelancer-dashboard/new-message-modal.tsx

'use client';

// NOTE TO DEV TEAM:
// This modal uses `useSession()` to retrieve the logged-in user's ID
// and loads potential contacts via `/api/dashboard/contact-profiles?userId=...`
// filtered dynamically by the nested `contact-search-modal.tsx`.
// In production, switch to SSR or secure tokens for session-aware data.

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import ContactSearchModal from './contact-search-modal';

export default function NewMessageModal({
  onThreadCreated,
  onClose,
}: {
  onThreadCreated: (threadId: string) => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleStartThread = async (recipientId: number) => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      const res = await fetch('/api/dashboard/messages/new-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          initialText: 'Hello! I’d like to start a conversation.',
        }),
      });

      const json = await res.json();
      if (res.ok) {
        onThreadCreated(json.threadId);
        onClose();
      } else {
        alert(json.error || 'Failed to start thread');
      }
    } catch (err) {
      console.error('[new-message-modal] Error:', err);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          &#10005;
        </button>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Start a New Message</h2>
        <ContactSearchModal onSelect={handleStartThread} disabled={loading} />
      </div>
    </div>
  );
}