

'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PauseCircle, FileText, MessageSquareText, FilePlus2, Play } from 'lucide-react';
import { useSuccessToast, useErrorToast, useInfoToast, useConfirmation } from '@/components/ui/toast';

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
  const [pauseRequestState, setPauseRequestState] = useState<'none' | 'requesting' | 'pending' | 'sent'>('none');
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [remainingTasks, setRemainingTasks] = useState(0);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();
  const showInfoToast = useInfoToast();
  const showConfirmation = useConfirmation();

  // Check for eligible tasks when component mounts or projectId changes
  useEffect(() => {
    const checkEligibleTasks = async () => {
      if (!session?.user?.id || !projectId) return;

      try {
        const res = await fetch(`/api/dashboard/invoice-meta/projects?freelancerId=${session.user.id}`);
        const projectsResponse = await res.json();

        // Ensure projects is always an array
        const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
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

  // Fetch project details and check pause request status
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;

      try {
        // Fetch project details
        const projectRes = await fetch(`/api/projects`);
        if (projectRes.ok) {
          const projectsResponse = await projectRes.json();
          // Ensure projects is always an array
          const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
          const project = projects.find((p: any) => p.projectId === projectId);
          if (project) {
            setProjectTitle(project.title || 'Project');
          }
        }

        // Fetch project tasks to get remaining count
        const tasksRes = await fetch(`/api/project-tasks`);
        if (tasksRes.ok) {
          const projectTasksResponse = await tasksRes.json();
          // Ensure projectTasksData is always an array
          const projectTasksData = Array.isArray(projectTasksResponse) ? projectTasksResponse : [];
          const projectTasks = projectTasksData.find((pt: any) => pt.projectId === projectId);
          if (projectTasks) {
            const remaining = projectTasks.tasks?.filter((task: any) => !task.completed).length || 0;
            setRemainingTasks(remaining);
          }
        }

        // TODO: Check for existing pause requests in notifications
        // This would require checking the notifications API for pending pause requests

      } catch (error) {
        console.error('Error fetching project details:', error);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  const handleGenerateInvoice = async () => {
    if (!session?.user?.id) {
      showErrorToast('Authentication Required', 'Please log in to generate an invoice');
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
      showErrorToast('Invoice Generation Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePauseRequest = async () => {
    if (!session?.user?.id || !projectTitle) {
      showErrorToast('Request Failed', 'Unable to send pause request. Please try again.');
      return;
    }

    setPauseRequestState('requesting');
    try {
      const response = await fetch('/api/projects/pause', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          freelancerId: Number(session.user.id),
          projectTitle,
          reason: 'Freelancer requested project pause'
        })
      });

      const result = await response.json();

      if (response.ok) {
        setPauseRequestState('sent');
        setCurrentRequestId(result.requestId);
        showSuccessToast('Request Sent', 'Pause request sent successfully. The commissioner will be notified.');
      } else {
        throw new Error(result.error || 'Failed to send pause request');
      }
    } catch (error) {
      console.error('Error sending pause request:', error);
      showErrorToast('Request Failed', `Failed to send pause request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPauseRequestState('none');
    }
  };

  const handleSendReminder = async () => {
    if (!session?.user?.id || !currentRequestId) {
      showErrorToast('Reminder Failed', 'Unable to send reminder. Please try again.');
      return;
    }

    try {
      const response = await fetch('/api/projects/pause/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          freelancerId: Number(session.user.id),
          projectTitle,
          requestId: currentRequestId
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.autoPaused) {
          showInfoToast('Project Paused', 'Project has been automatically paused after 3 reminders.');
          // Refresh the page to update the project status
          window.location.reload();
        } else {
          showSuccessToast('Reminder Sent', `Reminder sent successfully. You have ${result.remainingReminders} reminder(s) left.`);
        }
      } else {
        throw new Error(result.error || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      showErrorToast('Reminder Failed', `Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!currentRequestId) return;

    showConfirmation({
      title: 'Withdraw Pause Request',
      message: 'Are you sure you want to withdraw your pause request?',
      confirmText: 'Withdraw',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await performWithdrawRequest();
      }
    });
  };

  const performWithdrawRequest = async () => {

    try {
      const response = await fetch(`/api/projects/pause/reminder?projectId=${projectId}&requestId=${currentRequestId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPauseRequestState('none');
        setCurrentRequestId(null);
        showSuccessToast('Request Withdrawn', 'Pause request withdrawn successfully.');
      } else {
        throw new Error('Failed to withdraw request');
      }
    } catch (error) {
      console.error('Error withdrawing request:', error);
      showErrorToast('Withdrawal Failed', 'Failed to withdraw request. Please try again.');
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
      ) : pauseRequestState === 'sent' ? (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-600 text-center">
            Pause request sent. This project has {remainingTasks} milestone-task{remainingTasks !== 1 ? 's' : ''} left.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSendReminder}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow transition"
            >
              Send Reminder
            </button>
            <button
              onClick={handleWithdrawRequest}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow transition"
            >
              Withdraw Request
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handlePauseRequest}
          disabled={pauseRequestState === 'requesting'}
          className="w-full bg-gray-800 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
        >
          {pauseRequestState === 'requesting' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending Request...
            </>
          ) : (
            <>
              <PauseCircle size={16} />
              Request Project Pause
            </>
          )}
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