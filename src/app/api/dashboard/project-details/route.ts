// File: src/app/api/dashboard/project-details/route.ts

import { NextResponse } from 'next/server';
import { readProjectNotes } from '@/lib/project-notes-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

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
    // Load all projects and validate access
    const allProjects = await UnifiedStorageService.listProjects();

    // Validate that the user has access to this project
    const hasAccess = validateFreelancerProjectAccess(
      projectId,
      allProjects,
      session.user as any
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project info
    const projectInfo = allProjects.find((p: any) => p.projectId === projectId);
    if (!projectInfo) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Read project tasks and other data
    const [projectTasks, allNotes, allOrganizations] = await Promise.all([
      UnifiedStorageService.listTasks(projectInfo.projectId),
      readProjectNotes(projectId),
      UnifiedStorageService.getAllOrganizations()
    ]);

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