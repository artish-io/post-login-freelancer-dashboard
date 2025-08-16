// NOTE TO DEV TEAM:
// This component uses useSession() client-side to access the currently logged-in user's session ID.
// The session ID is used to fetch personalized earnings from the /api/dashboard/earnings endpoint.
// This approach is optimal for dev testing via local login flows with next-auth.
// In production, we can migrate this to use getServerSession() on the backend or use authenticated API routes.

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CurrencyDisplay from '../ui/currency-display';

export default function EarningsCard() {
  const { data: session } = useSession();
  const [earnings, setEarnings] = useState<number | null>(null);
  const [lastPaymentDate, setLastPaymentDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchEarnings = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/dashboard/earnings?id=${session.user.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch earnings');
        }

        console.log('🎯 Fetched user-specific earnings:', data);

        setEarnings(data.amount || 0);
        setLastPaymentDate(data.lastUpdated || '');
      } catch (error) {
        console.error('❌ Error fetching user earnings:', error);
        setError(error instanceof Error ? error.message : 'Failed to load earnings');
        setEarnings(0);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [session?.user?.id]);

  return (
    <div
      className="rounded-3xl p-6 w-full bg-pink-100 flex flex-col items-center text-center shadow-lg border border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <p className="text-base font-medium text-gray-600">Your total earnings</p>
      <h2
        className="text-[48px] leading-none font-semibold text-gray-900 mt-3 font-bodoni-moda"
        style={{ fontFamily: "'Bodoni Moda SC', serif", fontWeight: 600 }}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <span className="text-red-500 text-lg">Error</span>
        ) : (
          <CurrencyDisplay
            amount={earnings || 0}
            className="text-[48px] leading-none"
            currencySymbolSize="text-[31px]"
          />
        )}
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        {loading ? (
          'Loading...'
        ) : error ? (
          error
        ) : lastPaymentDate ? (
          `Last payment: ${new Date(lastPaymentDate).toLocaleDateString()}`
        ) : earnings && earnings > 0 ? (
          'From paid invoices'
        ) : (
          'No payments received yet'
        )}
      </p>

      <button className="mt-6 w-full bg-black text-white rounded-xl py-3 text-sm font-medium transition-all hover:opacity-90 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/10">
        Withdraw all earnings
      </button>
    </div>
  );
}