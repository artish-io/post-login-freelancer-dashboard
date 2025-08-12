// File: src/app/api/dashboard/project-details/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { readProjectTasks } from '@/lib/project-tasks/hierarchical-storage';
import { readProject, readAllProjects } from '@/lib/projects-utils';
import { readProjectNotes } from '@/lib/project-notes-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get('projectId');
  const projectId = parseInt(projectIdParam || '', 10);

  if (!projectId || isNaN(projectId)) {
    return NextResponse.json({ error: 'Missing or invalid projectId' }, { status: 400 });
  }

  // Validate session and access control
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, load all projects to validate access
    const allProjects = await readAllProjects();

    // Validate that the user has access to this project
    const hasAccess = validateFreelancerProjectAccess(
      projectId,
      allProjects,
      session.user as any
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const organizationsFile = await readFile(organizationsPath, 'utf-8');

    // Read project tasks from hierarchical storage
    const projectTasks = await readProjectTasks(projectId);

    // Read data from hierarchical structures
    const allNotes = await readProjectNotes(projectId);
    const allOrganizations = JSON.parse(organizationsFile);

    if (!projectTasks || projectTasks.length === 0) {
      return NextResponse.json({ error: 'No tasks found for project' }, { status: 404 });
    }

    // Get project info from hierarchical storage
    const projectInfo = await readProject(projectId);
    if (!projectInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find the organization for logo and additional info
    const organization = allOrganizations.find((org: any) => org.id === projectInfo.organizationId);

    // Notes are already filtered by project ID from readProjectNotes
    const matchingNotes = allNotes;

    // Transform notes to include taskId for proper read state tracking
    const transformedNotes = matchingNotes.map((noteGroup: any) => ({
      taskId: noteGroup.taskId,
      taskTitle: noteGroup.taskTitle,
      notes: noteGroup.notes
    }));

    // Use description from projects.json, fallback to generated summary
    const totalTasks = projectTasks.length || 0;
    const completedTasks = projectTasks.filter((task: any) => task.completed).length || 0;
    const generatedSummary = `Project with ${totalTasks} tasks (${completedTasks} completed)`;

    return NextResponse.json({
      projectId,
      title: projectInfo.title || 'Untitled Project',
      summary: projectInfo.description || generatedSummary,
      logoUrl: organization?.logo || '/icons/default-logo.png',
      typeTags: projectInfo.tags || [],
      notes: transformedNotes,
      // Additional project info
      status: projectInfo.status,
      dueDate: projectInfo.dueDate,
      progress: projectInfo.progress,
      manager: projectInfo.manager,
      organizationName: organization?.name
    });
  } catch (err) {
    console.error('❌ Failed to load project details:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}