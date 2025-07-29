// File: src/app/api/dashboard/project-details/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { readProjectTasks, convertHierarchicalToLegacy } from '../../../../lib/project-tasks/hierarchical-storage';
import { readAllProjects } from '@/lib/projects-utils';
import { readProjectNotes } from '@/lib/project-notes-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get('projectId');
  const projectId = parseInt(projectIdParam || '', 10);

  if (!projectId || isNaN(projectId)) {
    return NextResponse.json({ error: 'Missing or invalid projectId' }, { status: 400 });
  }

  try {
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const organizationsFile = await readFile(organizationsPath, 'utf-8');

    // Read project tasks from hierarchical storage
    const hierarchicalTasks = await readProjectTasks(projectId);
    const allTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    // Read data from hierarchical structures
    const allNotes = await readProjectNotes(projectId);
    const allProjects = await readAllProjects();
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

    // Notes are already filtered by project ID from readProjectNotes
    const matchingNotes = allNotes;

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