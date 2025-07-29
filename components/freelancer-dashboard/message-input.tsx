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
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    // Clear any previous errors
    setError(null);

    // Basic validation
    if (!text.trim()) {
      setError('Please enter a message');
      return;
    }

    if (loading) {
      return;
    }

    if (!session?.user?.id) {
      setError('Please log in to send messages');
      return;
    }

    setLoading(true);

    try {
      // Get recipient ID from threadId
      const threadParts = threadId.split('-').map(Number);
      const recipientId = threadParts.find(id => id !== Number(session.user.id));

      if (!recipientId) {
        console.error('Could not determine recipient from threadId:', threadId);
        setError('Unable to determine message recipient');
        return;
      }

      let messageText = text.trim();
      let isEncrypted = false;

      // Try to encrypt the message if encryption is ready
      if (isReady) {
        try {
          messageText = await encryptMessage(text.trim(), recipientId.toString());
          isEncrypted = true;
        } catch (encryptError) {
          console.warn('[message-input] Encryption failed, sending unencrypted:', encryptError);
          // Fall back to unencrypted message
          messageText = text.trim();
          isEncrypted = false;
        }
      }

      const res = await fetch('/api/dashboard/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(session.user.id),
          threadId,
          text: messageText,
          isEncrypted,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Server error: ${res.status}`);
      }

      if (!json.success) {
        throw new Error(json.error || 'Failed to send message');
      }

      // Success - clear the input and dispatch refresh event
      setText('');
      window.dispatchEvent(new CustomEvent('messageSent'));
      console.log('📨 Message sent successfully, dispatched refresh event');

    } catch (err) {
      console.error('[message-input] Send error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-3 bg-white rounded-b-2xl">
      {/* Error Message */}
      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Attachment Icon */}
        <button className="text-gray-400 hover:text-gray-600" disabled>
          <Paperclip className="w-5 h-5" strokeWidth={1.75} />
        </button>

        {/* Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Clear error when user starts typing
            if (error) setError(null);
          }}
          placeholder="Write a message"
          className="flex-1 text-sm px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-400"
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Encryption Indicator */}
        <EncryptionIndicator className="flex-shrink-0" />

        {/* Send Button */}
        <button
          onClick={handleSend}
          className={`flex items-center gap-2 text-pink-600 font-medium hover:text-pink-700 transition-colors ${
            loading || !text.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={loading || !text.trim()}
          type="button"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Sending...</span>
            </>
          ) : (
            <>
              <span className="text-sm">Send</span>
              <SendHorizontal className="w-4 h-4" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}