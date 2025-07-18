// src/app/api/dashboard/project-links/count/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Use universal source files instead of deprecated projects-summary.json
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

    const [projectsFile, projectTasksFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = JSON.parse(projectTasksFile);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);
    const projectIds = freelancerProjects.map((p: any) => p.projectId);

    if (projectIds.length === 0) {
      return NextResponse.json({ count: 0, taskIds: [] });
    }

    const taskIdsWithLinks: number[] = [];

    projectTasks.forEach(
      (project: {
        projectId: number;
        tasks: { id: number; link?: string }[];
      }) => {
        if (projectIds.includes(project.projectId)) {
          project.tasks.forEach((task) => {
            if (typeof task.link === 'string' && task.link.length > 0) {
              taskIdsWithLinks.push(task.id);
            }
          });
        }
      }
    );

    return NextResponse.json({
      count: taskIdsWithLinks.length,
      taskIds: taskIdsWithLinks,
    });
  } catch (error) {
    console.error('Error calculating project links count:', error);
    return NextResponse.json({ error: 'Failed to calculate project links count' }, { status: 500 });
  }
}