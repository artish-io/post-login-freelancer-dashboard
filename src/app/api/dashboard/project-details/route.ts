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

    const [tasksFile, notesFile] = await Promise.all([
      readFile(tasksPath, 'utf-8'),
      readFile(notesPath, 'utf-8')
    ]);

    const allTasks = JSON.parse(tasksFile);
    const allNotes = JSON.parse(notesFile);

    const taskGroup = allTasks.find((t: any) => t.projectId === projectId);
    if (!taskGroup) {
      return NextResponse.json({ error: 'Project not found in tasks' }, { status: 404 });
    }

    const matchingNotes = allNotes.filter((note: any) => note.projectId === projectId);

    return NextResponse.json({
      projectId,
      title: taskGroup.title || 'Untitled Project',
      logoUrl: taskGroup.logoUrl || '/icons/default-logo.png',
      typeTags: taskGroup.typeTags || [],
      notes: matchingNotes
    });
  } catch (err) {
    console.error('❌ Failed to load project details:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}