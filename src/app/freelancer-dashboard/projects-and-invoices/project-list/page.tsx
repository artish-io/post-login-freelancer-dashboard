"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import FreelancerHeader from '../../../../../components/freelancer-dashboard/freelancer-header';
import ProjectsRow from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-status-list/projects-row';
import ProjectStatusNav from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/project-status-list/project-status-nav';
import { calculateProjectProgress, calculateProjectStatus } from '../../../../lib/project-status-sync';

export default function ProjectListPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'ongoing';
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const [projectTasksRes, projectsRes, userRes, orgRes] = await Promise.all([
          fetch('/api/project-tasks'),
          fetch('/api/projects'),
          fetch('/api/users'),
          fetch('/api/organizations')
        ]);

        // Check each response individually for better error reporting
        if (!projectTasksRes.ok) {
          console.error('Failed to fetch project-tasks:', projectTasksRes.status, projectTasksRes.statusText);
        }
        if (!projectsRes.ok) {
          console.error('Failed to fetch projects:', projectsRes.status, projectsRes.statusText);
        }
        if (!userRes.ok) {
          console.error('Failed to fetch users:', userRes.status, userRes.statusText);
        }
        if (!orgRes.ok) {
          console.error('Failed to fetch organizations:', orgRes.status, orgRes.statusText);
        }

        if (projectTasksRes.ok && projectsRes.ok && userRes.ok && orgRes.ok) {
          const projectTasksData = await projectTasksRes.json();
          const projectsData = await projectsRes.json();
          const users = await userRes.json();
          const organizations = await orgRes.json();

          console.log('🔍 Debug - Fetched data:', {
            projectTasksCount: projectTasksData.length,
            projectsCount: projectsData.length,
            userCount: users.length,
            orgCount: organizations.length
          });

          // Transform project-tasks data and merge with projects.json status
          const transformedProjects = projectTasksData.map((projectTasks: any) => {
            // Find the corresponding project from projects.json
            const projectInfo = projectsData.find((p: any) => p.projectId === projectTasks.projectId);
            const tasks = projectTasks.tasks || [];
            const totalTasks = tasks.length;
            const progress = calculateProjectProgress(tasks);

            // Get due date from projects.json if available, otherwise from earliest incomplete task
            let dueDate = projectInfo?.dueDate || null;
            if (!dueDate) {
              const incompleteTasks = tasks.filter((task: any) => !task.completed);
              dueDate = incompleteTasks.length > 0
                ? incompleteTasks.map((task: any) => task.dueDate).sort()[0]
                : null;
            }

            // Find the organization and its contact person (commissioner)
            const organization = organizations.find((org: any) => org.id === projectTasks.organizationId);
            const managerId = organization?.contactPersonId || null;

            // Calculate completion date for completed projects
            // Use actual status from projects.json if available, otherwise calculate it
            let projectStatus: 'ongoing' | 'paused' | 'completed';
            if (projectInfo?.status) {
              // Map projects.json status to display status
              const normalizedStatus = projectInfo.status.toLowerCase();
              console.log(`🔍 Project ${projectTasks.projectId}: Found status "${projectInfo.status}" -> normalized to "${normalizedStatus}"`);

              // Simplified status mapping - only three statuses now
              if (normalizedStatus === 'ongoing') {
                projectStatus = 'ongoing';
                console.log(`✅ Using ongoing status from projects.json`);
              } else if (normalizedStatus === 'paused') {
                projectStatus = 'paused';
                console.log(`✅ Using paused status from projects.json`);
              } else if (normalizedStatus === 'completed') {
                projectStatus = 'completed';
                console.log(`✅ Using completed status from projects.json`);
              } else {
                // Fallback to calculated status if status is not recognized
                projectStatus = calculateProjectStatus(tasks);
                console.log(`⚠️ Unrecognized status "${normalizedStatus}", calculated: ${projectStatus}`);
              }
            } else {
              // Fallback to calculated status if no status in projects.json
              projectStatus = calculateProjectStatus(tasks);
              console.log(`📊 No status in projects.json for project ${projectTasks.projectId}, calculated: ${projectStatus}`);
            }
            let completionDate = null;

            if (projectStatus === 'completed') {
              // Find the latest completion date from approved tasks
              const approvedTasks = tasks.filter((task: any) => task.status === 'Approved');
              if (approvedTasks.length > 0) {
                // Use the latest task approval as project completion
                // For now, we'll estimate it as the latest due date of approved tasks
                const latestApprovedDate = approvedTasks
                  .map((task: any) => task.dueDate)
                  .sort()
                  .pop();
                completionDate = latestApprovedDate;
              }
            }

            return {
              ...projectTasks,
              // Override with data from projects.json if available
              ...(projectInfo || {}),
              status: projectStatus,
              totalTasks,
              progress,
              dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date',
              completionDate: completionDate ? new Date(completionDate).toLocaleDateString() : null,
              managerId, // Add the managerId for commissioner lookup
              manager: {
                name: projectInfo?.typeTags?.join(', ') || projectTasks.typeTags?.join(', ') || 'No manager assigned'
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
        } else if (projectTasksRes.ok && userRes.ok && orgRes.ok) {
          // Fallback: Use project-tasks data even if projects.json fails
          console.warn('⚠️ Projects.json failed, using project-tasks data only');
          const projectTasksData = await projectTasksRes.json();
          const users = await userRes.json();
          const organizations = await orgRes.json();

          // Transform without projects.json data (use calculated status)
          const transformedProjects = projectTasksData.map((projectTasks: any) => {
            const tasks = projectTasks.tasks || [];
            const totalTasks = tasks.length;
            const progress = calculateProjectProgress(tasks);

            // Get due date from earliest incomplete task
            const incompleteTasks = tasks.filter((task: any) => !task.completed);
            const dueDate = incompleteTasks.length > 0
              ? incompleteTasks.map((task: any) => task.dueDate).sort()[0]
              : null;

            const organization = organizations.find((org: any) => org.id === projectTasks.organizationId);
            const managerId = organization?.contactPersonId || null;

            // Use calculated status since projects.json is not available
            const projectStatus = calculateProjectStatus(tasks);
            console.log(`📊 Fallback: Project ${projectTasks.projectId} calculated status: ${projectStatus}`);

            let completionDate = null;
            if (projectStatus === 'completed') {
              const approvedTasks = tasks.filter((task: any) => task.status === 'Approved');
              if (approvedTasks.length > 0) {
                const latestApprovalDate = approvedTasks
                  .map((task: any) => new Date(task.dueDate))
                  .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
                completionDate = latestApprovalDate.toISOString();
              }
            }

            return {
              ...projectTasks,
              status: projectStatus,
              totalTasks,
              progress,
              dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date',
              completionDate: completionDate ? new Date(completionDate).toLocaleDateString() : null,
              managerId,
              manager: {
                name: projectTasks.typeTags?.join(', ') || 'No manager assigned'
              }
            };
          });

          // Filter projects to only show those where the logged-in user is the freelancer
          const freelancerId = Number(session?.user?.id);
          const filteredProjects = transformedProjects.filter((project: any) => {
            return project.freelancerId === freelancerId;
          });

          console.log(`🔍 Filtered projects for freelancer ${freelancerId}:`, filteredProjects);

          setProjects(filteredProjects);
          setUsers(users);
          setOrganizations(organizations);
        } else {
          console.error('Failed to fetch essential data (project-tasks, users, or organizations)');
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
    <motion.section
      className="flex flex-col gap-3 p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* User Info Header */}
      <FreelancerHeader />

      {/* Main Layout */}
      {/* Visual Heading */}
      <motion.h2
        className="text-[30px] font-normal mb-2 mt-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        Project Status
      </motion.h2>
      <motion.div
        className="flex flex-col lg:flex-row gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
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
      </motion.div>
    </motion.section>
  );
}