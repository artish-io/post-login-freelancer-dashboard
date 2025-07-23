'use client';

// NOTE TO DEV TEAM:
// This component uses `useSession()` to fetch the logged-in user's ID client-side
// and renders the full-width messaging view inside the dashboard shell.

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import MessagesExpansion from '../../../../components/freelancer-dashboard/messages-expansion';

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div></div>}>
          <MessagesExpansion />
        </Suspense>
      </motion.div>
    </motion.main>
  );
}