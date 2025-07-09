import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const HISTORY_PATH = path.join(process.cwd(), 'data/wallet/wallet-history.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '31'; // Default to user 31

    const data = await readFile(HISTORY_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    // Filter by userId
    const filtered = parsed.filter((item: any) => item.userId === userId);

    console.log(`Wallet history API: Found ${filtered.length} transactions for user ${userId}`);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error loading wallet history:', error);
    return NextResponse.json({ error: 'Failed to load wallet history' }, { status: 500 });
  }
}