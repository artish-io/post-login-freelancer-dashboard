// File: src/app/api/project-tasks/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');

export async function GET(request: NextRequest) {
  try {
    const projectIdSegment = request.nextUrl.pathname.split('/')[4]; // Extract projectId from URL
    const projectId = Number(projectIdSegment);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const file = await readFile(tasksFilePath, 'utf-8');
    const projects = JSON.parse(file);

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