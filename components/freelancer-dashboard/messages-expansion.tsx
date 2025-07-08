'use client';

// NOTE TO DEV TEAM:
// This component manages the full chat layout including sidebar contacts, message thread,
// profile header, and input field. It supports auto-loading via the `?thread=` query param
// and is used across /freelancer-dashboard/messages routes.

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import MessagesContacts from './messages-contacts';
import MessageThread from './message-thread';
import ContactProfileHeader from './contact-profile-header';
import MessageInput from './message-input';
import NewMessageModal from './new-message-modal';

export default function MessagesExpansion() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get('thread');

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<number | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  const userId = Number(session?.user?.id);

  // Pre-select thread & contact if URL contains ?thread=
  useEffect(() => {
    if (!userId || !threadParam) return;

    setSelectedThreadId(threadParam);

    const ids = threadParam.split('-').map(Number);
    const otherId = ids.find((id) => id !== userId);
    if (otherId) setActiveContact(otherId);
  }, [threadParam, userId]);

  if (!session?.user?.id) {
    return <p className="p-4 text-sm text-gray-400">Loading session...</p>;
  }

  const handleThreadCreated = (newThreadId: string) => {
    setSelectedThreadId(newThreadId);
    setShowNewMessageModal(false);

    const ids = newThreadId.split('-').map(Number);
    const otherId = ids.find((id) => id !== userId);
    if (otherId) setActiveContact(otherId);
  };

  return (
    <div className="flex h-full w-full overflow-hidden px-4 pb-4 pt-2 bg-gray-50">
      {/* Contacts List */}
      <aside className="w-[300px] flex flex-col pr-2">
        <div className="flex justify-between items-center px-4 py-3">
          <h2 className="font-semibold text-gray-800 text-lg">Contacts</h2>
          <button
            className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium"
            onClick={() => setShowNewMessageModal(true)}
          >
            + New
          </button>
        </div>
        <MessagesContacts
          userId={String(userId)}
          selectedThreadId={selectedThreadId}
          setSelectedThreadId={setSelectedThreadId}
          setActiveContact={setActiveContact}
        />
      </aside>

      {/* Message Thread Panel */}
      <section className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeContact !== null && selectedThreadId ? (
            <motion.div
              key={`thread-${selectedThreadId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col h-full"
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <ContactProfileHeader contactId={activeContact} />
              </motion.div>
              <motion.div
                className="flex-1 overflow-y-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <MessageThread threadId={selectedThreadId} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              >
                <MessageInput threadId={selectedThreadId} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center justify-center h-full text-gray-400 text-sm"
            >
              Select a contact to start messaging
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {showNewMessageModal && (
        <NewMessageModal
          onClose={() => setShowNewMessageModal(false)}
          onThreadCreated={handleThreadCreated}
        />
      )}
    </div>
  );
}