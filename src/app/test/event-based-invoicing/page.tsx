'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Task {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  order: number;
  description: string;
}

interface ProjectTask {
  projectId: number;
  title: string;
  organizationId: number;
  tasks: Task[];
  invoicingMethod?: string;
}

export default function EventBasedInvoicingTest() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectTasksRes, projectsRes] = await Promise.all([
          fetch('/api/project-tasks'),
          fetch('/api/projects')
        ]);

        if (projectTasksRes.ok && projectsRes.ok) {
          const projectTasks = await projectTasksRes.json();
          const projectsData = await projectsRes.json();

          // Enrich project tasks with invoicing method
          const enrichedProjects = projectTasks.map((pt: ProjectTask) => {
            const project = projectsData.find((p: any) => p.projectId === pt.projectId);
            return {
              ...pt,
              invoicingMethod: project?.invoicingMethod || 'unknown'
            };
          });

          setProjects(enrichedProjects);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApproveTask = async (projectId: number, taskId: number, taskTitle: string) => {
    if (!session?.user?.id) {
      setMessage('Please log in to approve tasks');
      return;
    }

    setMessage('Approving task and generating invoice...');

    try {
      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          projectId,
          commissionerId: parseInt(session.user.id)
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Task "${taskTitle}" approved! Auto-invoice generation triggered.`);
        
        // Update the task status in the UI
        setProjects(prev => prev.map(project => {
          if (project.projectId === projectId) {
            return {
              ...project,
              tasks: project.tasks.map(task => 
                task.id === taskId 
                  ? { ...task, status: 'Approved', completed: true }
                  : task
              )
            };
          }
          return project;
        }));
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      setMessage('❌ Failed to approve task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      case 'Ongoing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getInvoicingMethodColor = (method: string) => {
    switch (method) {
      case 'milestone': return 'text-purple-600 bg-purple-100';
      case 'completion': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event-Based Invoice System Test</h1>
          <p className="text-gray-600">
            Approve tasks to trigger automatic invoice generation for milestone-based projects.
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.projectId} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{project.title}</h2>
                  <p className="text-sm text-gray-500">Project ID: {project.projectId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getInvoicingMethodColor(project.invoicingMethod || 'unknown')}`}>
                  {project.invoicingMethod || 'unknown'} invoicing
                </span>
              </div>

              <div className="space-y-3">
                {project.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500">{task.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      
                      {task.status !== 'Approved' && project.invoicingMethod === 'milestone' && (
                        <button
                          onClick={() => handleApproveTask(project.projectId, task.id, task.title)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      
                      {project.invoicingMethod === 'completion' && (
                        <span className="text-xs text-gray-500">
                          Completion-based
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
