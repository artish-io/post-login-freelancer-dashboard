'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { CalendarDays } from 'lucide-react';

interface Props {
  contactSelected: boolean;
  isCustomEmail: boolean;
  projectName: string;
  isValid: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSend: () => void;
  onPreview?: () => void; // ✅ NEW optional prop
}

export default function ProposalHeader({
  contactSelected,
  isCustomEmail,
  projectName,
  isValid,
  onCancel,
  onSaveDraft,
  onSend,
  onPreview,
}: Props) {
  const { data: session } = useSession();

  const user = session?.user;
  const userName = user?.name ?? 'Your Name';
  const userEmail = user?.email ?? 'you@example.com';
  const userImage = user?.image ?? '/avatars/avatar.png';

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
      {/* Left: Profile and Date */}
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden">
          <Image src={userImage} alt="Profile" fill className="object-cover" />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-gray-900 leading-tight">{userName}</span>
          <span className="text-sm text-gray-500 leading-tight">{userEmail}</span>
        </div>
        <div className="ml-4 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800 font-medium">
          <CalendarDays className="w-4 h-4" />
          {today}
        </div>
      </div>

      {/* Right: Button Group */}
      <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap justify-end">
        <button
          className="px-5 py-2 rounded-md border border-gray-400 text-sm text-gray-800 hover:bg-gray-100 transition"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          disabled={!isValid}
          onClick={onPreview}
          className="px-5 py-2 rounded-md border border-gray-400 text-sm text-gray-800 transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Preview
        </button>
        <button
          disabled={!isValid}
          onClick={onSaveDraft}
          className="px-5 py-2 rounded-md border border-gray-400 text-sm text-gray-800 transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Draft
        </button>
        <button
          disabled={!isValid}
          onClick={onSend}
          className="px-5 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send Now
        </button>
      </div>
    </div>
  );
}