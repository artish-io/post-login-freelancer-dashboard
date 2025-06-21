// File: src/app/api/project-tasks/[projectId]/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const file = await readFile(tasksFilePath, 'utf-8');
    const projects = JSON.parse(file);

    const projectId = Number(params.projectId);
    const project = projects.find((p: any) => p.projectId === projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      projectId: project.projectId,
      title: project.title,
      tasks: project.tasks
    });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}