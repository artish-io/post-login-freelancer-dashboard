'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Link2, X } from 'lucide-react';
import clsx from 'clsx';

type TaskToReview = {
  id: number;
  title: string;
  projectId: number;
  projectTitle: string;
  submittedDate: string;
  freelancer: {
    id: number;
    name: string;
    avatar: string;
  };
  version: number;
  description: string;
  link: string;
  briefUrl?: string;
  workingFileUrl?: string;
  projectLogo: string;
  projectTags: string[];
  taskIndex?: number;
  totalTasks?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: TaskToReview;
  onTaskReviewed: () => void;
};

export default function TaskReviewModal({ isOpen, onClose, task, onTaskReviewed }: Props) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('Please add a comment explaining why this task was rejected.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-tasks/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: task.projectId,
          taskId: task.id,
          action: 'reject',
          comment: comment.trim(),
          freelancerId: task.freelancer.id,
          taskTitle: task.title
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reject task');
      }

      onTaskReviewed();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-tasks/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: task.projectId,
          taskId: task.id,
          action: 'complete',
          comment: comment.trim() || undefined,
          freelancerId: task.freelancer.id,
          taskTitle: task.title
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve task');
      }

      onTaskReviewed();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
        {/* Back Button */}
        <div
          className="absolute left-4 top-4 sm:top-6 text-sm text-gray-600 flex items-center gap-1 cursor-pointer"
          onClick={onClose}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 sm:top-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 mt-8">
          <Image
            src={task.projectLogo}
            alt={task.projectTitle}
            width={64}
            height={64}
            className="rounded-xl"
          />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {task.projectTitle}
            </h1>
            <div className="flex flex-wrap gap-2">
              {task.projectTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#FCD5E3', color: '#eb1966' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Project Description */}
        <p className="text-sm text-gray-600 mb-4">
          Develop a web identity in celebration of 10 years of Lagos State Park services. This project should overhaul the current website for the agency, while retaining core overarching messaging.
        </p>

        {/* Links */}
        <div className="flex flex-col gap-2 mb-4">
          {task.briefUrl && (
            <a
              href={task.briefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-pink-600 underline flex items-center gap-1"
            >
              <Link2 className="w-4 h-4" />
              Click here to see full brief
            </a>
          )}
          {task.workingFileUrl && (
            <a
              href={task.workingFileUrl}
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
            Task {task.taskIndex || 1}/{task.totalTasks || 1}: {task.title}
          </h2>
          <p className="text-sm text-gray-800">{task.description}</p>
        </div>

        {/* Task Reference Link */}
        {task.link && (
          <div className="mb-6">
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-pink-600 underline flex items-center gap-1"
            >
              <Link2 className="w-4 h-4" />
              Click here to see task reference
            </a>
          </div>
        )}

        {/* Freelancer Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Image
              src={task.freelancer.avatar}
              alt={task.freelancer.name}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Submitted by {task.freelancer.name}
              </p>
              <p className="text-xs text-gray-500">
                Version {task.version}
              </p>
            </div>
          </div>
        </div>

        {/* Comment Section */}
        <div className="mb-6">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Add comment (optional for approval, required for rejection)
          </label>
          <div className="w-full rounded-xl border border-gray-300 p-4">
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your feedback or comments..."
              className="w-full outline-none text-sm bg-transparent placeholder-gray-400 resize-none"
              rows={4}
              maxLength={300}
            />
            <div className="text-xs text-gray-400 mt-2 text-right">
              {comment.length}/300
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Mark As Completed'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
