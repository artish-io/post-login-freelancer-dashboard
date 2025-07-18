'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FileText } from 'lucide-react';

type Invoice = {
  id: number;
  client: {
    name: string;
    title: string;
    avatar: string;
  };
  status: string;
};

export default function InvoiceHistoryList() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      try {
        const res = await fetch(`/api/dashboard/invoices?userId=${userId}`);
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[invoice-history] Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [session?.user?.id]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm w-full max-w-sm flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 text-sm font-semibold">
            <FileText className="w-4 h-4 mr-0.5" />
            <span className="ml-1 text-sm font-medium">{invoices.length}</span>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="space-y-4 overflow-y-auto max-h-64 pr-1">
        {loading && <p className="text-sm text-gray-400">Loading invoices...</p>}

        {!loading && invoices.length === 0 && (
          <p className="text-sm text-gray-400">No invoices found.</p>
        )}

        {!loading &&
          invoices.map((invoice) => {
            // Defensive programming: ensure client object exists
            const client = invoice.client || {
              name: 'Unknown Client',
              title: 'Client',
              avatar: '/default-avatar.png'
            };

            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoice.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={client.avatar}
                    alt={client.name}
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                  <div className="flex flex-col text-sm">
                    <span className="text-gray-900 font-medium">
                      {client.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {client.title}
                    </span>
                  </div>
                </div>

                <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-pink-700" />
                </div>
              </div>
            );
          })}
      </div>

      {/* Caret */}
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
    </div>
  );
}