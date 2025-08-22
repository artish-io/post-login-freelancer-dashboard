import { NextResponse } from 'next/server';
import { readMultipleProjectNotes } from '@/lib/project-notes-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectIdsParam = searchParams.get('projectIds');

  console.log('🔴 [API] Incoming projectIds query param:', projectIdsParam);

  if (!projectIdsParam) {
    console.log('❌ [API] Missing projectIds param');
    return NextResponse.json({ error: 'Missing projectIds' }, { status: 400 });
  }

  const projectIds = projectIdsParam.split(',').map(id => id.trim()).filter(Boolean);

  console.log('🟢 [API] Parsed projectIds:', projectIds);

  if (!projectIds.length) {
    console.log('❌ [API] No valid project IDs provided');
    return NextResponse.json({ error: 'No valid project IDs provided' }, { status: 400 });
  }

  try {
    const filteredNotes = await readMultipleProjectNotes(projectIds);

    console.log('🟡 [API] Filtered notes length:', filteredNotes.length);

    return NextResponse.json(filteredNotes);
  } catch (error) {
    console.error('Error reading project notes:', error);
    return NextResponse.json({ error: 'Failed to read project notes' }, { status: 500 });
  }
}