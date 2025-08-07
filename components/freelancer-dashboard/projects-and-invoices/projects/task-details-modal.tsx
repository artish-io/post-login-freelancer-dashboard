'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft, Link2 } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useSession } from 'next-auth/react';
import type { TaskStatus } from '@/lib/projects/tasks/types';
import useSubmitTask from '@/lib/hooks/useSubmitTask';
import { checkTaskSubmissionRules, type TaskSubmissionRule } from '@/lib/task-submission-rules';
import { checkAndExecuteAutoMovement } from '@/lib/auto-task-movement';
import { useErrorToast } from '@/components/ui/toast';
import { requireFreelancerSession, isValidFreelancerTask } from '@/lib/freelancer-access-control';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectLogo: string;
  projectTitle: string;
  projectTags?: string[];
  taskIndex: number;
  totalTasks: number;
  taskTitle: string;
  taskDescription: string;
  briefUrl?: string;
  workingFileUrl?: string;
  columnId: 'todo' | 'upcoming' | 'review';
  status: TaskStatus;
  projectId: number;
  taskId: number;
  onTaskSubmitted?: () => void;
};

export default function TaskDetailsModal({
  isOpen,
  onClose,
  projectLogo,
  projectTitle,
  projectTags = [],
  taskIndex,
  totalTasks,
  taskTitle,
  taskDescription,
  briefUrl,
  workingFileUrl,
  columnId,
  status,
  projectId,
  taskId,
  onTaskSubmitted,
}: Props) {
  const { data: session } = useSession();
  const [referenceUrl, setReferenceUrl] = useState('');
  const [submissionRule, setSubmissionRule] = useState<TaskSubmissionRule>({ canSubmit: true });
  const [checkingRules, setCheckingRules] = useState(false);
  const [, setIsProjectPaused] = useState(false);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const { submitTask, loading, error, success } = useSubmitTask();
  const showErrorToast = useErrorToast();

  // Ensure user is a freelancer and has access to this task
  const freelancerSession = requireFreelancerSession(session?.user as any);
  const hasTaskAccess = freelancerSession && projectInfo && isValidFreelancerTask({
    project: {
      freelancerId: projectInfo?.freelancerId,
      assignedFreelancerId: projectInfo?.assignedFreelancerId
    }
  }, freelancerSession);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Check submission rules and project status when modal opens or column changes
  useEffect(() => {
    if (isOpen) {
      setCheckingRules(true);

      const checkRulesAndProjectStatus = async () => {
        try {
          // Check if project is paused
          let isPaused = false;
          try {
            const projectsRes = await fetch('/api/projects');
            if (projectsRes.ok) {
              const projects = await projectsRes.json();
              const currentProject = projects.find((p: any) => p.projectId === projectId);
              setProjectInfo(currentProject);

              isPaused = currentProject?.status?.toLowerCase() === 'paused';
              setIsProjectPaused(isPaused);

              if (isPaused) {
                setSubmissionRule({
                  canSubmit: false,
                  reason: 'This project is paused. Contact project commissioner for more information.'
                });
                return;
              }
            } else {
              console.warn('⚠️ Failed to fetch project status info for modal, proceeding with normal rules');
            }
          } catch (projectError) {
            console.warn('⚠️ Error fetching project status info for modal:', projectError);
          }

          // If project is not paused (or status unknown), check normal submission rules
          const rule = await checkTaskSubmissionRules(taskId, projectId, columnId);
          setSubmissionRule(rule);
        } catch (error) {
          console.error('Error checking submission rules:', error);
          setSubmissionRule({
            canSubmit: false,
            reason: 'Error checking submission rules. Please try again.'
          });
        } finally {
          setCheckingRules(false);
        }
      };

      checkRulesAndProjectStatus();
    }
  }, [isOpen, taskId, projectId, columnId]);

  if (!isOpen) return null;

  // Task is writable only if it's in 'Ongoing' status (not submitted, not approved, not rejected)
  const isWritable = status === 'Ongoing';

  const handleSubmit = async () => {
    if (!referenceUrl) return;

    // Security check: Ensure user has access to this task
    if (!freelancerSession) {
      showErrorToast('Access Denied', 'Freelancer authentication required.');
      return;
    }

    if (!hasTaskAccess) {
      showErrorToast('Access Denied', 'You do not have permission to submit this task.');
      return;
    }

    // Check submission rules before submitting
    if (!submissionRule.canSubmit) {
      showErrorToast('Cannot Submit Task', submissionRule.reason || 'Task cannot be submitted at this time.');
      return;
    }

    await submitTask({ projectId, taskId, referenceUrl });

    // Immediate callback for optimistic updates
    onTaskSubmitted?.();

    // Close modal immediately for better UX
    onClose();

    // Trigger auto-movement in background (non-blocking)
    setTimeout(async () => {
      try {
        const movementResult = await checkAndExecuteAutoMovement();
        if (movementResult.moved) {
          console.log('🔄 Auto-movement executed:', movementResult.message);
          console.log('📋 Moved tasks:', movementResult.movedTasks);
        }
      } catch (error) {
        console.error('Error in auto-movement:', error);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center px-2 sm:px-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={clsx(
          'bg-white w-full rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative border border-gray-200 overflow-y-auto',
          'max-h-[90vh] sm:max-w-2xl'
        )}
      >
        {/* Back */}
        <div
          className="absolute left-4 top-4 sm:top-6 text-sm text-gray-600 flex items-center gap-1 cursor-pointer"
          onClick={onClose}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 sm:top-6 text-gray-400 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4 mt-12 sm:mt-14">
          {projectTags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Logo + Title */}
        <div className="flex items-start gap-3 sm:gap-4 mb-2">
          <Image
            src={projectLogo || '/logos/fallback-logo.png'}
            alt="Project logo"
            width={40}
            height={40}
            className="rounded-full border border-gray-300 shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logos/fallback-logo.png';
            }}
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-pink-600 leading-tight">
            {projectTitle}
          </h1>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {taskDescription || 'No description provided for this task.'}
        </p>

        {/* Links */}
        <div className="flex flex-col gap-2 mb-6">
          {briefUrl && (
            <a
              href={briefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-pink-600 underline flex items-center gap-1"
            >
              <Link2 className="w-4 h-4" />
              Click here to see full brief
            </a>
          )}
          {workingFileUrl && (
            <a
              href={workingFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-700 underline flex items-center gap-1"
            >
              <Link2 className="w-4 h-4" />
              Working file link
            </a>
          )}
        </div>

        {/* Task Section */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-pink-600 mb-1">
            Task {taskIndex}/{totalTasks}: {taskTitle}
          </h2>
          <p className="text-sm text-gray-800">{taskDescription}</p>
        </div>

        {/* Reference Input */}
        {isWritable && (
          <div className="w-full rounded-xl border border-gray-300 flex items-center px-4 py-3 mb-6">
            <input
              type="url"
              placeholder="Link to reference file"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400"
            />
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        )}

        {/* CTA or Lock Message */}
        {isWritable ? (
          <>
            {/* Submission Rules Warning */}
            {!submissionRule.canSubmit && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">{submissionRule.reason}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className={clsx(
                "w-full rounded-xl py-3 text-sm font-medium transition",
                submissionRule.canSubmit && !loading
                  ? "bg-black text-white hover:opacity-90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
              disabled={loading || checkingRules || !submissionRule.canSubmit}
            >
              {checkingRules
                ? "Checking submission rules..."
                : loading
                ? "Submitting..."
                : "Submit for Review"
              }
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            {success && <p className="text-xs text-green-600 mt-2">Task submitted successfully.</p>}
          </>
        ) : status === 'Approved' ? (
          <p className="text-xs text-center text-gray-500 italic">
            ✅ This task has been approved by the project commissioner. No further edits can be made.
          </p>
        ) : status === 'In review' ? (
          <p className="text-xs text-center text-gray-500 italic">
            ⏳ This task is currently under review. No edits can be made.
          </p>
        ) : status === 'Rejected' ? (
          <p className="text-xs text-center text-red-500 italic">
            ❌ This task was rejected. Please review the feedback and resubmit.
          </p>
        ) : (
          <p className="text-xs text-center text-gray-500 italic">
            This task cannot be edited at this time.
          </p>
        )}
      </motion.div>
    </div>
  );
}