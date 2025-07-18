'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import WalletHistoryItem from './wallet-history-item';

type WalletEntry = {
  id: number;
  userId: string;
  commissionerId?: number;
  organizationId?: number;
  projectId?: number;
  name?: string;
  company?: string;
  commissioner?: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  date: string;
};

export default function WalletHistoryList() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching wallet history...');

        // Fetch wallet history, organizations, projects, and users data
        const [historyRes, orgsRes, projectsRes, usersRes] = await Promise.all([
          fetch(`/api/dashboard/wallet/history?userId=${session.user.id}`),
          fetch('/api/data/organizations'),
          fetch('/api/data/projects'),
          fetch('/api/data/users')
        ]);

        if (!historyRes.ok) {
          throw new Error(`History API failed: ${historyRes.status}`);
        }

        const [historyData, organizations, projects, users] = await Promise.all([
          historyRes.json(),
          orgsRes.json(),
          projectsRes.json(),
          usersRes.json()
        ]);

        console.log('Raw history data:', historyData.length, 'transactions');
        console.log('Organizations loaded:', organizations.length);
        console.log('Projects loaded:', projects.length);
        console.log('Users loaded:', users.length);

        // Enrich with organization/project/commissioner names (API already filtered by userId)
        const enriched = historyData.map((item: any) => {
          const organization = organizations.find((org: any) => org.id === item.organizationId);
          const project = projects.find((proj: any) => proj.projectId === item.projectId);
          const commissioner = users.find((user: any) => user.id === item.commissionerId);

          console.log(`Transaction ${item.id}:`);
          console.log(`  Project ${item.projectId}:`, project?.title);
          console.log(`  Organization ${item.organizationId}:`, organization?.name);
          console.log(`  Commissioner ${item.commissionerId}:`, commissioner?.name);

          return {
            ...item,
            name: project?.title || `${item.type === 'credit' ? 'Payment Received' : 'Withdrawal'}`,
            company: organization?.name || 'Unknown Organization',
            commissioner: commissioner?.name || 'Unknown Commissioner'
          };
        });

        console.log('Enriched entries:', enriched.length);
        console.log('Sample enriched entry:', enriched[0]);

        const finalEntries = enriched.slice().reverse(); // newest first
        console.log('Final entries to render:', finalEntries.length);
        console.log('First entry to render:', finalEntries[0]);

        setEntries(finalEntries);
      } catch (err) {
        console.error('Failed to load wallet history:', err);
        setEntries([]); // Set empty array instead of dummy data
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Wallet History</h3>
        <div className="flex items-center gap-2 text-sm bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
          <span className="text-lg">💳</span>
          <span>{entries.length}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-3 overflow-y-auto pr-1 max-h-[240px]">
          {loading && <p className="text-sm text-gray-400">Loading transactions...</p>}
          {!loading && entries.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No transactions found</p>
              <p className="text-xs text-gray-400 mt-1">Check console for debugging info</p>
            </div>
          )}
          {!loading &&
            entries.slice(0, 5).map((entry) => (
              <WalletHistoryItem
                key={entry.id}
                name={entry.name || entry.type}
                company={entry.company || '—'}
                commissioner={entry.commissioner}
                type={entry.type}
                amount={entry.amount}
                currency={entry.currency}
              />
            ))}
        </div>

        {entries.length > 5 && (
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl" />
        )}
      </div>

      {entries.length > 5 && (
        <div className="flex justify-center mt-4">
          <button className="bg-pink-100 hover:bg-pink-200 p-2 rounded-full shadow-sm">
            <svg
              className="w-4 h-4 text-pink-700"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}