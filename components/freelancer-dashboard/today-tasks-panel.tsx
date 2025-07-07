'use client';

import { TaskStatus } from '@/lib/projects/tasks/types';



import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { NotesTab } from './notes-tab';
import ProjectNotesExpansion from './project-notes-expansion';
import TaskDetailsModal from './projects-and-invoices/projects/task-details-modal';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import projectData from '../../data/project-tasks.json';
import organizations from '../../data/organizations.json';

type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  important: boolean;
  notes: number;
  projectId: number;
  projectTitle: string;
  projectLogo?: string;
  projectTags?: string[];
  taskDescription: string;
  briefUrl?: string;
  workingFileUrl?: string;
  columnId: 'todo' | 'upcoming' | 'review';
};

type Project = {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
};

type Organization = {
  id: number;
  name: string;
  logo: string;
};

const tabs = ['All', 'Important', 'Notes'] as const;

const statusColors: Record<TaskStatus, string> = {
  Approved: 'bg-green-100 text-green-700',
  'In review': 'bg-red-100 text-red-700',
  Ongoing: 'bg-yellow-100 text-yellow-800',
  Submitted: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-gray-100 text-gray-600',
};

export default function TodayTasksPanel() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);



  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchAll = async () => {
      try {
        const [taskRes, notesRes] = await Promise.all([
          fetch(`/api/dashboard/tasks-summary?id=${session.user.id}`),
          fetch(`/api/dashboard/project-notes/count?userId=${session.user.id}`),
        ]);

        const taskData = await taskRes.json();
        const notes = await notesRes.json();

        const enriched = taskData.map((task: Task) => ({
          ...task,
          notes: notes.taskIds.includes(task.id) ? 1 : 0,
        }));

        setTasks(enriched);
      } catch (err) {
        console.error('❌ Failed to load today-tasks-panel:', err);
      }
    };

    fetchAll();
  }, [session?.user?.id]);

  const countAll = tasks.length;
  const countImportant = tasks.filter((t) => t.important).length;
  const countNotes = tasks.filter((t) => t.notes > 0).length;

  const displayed = tasks
    .filter((task) => {
      switch (activeTab) {
        case 'Important':
          return task.important;
        case 'Notes':
          return task.notes > 0;
        default:
          return true;
      }
    })
    .slice(0, 5);

  const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  let enrichedTask = null;
  if (activeTask) {
    const project = (projectData as Project[]).find((p) => p.projectId === activeTask.projectId);
    const org = (organizations as Organization[]).find((o) => o.id === project?.organizationId);

    enrichedTask = {
      ...activeTask,
      projectTags: project?.typeTags || [],
      projectLogo: org?.logo || '',
    };
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Today’s tasks</h2>

      {/* Tabs */}
      <div className="flex items-end border-b mb-4">
        {tabs.map((tab) => {
          let pillCount = '00';
          if (tab === 'All') pillCount = countAll.toString().padStart(2, '0');
          if (tab === 'Important') pillCount = countImportant.toString().padStart(2, '0');
          if (tab === 'Notes') pillCount = countNotes.toString().padStart(2, '0');

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex items-center gap-2 pb-2 border-b-2 mr-6 text-sm font-medium',
                activeTab === tab
                  ? 'text-black border-pink-500'
                  : 'text-gray-600 border-transparent hover:text-black'
              )}
            >
              {tab}
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    tab === 'All'
                      ? 'rgba(235, 25, 102, 0.1)'
                      : 'rgba(220, 220, 220, 0.5)',
                }}
              >
                {pillCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Animated Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeTab === 'Notes' ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <NotesTab
                projectIds={projectIds}
                onExpand={(projectId: number) => setExpandedProject(projectId)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ul className="flex flex-col gap-y-2">
                {displayed.map((task) => (
                  <li
                    key={task.id}
                    className="flex justify-between items-center text-sm cursor-pointer"
                    onClick={() => setActiveTaskId(task.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          'w-5 h-5 rounded-full border flex items-center justify-center',
                          ['Approved', 'In review'].includes(task.status)
                            ? 'bg-pink-500 text-white border-pink-500'
                            : 'border-gray-400'
                        )}
                      >
                        {(['Approved', 'In review'].includes(task.status)) && (
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M5 10l3 3 7-7" />
                          </svg>
                        )}
                      </span>
                      <span>{task.title}</span>
                    </div>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        statusColors[task.status]
                      )}
                    >
                      {task.status}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* View All CTA */}
      <div className="flex justify-end mt-6">
        <Link
          href="/freelancer-dashboard/projects-and-invoices/task-board"
          className="text-sm px-4 py-2 rounded-full border text-gray-800 hover:bg-gray-100 transition"
        >
          View All
        </Link>
      </div>

      {/* Expansion modal */}
      <AnimatePresence>
        {expandedProject !== null && (
          <ProjectNotesExpansion
            projectId={expandedProject}
            onClose={() => setExpandedProject(null)}
          />
        )}
      </AnimatePresence>

      {/* Task Details Modal */}
      {enrichedTask && (
        <TaskDetailsModal
          isOpen={true}
          onClose={() => setActiveTaskId(null)}
          projectLogo={enrichedTask.projectLogo}
          projectTitle={enrichedTask.projectTitle}
          projectTags={enrichedTask.projectTags || []}
          taskIndex={1}
          totalTasks={1}
          taskTitle={enrichedTask.title}
          taskDescription={enrichedTask.taskDescription}
          briefUrl={enrichedTask.briefUrl}
          workingFileUrl={enrichedTask.workingFileUrl}
          columnId={enrichedTask.columnId}
          status={enrichedTask.status}
          projectId={enrichedTask.projectId}
          taskId={enrichedTask.id}
        />
      )}
    </div>
  );
}