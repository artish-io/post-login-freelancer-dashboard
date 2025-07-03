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
      const res = await fetch('/api/proposals/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Send failed');
      const { id } = await res.json();

      router.push(`/freelancer-dashboard/projects-and-invoices/view-proposal/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to send proposal.');
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