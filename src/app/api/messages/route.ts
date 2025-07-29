import { NextResponse } from 'next/server';
import { readAllThreads } from '@/lib/messages-utils';

export async function GET() {
  try {
    const threads = await readAllThreads();
    return NextResponse.json(threads);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
