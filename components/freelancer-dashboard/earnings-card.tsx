// NOTE TO DEV TEAM:
// This component uses useSession() client-side to access the currently logged-in user's session ID.
// The session ID is used to fetch personalized earnings from the /api/dashboard/earnings endpoint.
// This approach is optimal for dev testing via local login flows with next-auth.
// In production, we can migrate this to use getServerSession() on the backend or use authenticated API routes.

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function EarningsCard() {
  const { data: session } = useSession();
  const [earnings, setEarnings] = useState<number | null>(null);
  const [lastPaymentDate, setLastPaymentDate] = useState<string>('');

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchEarnings = async () => {
      try {
        const res = await fetch(`/api/dashboard/earnings?id=${session.user.id}`);
        const data = await res.json();
        console.log('🎯 Fetched earnings response:', data);

        setEarnings(data.amount || 0);
        setLastPaymentDate(data.lastUpdated || '');
      } catch (error) {
        console.error('❌ Error fetching earnings:', error);
      }
    };

    fetchEarnings();
  }, [session?.user?.id]);

  return (
    <div className="rounded-2xl shadow-sm p-6 w-full max-w-[340px] bg-pink-100 flex flex-col items-center text-center">
      <p className="text-base font-medium text-gray-600">Your earnings this month</p>
      <h2 className="text-[48px] leading-none font-extrabold text-gray-900 mt-3">
        {earnings !== null ? `$${earnings.toFixed(2)}` : '...'}
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        {lastPaymentDate
          ? new Date(lastPaymentDate).toLocaleString(undefined, {
              dateStyle: 'long',
              timeStyle: 'short',
            })
          : 'Loading date...'}
      </p>

      <button className="mt-6 w-full bg-black text-white rounded-xl py-3 text-sm font-medium transition-all hover:opacity-90">
        Withdraw all earnings
      </button>
    </div>
  );
}