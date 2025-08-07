'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, MessageSquareText, CreditCard, PauseCircle, Play } from 'lucide-react';

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
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [pausingProject, setPausingProject] = useState(false);
  const [reactivatingProject, setReactivatingProject] = useState(false);

  useEffect(() => {
    // Fetch project details and check for unpaid invoices
    const fetchProjectData = async () => {
      try {
        // Fetch project details to get the freelancer ID
        const projectRes = await fetch(`/api/projects`);
        if (projectRes.ok) {
          const projectsResponse = await projectRes.json();
          // Ensure projects is always an array
          const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
          const project = projects.find((p: any) => p.projectId === projectId);
          if (project?.freelancerId) {
            setFreelancerId(project.freelancerId);
            setProjectStatus(project.status || 'ongoing');
            setProjectTitle(project.title || 'Project');
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

  const handlePauseProject = async () => {
    if (!session?.user?.id || !projectTitle) {
      console.error('Unable to pause project: Missing session or project title');
      return;
    }

    setPausingProject(true);
    try {
      const response = await fetch('/api/projects/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          commissionerId: Number(session.user.id),
          projectTitle
        })
      });

      const result = await response.json();

      if (response.ok) {
        setProjectStatus('paused');
        // Trigger notification refresh for dropdown
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else {
        throw new Error(result.error || 'Failed to pause project');
      }
    } catch (error) {
      console.error('Error pausing project:', error);
    } finally {
      setPausingProject(false);
    }
  };

  const handleReactivateProject = async () => {
    if (!session?.user?.id || !projectTitle) {
      console.error('Unable to reactivate project: Missing session or project title');
      return;
    }

    setReactivatingProject(true);
    try {
      const response = await fetch('/api/projects/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          commissionerId: Number(session.user.id),
          projectTitle
        })
      });

      const result = await response.json();

      if (response.ok) {
        setProjectStatus('ongoing');
        // Trigger notification refresh for dropdown
        window.dispatchEvent(new CustomEvent('notificationRefresh'));
      } else {
        throw new Error(result.error || 'Failed to reactivate project');
      }
    } catch (error) {
      console.error('Error reactivating project:', error);
    } finally {
      setReactivatingProject(false);
    }
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

      {/* Pause Project Button - Only show if project is not already paused */}
      {projectStatus?.toLowerCase() !== 'paused' && (
        <button
          onClick={handlePauseProject}
          disabled={pausingProject || loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition"
        >
          {pausingProject ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Pausing...
            </>
          ) : (
            <>
              <PauseCircle size={16} />
              Pause Project
            </>
          )}
        </button>
      )}

      {/* Re-Activate Project Button - Only show if project is paused */}
      {projectStatus?.toLowerCase() === 'paused' && (
        <button
          onClick={handleReactivateProject}
          disabled={reactivatingProject || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 transition"
        >
          {reactivatingProject ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Reactivating...
            </>
          ) : (
            <>
              <Play size={16} />
              Re-Activate Project
            </>
          )}
        </button>
      )}

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