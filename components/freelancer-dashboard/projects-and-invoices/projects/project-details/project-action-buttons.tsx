

'use client';

import Link from 'next/link';
import { PauseCircle, FileText, MessageSquareText, FilePlus2 } from 'lucide-react';

type Props = {
  projectId: number;
  onNotesClick: () => void;
};

export default function ProjectActionButtons({ projectId, onNotesClick }: Props) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-xs lg:max-w-none mt-6">
      {/* Generate Invoice Button */}
      <Link href={`/freelancer-dashboard/projects-and-invoices/create-invoice?projectId=${projectId}`}>
        <button className="w-full bg-[#120008] hover:opacity-90 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition">
          <FilePlus2 size={16} />
          Generate Invoice
        </button>
      </Link>

      {/* Request Pause Button */}
      <button className="w-full bg-gray-800 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 hover:opacity-90 transition">
        <PauseCircle size={16} />
        Request Project Pause
      </button>

      {/* See All Files */}
      <Link href={`/freelancer-dashboard/projects-and-invoices/files/${projectId}`}>
        <button className="w-full border border-gray-300 text-sm font-medium px-6 py-3 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <FileText size={16} />
          See All Project Files
        </button>
      </Link>

      {/* See Comments and Notes */}
      <button
        onClick={onNotesClick}
        className="w-full border border-gray-300 text-sm font-medium px-6 py-3 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
      >
        <MessageSquareText size={16} />
        See Comments and Notes
      </button>
    </div>
  );
}