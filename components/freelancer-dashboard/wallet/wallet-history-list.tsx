'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import WalletHistoryItem from './wallet-history-item';

type Transaction = {
  transactionId: string;
  type: string;
  amount: number;
  status: string;
  timestamp: string;
  metadata?: {
    cardUsed?: {
      last4: string;
      type: string;
    };
    withdrawalMethod?: {
      type: string;
      last4?: string;
      email?: string;
      bankName?: string;
    };
    projectTitle?: string;
    invoiceNumber?: string;
  };
};

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 WalletHistory | Fetching transaction history for user:', session.user.id);

        // Fetch transactions from new API
        const response = await fetch(`/api/payments/transactions?userId=${session.user.id}`);

        if (!response.ok) {
          console.error('❌ WalletHistory | API failed:', response.status);
          throw new Error(`Transactions API failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 WalletHistory | API response:', data);

        if (data.success && data.transactions) {
          setTransactions(data.transactions);
          console.log('✅ WalletHistory | Found transactions:', data.transactions.length);

          // Convert transactions to legacy format for existing UI
          const legacyEntries = data.transactions.map((tx: Transaction, index: number) => ({
            id: index + 1,
            userId: session.user.id,
            type: tx.type === 'credit' ? 'credit' as const : 'debit' as const,
            amount: tx.amount,
            currency: 'USD',
            date: tx.timestamp,
            name: getTransactionTitle(tx),
            company: getTransactionSource(tx),
            commissioner: getCommissionerName(tx)
          }));

          setEntries(legacyEntries);
          console.log('✅ WalletHistory | Converted to legacy format:', legacyEntries.length, 'entries');
        } else {
          console.error('❌ WalletHistory | Failed to fetch transactions:', data.error);
          setEntries([]);
        }
      } catch (err) {
        console.error('❌ WalletHistory | Failed to load transaction history:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [session?.user?.id]);

  // Helper functions for transaction display
  const getTransactionTitle = (tx: Transaction) => {
    if (tx.metadata?.projectTitle) {
      return tx.metadata.projectTitle;
    }
    return tx.type === 'credit' ? 'Payment Received' : 'Withdrawal';
  };

  const getTransactionSource = (tx: Transaction) => {
    if (tx.type === 'credit' && tx.metadata?.cardUsed) {
      return `From ${tx.metadata.cardUsed.type} ****${tx.metadata.cardUsed.last4}`;
    } else if (tx.type === 'withdrawal' && tx.metadata?.withdrawalMethod) {
      const method = tx.metadata.withdrawalMethod;
      if (method.type === 'bank_transfer') {
        return `To ${method.bankName} ****${method.last4}`;
      } else if (method.type === 'paypal') {
        return `To PayPal ${method.email}`;
      }
    }
    return 'Transaction';
  };

  const getCommissionerName = (tx: Transaction) => {
    return 'Commissioner'; // Could be enhanced with actual commissioner lookup
  };

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