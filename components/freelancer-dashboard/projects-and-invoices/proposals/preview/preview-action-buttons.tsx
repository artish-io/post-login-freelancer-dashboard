'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ArrowLeft } from 'lucide-react';

export default function PreviewActionButtons({ data }: { data: any }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      console.log('🚀 Sending proposal with data:', data);

      const res = await fetch('/api/proposals/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();
      console.log('📡 API Response:', responseData);

      if (!res.ok) {
        throw new Error(responseData.error || `Server error: ${res.status}`);
      }

      const { id } = responseData;

      if (!id) {
        throw new Error('No proposal ID returned from server');
      }

      router.push(`/freelancer-dashboard/projects-and-invoices/view-proposal/${id}`);
    } catch (err) {
      console.error('Proposal send error:', err);
      alert(`Failed to send proposal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full bg-[#120008] hover:opacity-90 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition"
      >
        <Send size={16} />
        {sending ? 'Sending...' : 'Send Proposal'}
      </button>

      <Link href="/freelancer-dashboard/projects-and-invoices/create-proposal">
        <button className="w-full border border-gray-300 text-sm font-medium px-6 py-3 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          Back To Proposal Editor
        </button>
      </Link>
    </div>
  );
}