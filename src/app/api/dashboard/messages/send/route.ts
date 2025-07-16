// src/app/api/dashboard/messages/send/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` field in the request body passed from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side session isn't fully reliable.
// In production, secure this via `getServerSession()` or auth tokens.

export async function POST(request: Request) {
  const { userId, threadId, text, isEncrypted } = await request.json();

  if (!userId || !threadId || !text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const messages = JSON.parse(fileData);

    const thread = messages.find((t: any) => t.threadId === threadId);

    if (!thread || !thread.participants.includes(userId)) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 403 });
    }

    const newMessage = {
      senderId: userId,
      timestamp: new Date().toISOString(),
      text,
      isEncrypted: isEncrypted || false,
      read: { [userId]: true }, // sender already "read" it
    };

    thread.messages.push(newMessage);

    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('[messages-send] Error writing message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}