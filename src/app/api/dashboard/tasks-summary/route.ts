// src/app/api/dashboard/tasks-summary/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { filterFreelancerProjects } from '@/lib/freelancer-access-control';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  // Validate session for security
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure the requested user ID matches the session user ID (prevent data leakage)
  if (session.user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden: Cannot access other user data' }, { status: 403 });
  }

  try {
    // Read data from hierarchical storage
    const [projects, organizations] = await Promise.all([
      UnifiedStorageService.listProjects(), // Use unified storage for projects
      UnifiedStorageService.getAllOrganizations() // Use hierarchical storage for organizations
    ]);

    // Get all tasks across all projects
    const allTasks = [];
    for (const project of projects) {
      const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
      allTasks.push(...projectTasks);
    }

    // Convert to legacy format for compatibility
    const projectTasks = projects.map(project => ({
      projectId: project.projectId,
      tasks: allTasks.filter(task => task.projectId === project.projectId)
    }));
    // organizations already loaded from hierarchical storage above

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer using secure filtering
    const freelancerProjects = filterFreelancerProjects(projects, session.user as any);
    const freelancerProjectIds = freelancerProjects.map((p: any) => p.projectId);

    // Get project tasks for freelancer's projects only
    const freelancerProjectTasks = projectTasks.filter((pt: any) =>
      freelancerProjectIds.includes(pt.projectId)
    );

    const flattenedTasks = freelancerProjectTasks.flatMap((project: any) =>
      project.tasks.map((task: any, taskIndex: number) => {
        // Calculate status based on your business logic:
        // - completed + approved = milestone completed
        // - completed + not approved = in review or ongoing
        let derivedStatus = task.status;
        if (task.completed && task.status === 'Approved') {
          derivedStatus = 'completed';
        } else if (task.completed && task.status !== 'Approved') {
          derivedStatus = task.status === 'In review' ? 'in review' : 'ongoing';
        }

        // Find the corresponding project info for enrichment
        const projectInfo = freelancerProjects.find((p: any) => p.projectId === project.projectId);

        // Find the organization for the project logo
        const organization = organizations.find((org: any) => org.id === projectInfo?.organizationId);



        return {
          id: task.taskId || task.id, // Use taskId from hierarchical storage, fallback to id
          projectId: project.projectId,
          title: task.title,
          status: derivedStatus,
          important: task.feedbackCount > 0 || task.rejected,
          completed: task.completed,
          version: task.version || 1,
          latestSubmittedVersion: task.version || 1,
          historyExists: false, // Simplified - no variant tracking needed
          // Additional enrichment for modal display
          projectTitle: projectInfo?.title || 'Unknown Project',
          taskDescription: task.description || 'No description provided for this task.',
          taskIndex: taskIndex + 1,
          totalTasks: project.tasks.length,
          rejected: task.rejected || false,
          feedbackCount: task.feedbackCount || 0,
          pushedBack: task.pushedBack || false,
          dueDateRaw: task.dueDate,
          briefUrl: task.briefUrl,
          workingFileUrl: task.workingFileUrl,
          projectTags: projectInfo?.typeTags || [],
          projectLogo: organization?.logo || '/logos/fallback-logo.png',
          columnId: 'upcoming' as const // Default, will be overridden in tasks-panel
        };
      })
    );

    return NextResponse.json(flattenedTasks);
  } catch (err) {
    console.error('❌ Error loading project tasks from hierarchical storage:', err);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}