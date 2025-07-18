// src/app/api/dashboard/project-notes/count/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const readNotesParam = searchParams.get('readNotes'); // Get read notes from client

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Use universal source files instead of deprecated projects-summary.json
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const notesPath = path.join(process.cwd(), 'data', 'project-notes.json');

    const [projectsFile, notesFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(notesPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const notesData = JSON.parse(notesFile);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);
    const projectIds = freelancerProjects.map((p: any) => p.projectId);

    if (projectIds.length === 0) {
      return NextResponse.json({ count: 0, taskIds: [] });
    }

    // Parse read notes from client (localStorage data)
    let readNotes: Set<string> = new Set();
    if (readNotesParam) {
      try {
        const readNotesArray = JSON.parse(readNotesParam);
        readNotes = new Set(readNotesArray);
      } catch (error) {
        console.warn('Failed to parse readNotes parameter:', error);
      }
    }

    const taskIdsWithUnreadNotes: number[] = [];

    notesData.forEach(
      (entry: { projectId: number; notes: { date: string; feedback: string }[]; taskId: number }) => {
        if (projectIds.includes(entry.projectId) && entry.notes.length > 0) {
          // Check if any note in this task is unread
          const hasUnreadNotes = entry.notes.some((note: any) => {
            const noteKey = `${entry.projectId}-${entry.taskId}-${note.date}`;
            return !readNotes.has(noteKey);
          });

          if (hasUnreadNotes) {
            taskIdsWithUnreadNotes.push(entry.taskId);
          }
        }
      }
    );

    return NextResponse.json({ count: taskIdsWithUnreadNotes.length, taskIds: taskIdsWithUnreadNotes });
  } catch (error) {
    console.error('Error calculating project notes count:', error);
    return NextResponse.json({ error: 'Failed to calculate project notes count' }, { status: 500 });
  }
}