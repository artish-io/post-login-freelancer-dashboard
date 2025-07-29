// src/app/api/dashboard/project-notes/count/route.ts

import { NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';
import { countUnreadNotes } from '@/lib/project-notes-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const readNotesParam = searchParams.get('readNotes'); // Get read notes from client

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Use hierarchical projects structure
    const projects = await readAllProjects();

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

    // Use hierarchical notes structure to count unread notes
    const result = await countUnreadNotes(projectIds, readNotes);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating project notes count:', error);
    return NextResponse.json({ error: 'Failed to calculate project notes count' }, { status: 500 });
  }
}