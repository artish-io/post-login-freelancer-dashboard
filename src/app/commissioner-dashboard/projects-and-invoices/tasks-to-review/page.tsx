'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import CommissionerHeader from '../../../../../components/commissioner-dashboard/commissioner-header';
import TasksToReviewTable from '../../../../../components/commissioner-dashboard/projects-and-invoices/tasks-to-review/tasks-to-review-table';
import TaskReviewModal from '../../../../../components/commissioner-dashboard/projects-and-invoices/tasks-to-review/task-review-modal';

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

export default function TasksToReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskToReview[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskToReview | null>(null);
  const [commissionerId, setCommissionerId] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login-commissioner');
      return;
    }

    const fetchTasksToReview = async () => {
      try {
        if (!session.user?.id) {
          throw new Error('No user ID found in session');
        }
        const currentCommissionerId = parseInt(session.user.id);
        setCommissionerId(currentCommissionerId);

        // Fetch all necessary data
        const [projectTasksRes, projectsRes, usersRes, organizationsRes] = await Promise.all([
          fetch('/api/project-tasks'),
          fetch('/api/projects'),
          fetch('/api/users'),
          fetch('/api/organizations')
        ]);

        if (!projectTasksRes.ok || !projectsRes.ok || !usersRes.ok || !organizationsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [projectTasksData, projectsData, usersData, organizationsData] = await Promise.all([
          projectTasksRes.json(),
          projectsRes.json(),
          usersRes.json(),
          organizationsRes.json()
        ]);

        const reviewTasks: TaskToReview[] = [];

        // Process each project
        projectTasksData.forEach((project: any) => {
          // Find the corresponding project info from projects.json
          const projectInfo = projectsData.find((p: any) => p.projectId === project.projectId);

          if (!projectInfo) return;

          // Only include projects from the current commissioner's organization
          const organization = organizationsData.find((org: any) => org.id === project.organizationId);
          if (!organization || organization.contactPersonId !== currentCommissionerId) return;

          // Only include tasks from ongoing projects (not Completed or Paused)
          if (projectInfo && !['Completed', 'Paused'].includes(projectInfo.status)) {
            // Find the freelancer for this project
            const freelancer = usersData.find((user: any) => user.id === projectInfo.freelancerId);

            if (!freelancer) return;

            project.tasks?.forEach((task: any, index: number) => {
              if (task.status === 'In review') {
                reviewTasks.push({
                  id: task.id,
                  title: task.title,
                  projectId: project.projectId,
                  projectTitle: project.title,
                  submittedDate: task.submittedDate || task.dueDate, // Use submittedDate if available, fallback to dueDate
                  freelancer: {
                    id: freelancer.id,
                    name: freelancer.name,
                    avatar: freelancer.avatar || '/default-avatar.png'
                  },
                  version: task.version || 1,
                  description: task.description || '',
                  link: task.link || '',
                  briefUrl: task.briefUrl,
                  workingFileUrl: task.workingFileUrl,
                  projectLogo: organization.logo || '/logos/default-org.png',
                  projectTags: project.typeTags || [],
                  taskIndex: task.order || (index + 1),
                  totalTasks: project.tasks?.length || 1
                });
              }
            });
          }
        });

        setTasks(reviewTasks);
      } catch (error) {
        console.error('Error fetching tasks to review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksToReview();
  }, [session, status, router]);

  const handleTaskClick = (task: TaskToReview) => {
    setSelectedTask(task);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  const handleTaskReviewed = () => {
    // Refresh the tasks list after a task is reviewed
    setSelectedTask(null);
    // Trigger a re-fetch by updating the loading state
    setLoading(true);
    setTimeout(() => {
      window.location.reload(); // Simple refresh for now
    }, 500);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
      {/* Commissioner Header - sits right under top navbar */}
      <CommissionerHeader />

      {/* Page Content */}
      <div className="mt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tasks To Review</h1>
          <p className="text-gray-600 mt-1">
            Review and approve tasks submitted by freelancers
          </p>
        </div>

        <TasksToReviewTable
          tasks={tasks}
          onTaskClick={handleTaskClick}
          loading={loading}
        />
      </div>

      {/* Task Review Modal */}
      {selectedTask && (
        <TaskReviewModal
          isOpen={true}
          onClose={handleCloseModal}
          task={selectedTask}
          onTaskReviewed={handleTaskReviewed}
        />
      )}
    </div>
  );
}