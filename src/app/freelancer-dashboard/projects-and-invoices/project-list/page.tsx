"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import ProjectsRow from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-status-list/projects-row';
import ProjectStatusNav from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-status-list/project-status-nav';
import type { Project } from '../../../../lib/projects/tasks/types';

// Helper function to calculate project status based on tasks
function calculateProjectStatus(project: any): 'ongoing' | 'paused' | 'completed' {
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((task: any) => task.completed).length;
  const totalTasks = tasks.length;

  if (totalTasks === 0) return 'paused';
  if (completedTasks === totalTasks) return 'completed';

  // Check if project has recent activity (tasks in review or recently updated)
  const hasRecentActivity = tasks.some((task: any) =>
    task.status === 'In review' || task.status === 'Ongoing'
  );

  return hasRecentActivity ? 'ongoing' : 'paused';
}

export default function ProjectListPage() {
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'ongoing';
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const [projectRes, userRes, orgRes] = await Promise.all([
          fetch('/api/project-tasks'),
          fetch('/api/users'),
          fetch('/api/organizations')
        ]);

        if (projectRes.ok && userRes.ok && orgRes.ok) {
          const projectData = await projectRes.json();
          const users = await userRes.json();
          const organizations = await orgRes.json();

          console.log('🔍 Debug - Fetched data:', {
            projectCount: projectData.length,
            userCount: users.length,
            orgCount: organizations.length
          });

          // Transform project-tasks data to include status and other required fields
          const transformedProjects = projectData.map((project: any) => {
            const tasks = project.tasks || [];
            const completedTasks = tasks.filter((task: any) => task.completed).length;
            const totalTasks = tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Get earliest due date from incomplete tasks
            const incompleteTasks = tasks.filter((task: any) => !task.completed);
            const dueDate = incompleteTasks.length > 0
              ? incompleteTasks.map((task: any) => task.dueDate).sort()[0]
              : null;

            // Find the organization and its contact person (commissioner)
            const organization = organizations.find((org: any) => org.id === project.organizationId);
            const managerId = organization?.contactPersonId || null;

            // Calculate completion date for completed projects
            const projectStatus = calculateProjectStatus(project);
            let completionDate = null;

            if (projectStatus === 'completed') {
              // Find the latest completion date from completed tasks
              const completedTasks = tasks.filter((task: any) => task.completed);
              if (completedTasks.length > 0) {
                // Use the latest task completion as project completion
                // For now, we'll estimate it as the latest due date of completed tasks
                const latestCompletedDate = completedTasks
                  .map((task: any) => task.dueDate)
                  .sort()
                  .pop();
                completionDate = latestCompletedDate;
              }
            }

            return {
              ...project,
              status: projectStatus,
              totalTasks,
              progress,
              dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date',
              completionDate: completionDate ? new Date(completionDate).toLocaleDateString() : null,
              managerId, // Add the managerId for commissioner lookup
              manager: {
                name: project.typeTags?.join(', ') || 'No manager assigned'
              }
            };
          });

          console.log('🔍 Debug - Transformed projects:', {
            transformedCount: transformedProjects.length,
            firstProject: transformedProjects[0],
            statuses: transformedProjects.map((p: any) => p.status)
          });

          setProjects(transformedProjects);
          setUsers(users);
          setOrganizations(organizations);
        } else {
          console.error('Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <section className="flex flex-col gap-3 p-4 md:p-6">
        <FreelancerHeader />
        <h2 className="text-[30px] font-normal mb-2 mt-2">Project Status</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading projects...</div>
        </div>
      </section>
    );
  }

  // Debug logging
  console.log('🔍 Debug - Rendering ProjectsRow:', {
    projectCount: projects.length,
    currentStatus,
    userCount: users.length,
    projectStatuses: projects.map((p: any) => ({ id: p.projectId, status: p.status }))
  });

  return (
    <section className="flex flex-col gap-3 p-4 md:p-6">
      {/* User Info Header */}
      <FreelancerHeader />

      {/* Main Layout */}
      {/* Visual Heading */}
      <h2 className="text-[30px] font-normal mb-2 mt-2">Project Status</h2>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-[240px] shrink-0 pt-2">
          <div className="mb-3">
            <ProjectStatusNav />
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] mt-2 space-y-2 pr-2">
          <ProjectsRow
            projects={projects}
            filterStatus={currentStatus as 'ongoing' | 'paused' | 'completed'}
            users={users}
          />
        </div>
      </div>
    </section>
  );
}