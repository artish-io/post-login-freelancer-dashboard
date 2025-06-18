// src/app/api/dashboard/messages/thread-summary/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` query param passed from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side session isn't fully reliable.
// In production, secure this via `getServerSession()` or auth tokens.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId param' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const messages = JSON.parse(fileData);

    const summaries = messages
      .filter((thread: any) => thread.participants.includes(userId))
      .map((thread: any) => {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const unreadCount = thread.messages.filter(
          (msg: any) => !msg.read?.[userId]
        ).length;

        const otherParticipantId = thread.participants.find(
          (id: number) => id !== userId
        );

        return {
          threadId: thread.threadId,
          contactId: otherParticipantId,
          lastMessageText: lastMessage?.text || '',
          lastMessageTimestamp: lastMessage?.timestamp || '',
          unreadCount,
          hasUnread: unreadCount > 0, // ✅ added
        };
      });

    return NextResponse.json(summaries);
  } catch (err) {
    console.error('[thread-summary] Error loading data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}