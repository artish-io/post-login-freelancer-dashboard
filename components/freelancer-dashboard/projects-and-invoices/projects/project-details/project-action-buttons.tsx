

'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PauseCircle, FileText, MessageSquareText, FilePlus2, Play } from 'lucide-react';

type Props = {
  projectId: number;
  onNotesClick: () => void;
  projectStatus?: string;
};

export default function ProjectActionButtons({ projectId, onNotesClick, projectStatus }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [hasEligibleTasks, setHasEligibleTasks] = useState<boolean | null>(null);
  const [eligibleTasksCount, setEligibleTasksCount] = useState(0);

  // Check for eligible tasks when component mounts or projectId changes
  useEffect(() => {
    const checkEligibleTasks = async () => {
      if (!session?.user?.id || !projectId) return;

      try {
        const res = await fetch(`/api/dashboard/invoice-meta/projects?freelancerId=${session.user.id}`);
        const projects = await res.json();

        const currentProject = projects.find((p: any) => p.projectId === projectId);

        if (currentProject) {
          setHasEligibleTasks(currentProject.hasAvailableMilestones);
          setEligibleTasksCount(currentProject.availableTasksCount || 0);
        } else {
          setHasEligibleTasks(false);
          setEligibleTasksCount(0);
        }
      } catch (error) {
        console.error('Error checking eligible tasks:', error);
        setHasEligibleTasks(false);
        setEligibleTasksCount(0);
      }
    };

    checkEligibleTasks();
  }, [session?.user?.id, projectId]);

  const handleGenerateInvoice = async () => {
    if (!session?.user?.id) {
      alert('Please log in to generate an invoice');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/invoices/generate-for-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          freelancerId: Number(session.user.id)
        }),
      });

      const result = await res.json();

      if (res.ok) {
        // Redirect to send-invoice page
        router.push(`/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/${result.invoiceNumber}`);
      } else {
        throw new Error(result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert(`Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs lg:max-w-none mt-6">
      {/* Generate Invoice Button */}
      <button
        onClick={handleGenerateInvoice}
        disabled={generating || hasEligibleTasks === false}
        className="w-full bg-[#120008] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition"
        title={hasEligibleTasks === false ? 'No eligible tasks available for invoicing' : ''}
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Generating...
          </>
        ) : hasEligibleTasks === null ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Checking...
          </>
        ) : hasEligibleTasks === false ? (
          <>
            <FilePlus2 size={16} className="opacity-50" />
            No Tasks to Invoice
          </>
        ) : (
          <>
            <FilePlus2 size={16} />
            Generate Invoice ({eligibleTasksCount} task{eligibleTasksCount !== 1 ? 's' : ''})
          </>
        )}
      </button>

      {/* Request Pause/Re-Activation Button */}
      {projectStatus?.toLowerCase() === 'paused' ? (
        <button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition">
          <Play size={16} />
          Request Project Re-Activation
        </button>
      ) : (
        <button className="w-full bg-gray-800 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 hover:opacity-90 transition">
          <PauseCircle size={16} />
          Request Project Pause
        </button>
      )}

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