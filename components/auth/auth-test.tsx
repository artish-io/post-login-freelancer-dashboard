'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthTest() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="p-4">Loading session...</div>;
  }

  if (!session) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">No Active Session</h3>
        <p className="text-red-600">You should be redirected to login.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-green-800 font-semibold">Authentication Status: ✅ Authenticated</h3>
      <div className="mt-2 space-y-1 text-sm text-green-700">
        <p><strong>User ID:</strong> {session.user?.id}</p>
        <p><strong>Name:</strong> {session.user?.name}</p>
        <p><strong>Email:</strong> {session.user?.email}</p>
        <p><strong>User Type:</strong> {(session.user as any)?.userType || 'Not specified'}</p>
      </div>
      <div className="mt-4 space-x-2">
        <button
          onClick={() => router.push('/commissioner-dashboard')}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Test Commissioner Dashboard
        </button>
        <button
          onClick={() => router.push('/freelancer-dashboard')}
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          Test Freelancer Dashboard
        </button>
        <button
          onClick={() => signOut()}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
