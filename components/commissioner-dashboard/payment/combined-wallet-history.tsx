'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CombinedHistoryItem from './combined-history-item';

type CombinedTransaction = {
  id: string;
  type: 'spending' | 'earning';
  category: 'freelancer_payout' | 'withdrawal' | 'product_sale';
  amount: number;
  currency: string;
  date: string;
  description: string;
  metadata?: {
    freelancerId?: number;
    projectId?: number;
    projectName?: string;
    productId?: string;
    productName?: string;
  };
};

export default function CombinedWalletHistory() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/commissioner-dashboard/payments/combined-history?limit=20');
        const data: CombinedTransaction[] = await res.json();
        setTransactions(data);
      } catch (err) {
        console.error('Error loading combined transaction history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="w-full rounded-3xl border border-gray-300 bg-white px-6 py-8 shadow-sm">
        <h3 className="text-2xl font-extrabold text-black mb-6">
          Transaction History
        </h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="w-full rounded-3xl border border-gray-300 bg-white px-6 py-8 shadow-sm">
      <h3 className="text-2xl font-extrabold text-black mb-6">
        Transaction History
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTransactions.map((transaction) => (
            <CombinedHistoryItem
              key={transaction.id}
              transaction={transaction}
            />
          ))}
          
          {transactions.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              {showAll ? 'Show Less' : `Show All (${transactions.length} total)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
