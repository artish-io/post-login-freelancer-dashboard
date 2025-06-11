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
    const tasksPath = path.join(process.cwd(), 'app/api/dashboard/data/task-summary.json');
    const notesPath = path.join(process.cwd(), 'app/api/dashboard/data/project-notes.json');
    const linksPath = path.join(process.cwd(), 'app/api/dashboard/data/project-links.json');

    const tasksFile = await fs.readFile(tasksPath, 'utf8');
    const notesFile = await fs.readFile(notesPath, 'utf8');
    const linksFile = await fs.readFile(linksPath, 'utf8');

    const taskData = JSON.parse(tasksFile);
    const noteData = JSON.parse(notesFile);
    const linkData = JSON.parse(linksFile);

    const userTasks = taskData.find((u: any) => u.userId === userId)?.tasks || [];

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