// src/app/api/dashboard/messages/new-thread/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` query param passed from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side session isn't fully reliable.
// In production, secure this via `getServerSession()` or auth tokens.

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const senderIdParam = searchParams.get('userId');

  if (!senderIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const senderId = Number(senderIdParam);
  const { recipientId, initialText } = await request.json();

  if (!recipientId || !initialText) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const messages = JSON.parse(fileData);

    const sortedIds = [senderId, recipientId].sort((a, b) => a - b);
    const newThreadId = `${sortedIds[0]}-${sortedIds[1]}`;

    // Check if thread already exists
    const existingThread = messages.find((t: any) => t.threadId === newThreadId);

    if (existingThread) {
      return NextResponse.json({ error: 'Thread already exists' }, { status: 409 });
    }

    const newThread = {
      threadId: newThreadId,
      participants: [senderId, recipientId],
      messages: [
        {
          senderId,
          timestamp: new Date().toISOString(),
          text: initialText,
          readBy: [senderId],
        },
      ],
    };

    messages.push(newThread);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

    return NextResponse.json({ success: true, threadId: newThreadId });
  } catch (err) {
    console.error('[new-thread] Error writing thread:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}