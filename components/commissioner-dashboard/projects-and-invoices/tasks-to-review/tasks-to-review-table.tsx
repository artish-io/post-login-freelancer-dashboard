'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  tasks: TaskToReview[];
  onTaskClick: (task: TaskToReview) => void;
  loading: boolean;
};

const PER_PAGE = 10;

export default function TasksToReviewTable({ tasks, onTaskClick, loading }: Props) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(tasks.length / PER_PAGE));
  const startIndex = (currentPage - 1) * PER_PAGE;
  const endIndex = startIndex + PER_PAGE;
  const currentTasks = tasks.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const formatSubmissionTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks to review</h3>
          <p className="text-gray-600">All submitted tasks have been reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-sm font-medium text-gray-700">Task</div>
          <div className="text-sm font-medium text-gray-700">Submitted</div>
          <div className="text-sm font-medium text-gray-700">Freelancer</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        <AnimatePresence mode="wait">
          {currentTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onTaskClick(task)}
            >
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Task Column */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {task.taskIndex && task.totalTasks
                      ? `${task.taskIndex}/${task.totalTasks}: ${task.title}`
                      : task.title
                    }
                  </h3>
                  <p className="text-xs text-gray-500">
                    Project ID: #{task.projectId}
                  </p>
                </div>

                {/* Submitted Column */}
                <div className="flex flex-col">
                  <p className="text-sm text-gray-900">
                    {formatSubmissionTime(task.submittedDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Version {task.version}
                  </p>
                </div>

                {/* Freelancer Column */}
                <div className="flex items-center gap-3">
                  <Image
                    src={task.freelancer.avatar}
                    alt={task.freelancer.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-900">
                      {task.freelancer.name}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, tasks.length)} of {tasks.length} tasks
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageClick(pageNumber)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-pink-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
