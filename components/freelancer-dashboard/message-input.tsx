'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Paperclip, SendHorizontal } from 'lucide-react'; // Lucide icons
import { useEncryption } from '@/hooks/useEncryption';
import EncryptionIndicator from '../shared/encryption-indicator';

interface MessageInputProps {
  threadId: string;
}

export default function MessageInput({ threadId }: MessageInputProps) {
  const { data: session } = useSession();
  const { isReady, encryptMessage } = useEncryption();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || loading || !session?.user?.id || !isReady) return;

    setLoading(true);

    try {
      // Get recipient ID from threadId
      const threadParts = threadId.split('-').map(Number);
      const recipientId = threadParts.find(id => id !== Number(session.user.id));

      if (!recipientId) {
        console.error('Could not determine recipient from threadId:', threadId);
        return;
      }

      // Encrypt the message
      const encryptedText = await encryptMessage(text.trim(), recipientId.toString());

      const res = await fetch('/api/dashboard/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(session.user.id),
          threadId,
          text: encryptedText,
          isEncrypted: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.warn('[message-input] Failed to send message:', json.error);
      } else {
        // Dispatch custom event to notify thread to refresh
        window.dispatchEvent(new CustomEvent('messageSent'));
        console.log('📨 Message sent successfully, dispatched refresh event');
      }
    } catch (err) {
      console.error('[message-input] Send error:', err);
    } finally {
      setText('');
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-3 flex items-center gap-3 bg-white rounded-b-2xl">
      {/* Attachment Icon */}
      <button className="text-gray-400 hover:text-gray-600" disabled>
        <Paperclip className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Input */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message"
        className="flex-1 text-sm px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-400"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSend();
        }}
      />

      {/* Encryption Indicator */}
      <EncryptionIndicator className="flex-shrink-0" />

      {/* Send Button */}
      <button
        onClick={handleSend}
        className={`flex items-center gap-2 text-pink-600 font-medium hover:text-pink-700 ${
          loading && 'opacity-50 cursor-not-allowed'
        }`}
        disabled={loading}
      >
        <span className="text-sm">Send</span>
        <SendHorizontal className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}