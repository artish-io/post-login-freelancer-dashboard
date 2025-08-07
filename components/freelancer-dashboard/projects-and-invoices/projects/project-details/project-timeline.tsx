'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Circle } from 'lucide-react';
import TaskDetailsModal from '../task-details-modal';

interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  comments?: string;
  date?: string;
  status: string;
  dueDate: string;
  description?: string;
  briefUrl?: string;
  workingFileUrl?: string;
}

interface Props {
  projectId: number;
  title: string;
  logoUrl: string;
  onNotesClick: () => void;
}

export default function ProjectTimeline({ projectId, title, logoUrl }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        // Use the existing project-tasks API
        const res = await fetch('/api/project-tasks');
        const projectsResponse = await res.json();

        // Ensure allProjects is always an array
        const allProjects = Array.isArray(projectsResponse) ? projectsResponse : [];

        // Find the specific project
        const project = allProjects.find((p: any) => p.projectId === projectId);

        if (project && Array.isArray(project.tasks)) {
          // Transform tasks to match the expected interface
          const transformedTasks = project.tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            isCompleted: task.status === 'Approved' && task.completed, // Only show as completed when approved
            status: task.status,
            dueDate: task.dueDate,
            description: task.description,
            briefUrl: task.briefUrl,
            workingFileUrl: task.workingFileUrl,
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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const handleTaskSubmitted = () => {
    // Refresh the timeline after task submission
    if (projectId) {
      // Refetch the tasks to show updated status
      const fetchTimeline = async () => {
        try {
          const res = await fetch('/api/project-tasks');
          const projectsResponse = await res.json();
          // Ensure allProjects is always an array
          const allProjects = Array.isArray(projectsResponse) ? projectsResponse : [];
          const project = allProjects.find((p: any) => p.projectId === projectId);

          if (project && Array.isArray(project.tasks)) {
            const transformedTasks = project.tasks.map((task: any) => ({
              id: task.id,
              title: task.title,
              isCompleted: task.status === 'Approved' && task.completed, // Only show as completed when approved
              status: task.status,
              dueDate: task.dueDate,
              description: task.description,
              briefUrl: task.briefUrl,
              workingFileUrl: task.workingFileUrl,
              date: task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : undefined,
              comments: task.feedbackCount > 0 ? `${task.feedbackCount} comment${task.feedbackCount === 1 ? '' : 's'}` : undefined
            }));
            setTasks(transformedTasks);
          }
        } catch (error) {
          console.error('Error refreshing timeline:', error);
        }
      };
      fetchTimeline();
    }
  };

  return (
    <div className="relative">
      {/* Timeline */}
      <div className="relative px-8 pb-10">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
            <p className="text-gray-600">Project milestones will appear here once they are created.</p>
          </div>
        ) : (
          <ul className="space-y-10 relative">
            <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />
            {tasks.map((task, index) => (
            <li key={`task-${task.id}-${index}-${projectId}`} className="relative flex items-start gap-6">
              <div className="relative z-10 mt-1.5">
                <div className="w-8 h-8 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                  {task.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-gray-700" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </div>
              <div
                className="text-sm max-w-full cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => handleTaskClick(task)}
              >
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
        )}
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

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          isOpen={showTaskModal}
          onClose={handleCloseModal}
          projectLogo={logoUrl}
          projectTitle={title}
          projectTags={[]}
          taskIndex={tasks.findIndex(t => t.id === selectedTask.id) + 1}
          totalTasks={tasks.length}
          taskTitle={selectedTask.title}
          taskDescription={selectedTask.description || ''}
          briefUrl={selectedTask.briefUrl}
          workingFileUrl={selectedTask.workingFileUrl}
          columnId={selectedTask.status === 'In review' ? 'review' : 'todo'}
          status={selectedTask.status as any}
          projectId={projectId}
          taskId={selectedTask.id}
          onTaskSubmitted={handleTaskSubmitted}
        />
      )}
    </div>
  );
}