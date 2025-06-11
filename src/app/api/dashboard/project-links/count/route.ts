// src/app/api/dashboard/project-links/count/route.ts

import { NextResponse } from 'next/server';
import projectTasks from '../../../../../../data/project-tasks.json';
import projectsSummary from '../../../../../../data/projects-summary.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userProjects = projectsSummary.find(
    (user: { userId: string; projects: { projectId: number }[] }) =>
      user.userId === userId
  );

  if (!userProjects) {
    return NextResponse.json({ count: 0, taskIds: [] });
  }

  const projectIds = userProjects.projects.map(
    (project: { projectId: number }) => project.projectId
  );

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
}