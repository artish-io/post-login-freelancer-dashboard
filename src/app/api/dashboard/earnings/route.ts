import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  console.log('🔍 Earnings API | Received userId:', userId);

  if (!userId) {
    console.log('❌ No userId in query');
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'earnings.json');
    const file = await readFile(filePath, 'utf-8');
    const earnings = JSON.parse(file);

    console.log('📦 Loaded earnings:', earnings);

    const userEarnings = earnings.find((entry: any) => entry.userId === userId);

    console.log('✅ Matched earnings for user:', userEarnings);

    return NextResponse.json(
      userEarnings || { amount: 0, currency: 'USD', lastUpdated: null }
    );
  } catch (err) {
    console.error('🔥 Earnings fetch error:', err);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }
}