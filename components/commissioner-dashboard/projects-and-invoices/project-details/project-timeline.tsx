'use client';
// Commissioner project timeline component

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Circle } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  comments?: string;
  date?: string;
  status: string;
  dueDate: string;
  description?: string;
}

interface Props {
  projectId: number;
  title: string;
  logoUrl: string;
  onNotesClick: () => void;
}

export default function CommissionerProjectTimeline({ projectId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        // Use the existing project-tasks API
        const res = await fetch('/api/project-tasks');
        const allProjects = await res.json();

        // Find the specific project
        const project = allProjects.find((p: any) => p.projectId === projectId);

        if (project && Array.isArray(project.tasks)) {
          // Transform tasks to match the expected interface
          const transformedTasks = project.tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            isCompleted: task.completed,
            status: task.status,
            dueDate: task.dueDate,
            description: task.description,
            date: task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : undefined,
            comments: task.feedbackCount > 0 ? `${task.feedbackCount} comment${task.feedbackCount === 1 ? '' : 's'}` : undefined
          }));

          setTasks(transformedTasks);
          console.log(`📋 Loaded ${transformedTasks.length} tasks for project ${projectId}`);
        } else {
          console.warn(`⚠️ No project found with ID ${projectId}`);
          setTasks([]);
        }
      } catch (error) {
        console.error('❌ Error loading tasks:', error);
        setTasks([]);
      }
    };

    if (projectId) {
      fetchTimeline();
    }
  }, [projectId]);

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const percentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="relative">
      {/* Timeline */}
      <div className="relative px-8 pb-10">
        <ul className="space-y-10 relative">
          <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />
          {tasks.map((task) => (
            <li key={task.id} className="relative flex items-start gap-6">
              <div className="relative z-10 mt-1.5">
                <div className="w-8 h-8 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                  {task.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-gray-700" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="text-sm max-w-full">
                {task.date && (
                  <p className="text-xs italic text-gray-500 mb-1">
                    {format(new Date(task.date), 'MMM d, yyyy')}
                  </p>
                )}
                <h3 className="text-[1.125rem] font-normal text-gray-900 leading-tight">
                  {task.title}
                </h3>
                {task.comments && (
                  <p className="text-gray-700 text-[0.95rem] leading-snug max-w-prose mt-1">
                    {task.comments}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress Bar at Bottom */}
      <div className="mt-8 w-full bg-gray-100 border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-1 text-sm text-pink-600 font-medium">
          <span>{completedCount} of {tasks.length} Tasks completed</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-pink-200">
          <div
            className="h-full bg-pink-600 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
