

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import ChatHistoryPanel from './chat-history-panel';

export default function ChatHistoryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  if (!userId) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl transition-all min-h-[44px]"
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        title="Chat History"
      >
        <Image
          src="/app/chat-history.png"
          alt="Chat"
          width={24}
          height={24}
          className="object-contain"
        />
        <span className="hidden lg:inline ml-2">Chat History</span>
      </button>

      {isOpen && (
        <ChatHistoryPanel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          userId={userId}
        />
      )}
    </>
  );
}