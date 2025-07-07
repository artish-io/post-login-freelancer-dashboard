'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft, Link2 } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { TaskStatus } from '@/lib/projects/tasks/types';
import useSubmitTask from '@/lib/hooks/useSubmitTask';
import { checkTaskSubmissionRules, type TaskSubmissionRule } from '@/lib/task-submission-rules';
import { checkAndExecuteAutoMovement } from '@/lib/auto-task-movement';

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
  const [referenceUrl, setReferenceUrl] = useState('');
  const [submissionRule, setSubmissionRule] = useState<TaskSubmissionRule>({ canSubmit: true });
  const [checkingRules, setCheckingRules] = useState(false);
  const { submitTask, loading, error, success } = useSubmitTask();

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

  // Check submission rules when modal opens or column changes
  useEffect(() => {
    if (isOpen) {
      setCheckingRules(true);
      checkTaskSubmissionRules(taskId, projectId, columnId)
        .then(setSubmissionRule)
        .finally(() => setCheckingRules(false));
    }
  }, [isOpen, taskId, projectId, columnId]);

  if (!isOpen) return null;

  const isWritable = columnId !== 'review' && status !== 'Approved';

  const handleSubmit = async () => {
    if (!referenceUrl) return;

    // Check submission rules before submitting
    if (!submissionRule.canSubmit) {
      alert(submissionRule.reason || 'Task cannot be submitted at this time.');
      return;
    }

    await submitTask({ projectId, taskId, referenceUrl });

    // Trigger auto-movement after successful submission
    try {
      const movementResult = await checkAndExecuteAutoMovement();
      if (movementResult.moved) {
        console.log('🔄 Auto-movement executed:', movementResult.message);
        console.log('📋 Moved tasks:', movementResult.movedTasks);
      }
    } catch (error) {
      console.error('Error in auto-movement:', error);
    }

    onTaskSubmitted?.(); // Trigger refresh
    onClose();
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
            src={projectLogo}
            alt="Project logo"
            width={40}
            height={40}
            className="rounded-full border border-gray-300 shrink-0"
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-pink-600 leading-tight">
            {projectTitle}
          </h1>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Develop a web identity in celebration of 10 years of Lagos State Park services. This project should overhaul the current website for the agency, while retaining core overarching messaging.
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
            This task has been approved by the project commissioner. No further edits can be made.
          </p>
        ) : (
          <p className="text-xs text-center text-gray-500 italic">
            This task is currently under review. No edits can be made.
          </p>
        )}
      </motion.div>
    </div>
  );
}