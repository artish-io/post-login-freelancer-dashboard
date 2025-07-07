// File: src/app/api/dashboard/project-details/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get('projectId');
  const projectId = parseInt(projectIdParam || '', 10);

  if (!projectId || isNaN(projectId)) {
    return NextResponse.json({ error: 'Missing or invalid projectId' }, { status: 400 });
  }

  try {
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const notesPath = path.join(process.cwd(), 'data', 'project-notes.json');
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');

    const [tasksFile, notesFile, projectsFile, organizationsFile] = await Promise.all([
      readFile(tasksPath, 'utf-8'),
      readFile(notesPath, 'utf-8'),
      readFile(projectsPath, 'utf-8'),
      readFile(organizationsPath, 'utf-8')
    ]);

    const allTasks = JSON.parse(tasksFile);
    const allNotes = JSON.parse(notesFile);
    const allProjects = JSON.parse(projectsFile);
    const allOrganizations = JSON.parse(organizationsFile);

    const taskGroup = allTasks.find((t: any) => t.projectId === projectId);
    if (!taskGroup) {
      return NextResponse.json({ error: 'Project not found in tasks' }, { status: 404 });
    }

    // Find the corresponding project in projects.json for business data
    const projectInfo = allProjects.find((p: any) => p.projectId === projectId);
    if (!projectInfo) {
      return NextResponse.json({ error: 'Project not found in projects' }, { status: 404 });
    }

    // Find the organization for logo and additional info
    const organization = allOrganizations.find((org: any) => org.id === projectInfo.organizationId);

    const matchingNotes = allNotes.filter((note: any) => note.projectId === projectId);

    // Transform notes to include taskId for proper read state tracking
    const transformedNotes = matchingNotes.map((noteGroup: any) => ({
      taskId: noteGroup.taskId,
      taskTitle: noteGroup.taskTitle,
      notes: noteGroup.notes
    }));

    // Use description from projects.json, fallback to generated summary
    const totalTasks = taskGroup.tasks?.length || 0;
    const completedTasks = taskGroup.tasks?.filter((task: any) => task.completed).length || 0;
    const generatedSummary = `${taskGroup.typeTags?.join(' • ') || 'Project'} with ${totalTasks} tasks (${completedTasks} completed)`;

    return NextResponse.json({
      projectId,
      title: taskGroup.title || 'Untitled Project',
      summary: projectInfo.description || generatedSummary, // Use description from projects.json
      logoUrl: organization?.logo || '/icons/default-logo.png', // Use organization logo
      typeTags: taskGroup.typeTags || [],
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