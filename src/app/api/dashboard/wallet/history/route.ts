import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const HISTORY_PATH = path.join(process.cwd(), 'data/wallet/wallet-history.json');

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    const data = await readFile(HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    // Filter by userId (convert to number for comparison)
    const userIdNum = parseInt(userId);
    const filtered = parsed.filter((item: any) => item.userId === userIdNum);

    console.log(`Wallet history API: Found ${filtered.length} transactions for user ${userId}`);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error loading wallet history:', error);
    return NextResponse.json({ error: 'Failed to load wallet history' }, { status: 500 });
  }
}