import { NextResponse } from 'next/server';
import notesData from '../../../../../data/project-notes.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectIdsParam = searchParams.get('projectIds');

  console.log('🔴 [API] Incoming projectIds query param:', projectIdsParam);

  if (!projectIdsParam) {
    console.log('❌ [API] Missing projectIds param');
    return NextResponse.json({ error: 'Missing projectIds' }, { status: 400 });
  }

  const projectIds = projectIdsParam.split(',').map(id => parseInt(id, 10)).filter(Boolean);

  console.log('🟢 [API] Parsed projectIds:', projectIds);

  if (!projectIds.length) {
    console.log('❌ [API] No valid project IDs provided');
    return NextResponse.json({ error: 'No valid project IDs provided' }, { status: 400 });
  }

  const filteredNotes = notesData.filter(
    (entry: { projectId: number }) => projectIds.includes(entry.projectId)
  );

  console.log('🟡 [API] Filtered notes length:', filteredNotes.length);

  return NextResponse.json(filteredNotes);
}