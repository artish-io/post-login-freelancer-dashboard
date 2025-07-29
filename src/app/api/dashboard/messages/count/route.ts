// src/app/api/dashboard/messages/count/route.ts

import { NextResponse } from 'next/server';
import { countUnreadMessages } from '@/lib/messages-utils';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` query param passed from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side session isn't fully reliable.
// In production, secure this via `getServerSession()` or auth tokens.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = userIdParam;

  try {
    const unreadCount = await countUnreadMessages(userId);

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('[messages-count] Failed to count unread messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}