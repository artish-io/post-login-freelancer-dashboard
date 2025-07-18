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
  const contactParam = searchParams.get('contact');

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<number | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showContactList, setShowContactList] = useState(true); // Mobile state management

  const userId = Number(session?.user?.id);

  // Pre-select thread & contact if URL contains ?thread=
  useEffect(() => {
    if (!userId || !threadParam || !session) return;

    const ensureThreadExists = async () => {
      const ids = threadParam.split('-').map(Number);
      const otherId = ids.find((id) => id !== userId);

      if (!otherId) return;

      try {
        console.log('🚀 Ensuring thread exists for users:', userId, 'and', otherId);

        // Call the ensure-thread API to create thread and add contacts if needed
        const response = await fetch('/api/dashboard/messages/ensure-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId1: userId,
            userId2: otherId,
            initiatorId: userId // The current user is initiating the contact
          })
        });

        const result = await response.json();
        console.log('📡 Ensure-thread API response:', result);

        if (result.success) {
          setSelectedThreadId(result.threadId);
          setActiveContact(otherId);

          // If thread was created or contacts were updated, refresh the contact list
          if (result.created || result.contactsUpdated) {
            console.log('✅ Thread/contacts updated, refreshing contact list...');
            // Force a re-render by updating a timestamp or similar
            window.location.reload();
          }
        } else {
          console.error('❌ Failed to ensure thread exists:', result.error);
          // Fallback to basic thread selection
          setSelectedThreadId(threadParam);
          setActiveContact(otherId);
        }
      } catch (error) {
        console.error('💥 Error ensuring thread exists:', error);
        // Fallback to basic thread selection
        setSelectedThreadId(threadParam);
        const ids = threadParam.split('-').map(Number);
        const otherId = ids.find((id) => id !== userId);
        if (otherId) setActiveContact(otherId);
      }
    };

    ensureThreadExists();
  }, [threadParam, userId, session]);

  // Handle ?contact= parameter to auto-start conversation with specific user
  useEffect(() => {
    console.log('🔍 Contact param effect triggered:', { userId, contactParam, hasSession: !!session, threadParam });
    if (!userId || !contactParam || !session || threadParam) return; // Skip if thread param is already handling it

    const startConversationWithContact = async () => {
      const contactId = Number(contactParam);

      if (!contactId || contactId === userId) {
        console.error('Invalid contact ID or trying to message self');
        return;
      }

      try {
        console.log('🚀 Starting conversation with contact:', contactId);

        // Call the ensure-thread API to create thread and add contacts if needed
        const response = await fetch('/api/dashboard/messages/ensure-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId1: userId,
            userId2: contactId,
            initiatorId: userId // The current user is initiating the contact
          })
        });

        const result = await response.json();
        console.log('📡 Ensure-thread API response for contact:', result);

        if (result.success) {
          setSelectedThreadId(result.threadId);
          setActiveContact(contactId);
          setShowContactList(false); // Hide contact list to show the conversation

          // If thread was created or contacts were updated, refresh the contact list
          if (result.created || result.contactsUpdated) {
            console.log('✅ Thread/contacts updated for new contact, refreshing...');
            // Force a re-render by updating a timestamp or similar
            setTimeout(() => window.location.reload(), 100);
          }
        } else {
          console.error('❌ Failed to start conversation with contact:', result.error);
        }
      } catch (error) {
        console.error('💥 Error starting conversation with contact:', error);
      }
    };

    startConversationWithContact();
  }, [contactParam, userId, session, threadParam]);

  if (!session?.user?.id) {
    return <p className="p-4 text-sm text-gray-400">Loading session...</p>;
  }

  const handleThreadCreated = (newThreadId: string) => {
    setSelectedThreadId(newThreadId);
    setShowNewMessageModal(false);
    setShowContactList(false); // Hide contact list on mobile when thread is selected

    const ids = newThreadId.split('-').map(Number);
    const otherId = ids.find((id) => id !== userId);
    if (otherId) setActiveContact(otherId);
  };

  const handleContactSelect = (contactId: number, threadId: string) => {
    setSelectedThreadId(threadId);
    setActiveContact(contactId);
    setShowContactList(false); // Hide contact list on mobile when contact is selected
  };

  const handleBackToContacts = () => {
    setShowContactList(true);
    setSelectedThreadId(null);
    setActiveContact(null);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50 px-0 md:px-6">
      {/* Contacts List - Hidden on mobile when thread is selected */}
      <aside className={`
        w-full md:w-[300px] flex flex-col
        ${showContactList ? 'block' : 'hidden md:block'}
      `}>
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
          setSelectedThreadId={handleContactSelect}
          setActiveContact={setActiveContact}
        />
      </aside>

      {/* Message Thread Panel - Full width on mobile when contact is selected */}
      <section className={`
        flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden
        ${!showContactList ? 'block' : 'hidden md:block'}
        md:ml-4
      `}>
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
                <ContactProfileHeader
                  contactId={activeContact}
                  onBack={handleBackToContacts}
                  showBackButton={!showContactList}
                />
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