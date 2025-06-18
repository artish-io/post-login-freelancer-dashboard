'use client';

// NOTE TO DEV TEAM:
// This component uses `useSession()` to fetch the logged-in user's ID client-side
// and renders the full-width messaging view inside the dashboard shell.

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
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
    <main className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-white">
      <MessagesExpansion />
    </main>
  );
}