import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  console.log('📡 Dashboard Summary API | Received userId:', userId);

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'projects-summary.json');
    const file = await readFile(filePath, 'utf-8');
    const summaries = JSON.parse(file);

    const userData = summaries.find((entry: any) => entry.userId === userId);

    console.log('✅ Projects returned:', userData?.projects?.length || 0);

    return NextResponse.json(userData?.projects || []);
  } catch (err) {
    console.error('🔥 Failed to load dashboard projects summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}