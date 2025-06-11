'use client';

import { useSession } from 'next-auth/react';

export default function TestSession() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading session...</p>;
  if (!session) return <p>No session found</p>;

  return (
    <div className="p-4 bg-gray-100 rounded-md text-sm">
      <p><strong>Session ID:</strong> {session.user?.id || 'No ID'}</p>
      <p><strong>Email:</strong> {session.user?.email || 'No email'}</p>
      <p><strong>Name:</strong> {session.user?.name || 'No name'}</p>
    </div>
  );
}