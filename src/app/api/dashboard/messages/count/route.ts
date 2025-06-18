// src/app/api/dashboard/messages/count/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` query param passed from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side session isn't fully reliable.
// In production, secure this via `getServerSession()` or auth tokens.

type Message = {
  senderId: number;
  timestamp: string;
  text: string;
  read: { [userId: string]: boolean };
};

type Thread = {
  threadId: string;
  participants: number[];
  messages: Message[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = userIdParam;
  let unreadCount = 0;

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const messages: Thread[] = JSON.parse(fileData);

    for (const thread of messages) {
      if (!thread.participants.includes(Number(userId))) continue;

      for (const msg of thread.messages) {
        if (!msg.read[userId]) {
          unreadCount++;
        }
      }
    }

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('[messages-count] Failed to read messages.json:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}