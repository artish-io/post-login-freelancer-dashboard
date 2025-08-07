// File: app/api/dashboard/task-tab-counts/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // Use hierarchical storage for project tasks
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const notesPath = path.join(process.cwd(), 'data', 'project-notes.json');
    const linksPath = path.join(process.cwd(), 'data', 'project-links.json');

    const [projectsFile, hierarchicalTasks, notesFile, linksFile] = await Promise.all([
      fs.readFile(projectsPath, 'utf8'),
      readAllTasks(),
      fs.readFile(notesPath, 'utf8'),
      fs.readFile(linksPath, 'utf8')
    ]);

    // Convert to legacy format for compatibility
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);

    const projects = JSON.parse(projectsFile);
    const projectTasks = projectTasksData;
    const noteData = JSON.parse(notesFile);
    const linkData = JSON.parse(linksFile);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);
    const freelancerProjectIds = freelancerProjects.map((p: any) => p.projectId);

    // Get all tasks for freelancer's projects
    const userTasks = projectTasks
      .filter((pt: any) => freelancerProjectIds.includes(pt.projectId))
      .flatMap((pt: any) => pt.tasks.map((task: any) => ({
        ...task,
        projectId: pt.projectId,
        important: task.feedbackCount > 0 || task.rejected,
        completed: task.completed
      })));

    const important = userTasks.filter((t: any) => t.important && !t.completed).length;

    const notes = noteData.filter((note: any) =>
      userTasks.some((task: any) => task.projectId === note.projectId)
    ).length;

    const links = linkData.filter((link: any) =>
      userTasks.some((task: any) => task.projectId === link.projectId)
    ).length;

    return NextResponse.json({ important, notes, links });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load tab counts' }, { status: 500 });
  }
}