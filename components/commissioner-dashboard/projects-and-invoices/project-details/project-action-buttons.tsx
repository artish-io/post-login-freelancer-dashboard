'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, MessageSquareText, CreditCard } from 'lucide-react';

type Props = {
  projectId: number;
  onNotesClick: () => void;
};

export default function CommissionerProjectActionButtons({ projectId, onNotesClick }: Props) {
  const { data: session } = useSession();
  const [freelancerId, setFreelancerId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch project details to get the freelancer ID
    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`/api/projects`);
        if (res.ok) {
          const projects = await res.json();
          const project = projects.find((p: any) => p.projectId === projectId);
          if (project?.freelancerId) {
            setFreelancerId(project.freelancerId);
          }
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  const getMessageUrl = () => {
    if (!session?.user?.id || !freelancerId) {
      return '/commissioner-dashboard/messages';
    }
    return `/commissioner-dashboard/messages?contact=${freelancerId}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs lg:max-w-none mt-6">
      {/* Pay Invoice Button */}
      <button className="w-full bg-[#120008] hover:opacity-90 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition">
        <CreditCard size={16} />
        Pay Invoice
      </button>

      {/* Message Freelancer Button */}
      <Link href={getMessageUrl()}>
        <button className="w-full bg-gray-800 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 hover:opacity-90 transition">
          <MessageSquareText size={16} />
          Message Freelancer
        </button>
      </Link>

      {/* See All Files */}
      <Link href={`/commissioner-dashboard/projects-and-invoices/files/${projectId}`}>
        <button className="w-full border border-gray-300 text-sm font-medium px-6 py-3 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <FileText size={16} />
          See All Project Files
        </button>
      </Link>
    </div>
  );
}