// src/app/api/dashboard/tasks-summary/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // Read universal source files only - no more milestones.json dependency
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');

    const [projectsFile, projectTasksFile, organizationsFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8'),
      readFile(organizationsPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = JSON.parse(projectTasksFile);
    const organizations = JSON.parse(organizationsFile);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);
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
          id: task.id,
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
    console.error('❌ Error loading project-tasks.json:', err);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}