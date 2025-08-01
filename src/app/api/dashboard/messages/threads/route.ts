// src/app/api/dashboard/messages/threads/route.ts

import { NextResponse } from 'next/server';
import { getAllThreadIds, readThreadMetadata } from '@/lib/messages-utils';

// NOTE TO DEV TEAM:
// This endpoint returns all threads that a user participates in.
// It expects a userId query param for filtering threads.
// Used for thread resolution when checking if a conversation already exists.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const threadIds = await getAllThreadIds();
    const userThreads = [];

    for (const threadId of threadIds) {
      const metadata = await readThreadMetadata(threadId);
      if (metadata && metadata.participants.includes(userId)) {
        userThreads.push({
          id: threadId,
          threadId: threadId,
          participants: metadata.participants,
          metadata: metadata.metadata
        });
      }
    }

    return NextResponse.json(userThreads);
  } catch (error) {
    console.error('[threads] Error fetching user threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}
