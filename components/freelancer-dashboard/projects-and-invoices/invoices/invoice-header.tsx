'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

type InvoiceHeaderProps = {
  onSend: () => void;
  onSaveDraft: () => void;
  onPreview?: () => void;
  billTo: string;
};

export default function InvoiceHeader({
  onSend,
  onSaveDraft,
  onPreview,
  billTo,
}: InvoiceHeaderProps) {
  const { data: session } = useSession();
  const [name, setName] = useState('...');
  const [avatar, setAvatar] = useState('/default-avatar.png');

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile/${session.user.id}`);
        const data = await res.json();
        setName(data.name || 'Unknown');
        setAvatar(data.avatar || '/default-avatar.png');
      } catch (err) {
        console.error('Failed to fetch invoice header profile:', err);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      {/* Left: User Info */}
      <div className="flex items-center gap-4">
        <Image
          src={avatar}
          alt="Freelancer Avatar"
          width={48}
          height={48}
          className="rounded-full object-cover"
          onError={() => setAvatar('/default-avatar.png')}
        />
        <div className="flex flex-col">
          <h2 className="font-medium text-sm text-gray-900 leading-tight">{name}</h2>
          <span className="text-xs text-gray-500">{formattedDate}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
        <button
          className="border px-4 py-2 rounded-full text-sm text-gray-800 hover:bg-gray-100 transition"
          onClick={() => window.history.back()}
        >
          Cancel
        </button>

        <button
          onClick={onSaveDraft}
          disabled={!billTo.trim()}
          className={`border px-4 py-2 rounded-full text-sm transition ${
            billTo.trim()
              ? 'text-gray-800 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed bg-gray-100'
          }`}
          title={!billTo.trim() ? 'Enter a billing contact to enable saving' : ''}
        >
          Save Draft
        </button>

        {onPreview && (
          <button
            onClick={() => {
              console.log('🟡 Preview button clicked');
              console.log('📦 Executing handlePreviewInvoice() from InvoiceHeader');
              console.log('🧪 onPreview ref:', onPreview);
              onPreview();
            }}
            disabled={!billTo.trim()}
            className={`border px-4 py-2 rounded-full text-sm transition ${
              billTo.trim()
                ? 'text-gray-800 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed bg-gray-100'
            }`}
            title={!billTo.trim() ? 'Enter a billing contact to preview' : ''}
          >
            Preview
          </button>
        )}

        <button
          className="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-900 transition"
          onClick={onSend}
        >
          Send Now
        </button>
      </div>
    </div>
  );
}