// src/app/api/dashboard/messages/new-thread/route.ts

import { NextResponse } from 'next/server';
import {
  saveMessage,
  saveThreadMetadata,
  readThreadMetadata,
  generateMessageId
} from '@/lib/messages-utils';

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
    const sortedIds = [senderId, recipientId].sort((a, b) => a - b);
    const newThreadId = `${sortedIds[0]}-${sortedIds[1]}`;

    // Check if thread already exists
    const existingThread = await readThreadMetadata(newThreadId);

    if (existingThread) {
      return NextResponse.json({ error: 'Thread already exists' }, { status: 409 });
    }

    // Create thread metadata
    const newThread = {
      threadId: newThreadId,
      participants: [senderId, recipientId],
      messages: [], // Messages are stored separately
      metadata: {
        createdAt: new Date().toISOString(),
        initiatedBy: senderId,
        status: 'active'
      }
    };

    await saveThreadMetadata(newThread);

    // Create initial message
    const messageId = generateMessageId();
    const initialMessage = {
      messageId,
      senderId,
      timestamp: new Date().toISOString(),
      text: initialText,
      read: { [senderId]: true },
      isEncrypted: false
    };

    await saveMessage(initialMessage, newThreadId);

    return NextResponse.json({ success: true, threadId: newThreadId });
  } catch (err) {
    console.error('[new-thread] Error writing thread:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}