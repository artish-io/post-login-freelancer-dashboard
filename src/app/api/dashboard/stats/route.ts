import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'dashboard-stats.json');
    const file = await readFile(filePath, 'utf-8');
    const stats = JSON.parse(file);

    const userStats = stats.find((entry: any) => entry.userId === userId);

    return NextResponse.json(userStats || {});
  } catch (err) {
    console.error('Dashboard stats read error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}