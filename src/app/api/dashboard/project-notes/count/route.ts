// src/app/api/dashboard/project-notes/count/route.ts

import { NextResponse } from 'next/server';
import notesData from '../../../../../../data/project-notes.json';
import projectsData from '../../../../../../data/projects-summary.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Find all projects associated with this user
  const userProjects = projectsData.find((user: { userId: string }) => user.userId === userId);

  if (!userProjects) {
    return NextResponse.json({ count: 0, taskIds: [] });
  }

  const projectIds = userProjects.projects.map(
    (project: { projectId: number }) => project.projectId
  );

  const taskIdsWithNotes: number[] = [];

  notesData.forEach(
    (entry: { projectId: number; notes: { date: string; feedback: string }[]; taskId: number }) => {
      if (projectIds.includes(entry.projectId) && entry.notes.length > 0) {
        taskIdsWithNotes.push(entry.taskId);
      }
    }
  );

  return NextResponse.json({ count: taskIdsWithNotes.length, taskIds: taskIdsWithNotes });
}