import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'task-summary.json');
    const file = await readFile(filePath, 'utf-8');
    const summaries = JSON.parse(file);

    const userSummary = summaries.find((entry: any) => entry.userId === userId);

    if (!userSummary || !Array.isArray(userSummary.tasks)) {
      return NextResponse.json([]); // 🔄 Return an empty array on fail-safe
    }

    return NextResponse.json(userSummary.tasks); // ✅ This must be an array
  } catch (err) {
    console.error('❌ Error reading task summary:', err);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}