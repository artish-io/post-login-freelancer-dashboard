'use client';

// NOTE TO DEV TEAM:
// This component uses `useSession()` to fetch the logged-in user's ID client-side
// and renders the full-width messaging view inside the commissioner dashboard shell.

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import MessagesExpansion from '../../../../components/freelancer-dashboard/messages-expansion';

export default function CommissionerMessagesPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiverId = searchParams.get('receiverId');
  const isNew = searchParams.get('page') === 'new';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Thread resolution logic for commissioners
  useEffect(() => {
    const tryResolveThread = async () => {
      if (!isNew || !receiverId || !session?.user?.id) return;

      try {
        // Check if thread already exists
        const res = await fetch(`/api/dashboard/messages/threads?userId=${session.user.id}`);
        if (!res.ok) throw new Error('Failed to fetch threads');
        const threads = await res.json();

        const existingThread = threads.find((thread: any) =>
          thread.participants.includes(Number(receiverId))
        );

        if (existingThread) {
          // Thread exists, redirect to it
          router.replace(`/commissioner-dashboard/messages/${existingThread.id}`);
        } else {
          // Thread doesn't exist, create it
          const createRes = await fetch('/api/dashboard/messages/ensure-thread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: Number(session.user.id),
              receiverId: Number(receiverId)
            })
          });

          if (createRes.ok) {
            const result = await createRes.json();
            if (result.success) {
              router.replace(`/commissioner-dashboard/messages/${result.threadId}`);
            }
          }
        }
      } catch (err) {
        console.error('[commissioner-message-redirect] Failed to resolve thread:', err);
      }
    };

    tryResolveThread();
  }, [isNew, receiverId, session, router]);

  if (!mounted || status === 'loading') {
    return <p className="p-6 text-gray-400">Loading dashboard...</p>;
  }

  if (!session?.user?.id) {
    return <p className="p-6 text-red-500">Unauthorized: Please log in</p>;
  }

  return (
    <motion.main
      className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-white"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="w-full"
      >
        <MessagesExpansion />
      </motion.div>
    </motion.main>
  );
}