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
  const [latestUnpaidInvoice, setLatestUnpaidInvoice] = useState<string | null>(null);
  const [payInvoiceEnabled, setPayInvoiceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch project details and check for unpaid invoices
    const fetchProjectData = async () => {
      try {
        // Fetch project details to get the freelancer ID
        const projectRes = await fetch(`/api/projects`);
        if (projectRes.ok) {
          const projects = await projectRes.json();
          const project = projects.find((p: any) => p.projectId === projectId);
          if (project?.freelancerId) {
            setFreelancerId(project.freelancerId);
          }
        }

        // Fetch invoices and project tasks to validate payment eligibility
        const [invoicesRes, projectTasksRes] = await Promise.all([
          fetch(`/api/invoices`),
          fetch(`/api/project-tasks`)
        ]);

        if (invoicesRes.ok && projectTasksRes.ok) {
          const invoices = await invoicesRes.json();
          const projectTasksData = await projectTasksRes.json();

          // Find project tasks
          const projectTasks = projectTasksData.find((pt: any) => pt.projectId === projectId);

          if (projectTasks) {
            // Get approved tasks that don't have paid invoices
            const approvedTasks = projectTasks.tasks.filter((task: any) => task.status === 'Approved');

            // Find invoices for approved tasks that are ready for payment
            const eligibleInvoices = invoices.filter((inv: any) => {
              if (inv.projectId !== projectId || inv.status !== 'sent') return false;

              // For completion-based projects, ensure the invoice corresponds to an approved task
              const correspondingTask = approvedTasks.find((task: any) =>
                task.order === inv.milestoneNumber ||
                inv.milestoneDescription.includes(task.title) ||
                task.title.includes(inv.milestoneDescription)
              );

              return correspondingTask !== undefined;
            });

            if (eligibleInvoices.length > 0) {
              // Sort by milestone number to get the latest eligible invoice
              eligibleInvoices.sort((a: any, b: any) => b.milestoneNumber - a.milestoneNumber);
              setLatestUnpaidInvoice(eligibleInvoices[0].invoiceNumber);
              setPayInvoiceEnabled(true);
            } else {
              setPayInvoiceEnabled(false);
            }
          } else {
            setPayInvoiceEnabled(false);
          }
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const getMessageUrl = () => {
    if (!session?.user?.id || !freelancerId) {
      return '/commissioner-dashboard/messages';
    }
    return `/commissioner-dashboard/messages?contact=${freelancerId}`;
  };

  const handlePayInvoiceClick = () => {
    if (!payInvoiceEnabled || !latestUnpaidInvoice) {
      alert('No invoices are ready for payment.');
      return;
    }

    // Navigate to pay-invoice page with the latest unpaid invoice
    window.location.href = `/commissioner-dashboard/projects-and-invoices/invoices/pay-invoice?invoice=${latestUnpaidInvoice}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs lg:max-w-none mt-6">
      {/* Pay Invoice Button */}
      <button
        onClick={handlePayInvoiceClick}
        disabled={!payInvoiceEnabled || loading}
        className={`w-full text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition ${
          payInvoiceEnabled && !loading
            ? 'bg-[#120008] hover:opacity-90 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={!payInvoiceEnabled ? 'No invoices ready for payment' : 'Pay the latest invoice'}
      >
        <CreditCard size={16} />
        {loading ? 'Loading...' : 'Pay Invoice'}
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