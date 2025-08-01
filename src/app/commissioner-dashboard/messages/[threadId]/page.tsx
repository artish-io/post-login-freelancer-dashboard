'use client';

// NOTE TO DEV TEAM:
// This component handles individual message threads for commissioners.
// It uses the same MessagesExpansion component as the freelancer dashboard
// but within the commissioner dashboard layout.

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import MessagesExpansion from '../../../../../components/freelancer-dashboard/messages-expansion';

export default function CommissionerThreadPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const router = useRouter();
  const threadId = params?.threadId as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate thread access
  useEffect(() => {
    const validateThreadAccess = async () => {
      if (!session?.user?.id || !threadId) return;

      try {
        const res = await fetch(`/api/dashboard/messages/${threadId}?userId=${session.user.id}`);
        if (!res.ok) {
          console.error('Thread access denied or not found');
          router.push('/commissioner-dashboard/messages');
        }
      } catch (error) {
        console.error('Error validating thread access:', error);
        router.push('/commissioner-dashboard/messages');
      }
    };

    if (mounted && session?.user?.id && threadId) {
      validateThreadAccess();
    }
  }, [mounted, session, threadId, router]);

  // Redirect to query parameter format for MessagesExpansion compatibility
  useEffect(() => {
    if (mounted && threadId) {
      router.replace(`/commissioner-dashboard/messages?thread=${threadId}`);
    }
  }, [mounted, threadId, router]);

  if (!mounted || status === 'loading') {
    return <p className="p-6 text-gray-400">Loading dashboard...</p>;
  }

  if (!session?.user?.id) {
    return <p className="p-6 text-red-500">Unauthorized: Please log in</p>;
  }

  if (!threadId) {
    return <p className="p-6 text-red-500">Invalid thread ID</p>;
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
