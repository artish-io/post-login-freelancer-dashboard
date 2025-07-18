'use client';

import Image from 'next/image';
import { MoreHorizontal, Check } from 'lucide-react';
import { useState } from 'react';
import TaskDetailsModal from './task-details-modal';
import { TaskStatus } from '@/lib/projects/tasks/types';


type Props = {
  tag: string;
  title: string;
  description: string;
  avatarUrl: string;
  status: TaskStatus;
  version?: number;
  projectLogo?: string;
  projectTitle?: string;
  projectTags?: string[];
  taskIndex?: number;
  totalTasks?: number;
  briefUrl?: string;
  workingFileUrl?: string;
  columnId: 'todo' | 'upcoming' | 'review';
  projectId?: number;
  taskId?: number;
  onTaskSubmitted?: () => void;
  completed?: boolean;
};

export default function TaskCard({
  tag,
  title,
  description,
  avatarUrl,
  status,
  version = 1,
  projectLogo = '/logos/fallback-logo.png',
  projectTitle = 'Untitled Project',
  projectTags = [],
  taskIndex = 1,
  totalTasks = 1,
  briefUrl = '',
  workingFileUrl = '',
  columnId,
  projectId = 1,
  taskId = 1,
  onTaskSubmitted,
  completed = false,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className="bg-white rounded-xl border shadow-sm px-4 py-3 cursor-pointer hover:shadow-md transition"
      >
        <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1 tracking-wide">
          {columnId === 'review'
            ? `Version ${version}`
            : columnId === 'todo'
            ? `Version ${version + 1}`
            : tag}
        </div>

        <h3 className="text-sm font-medium text-gray-900 leading-tight mb-1">{title}</h3>

        <p className="text-xs text-gray-600 mb-4 line-clamp-3">
          {description || 'No description provided.'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100">
            <Image
              src={projectLogo || '/logos/fallback-logo.png'}
              alt="Project logo"
              width={24}
              height={24}
              className="object-cover rounded-full border border-gray-200"
              unoptimized
              onError={(e) => {
                console.warn('Logo failed to load, using fallback.');
                (e.target as HTMLImageElement).src = '/logos/fallback-logo.png';
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Completed Check Mark */}
            {(completed || status === 'Approved') && (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Placeholder for dropdown/actions
              }}
              className="text-gray-400 hover:text-black transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TaskDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        projectLogo={projectLogo}
        projectTitle={projectTitle}
        projectTags={projectTags}
        taskIndex={taskIndex}
        totalTasks={totalTasks}
        taskTitle={title}
        taskDescription={description}
        briefUrl={briefUrl}
        workingFileUrl={workingFileUrl}
        columnId={columnId}
        status={status}
        projectId={projectId}
        taskId={taskId}
        onTaskSubmitted={onTaskSubmitted}
      />
    </>
  );
}