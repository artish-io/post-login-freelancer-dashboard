// src/app/api/dashboard/messages/read/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  readThreadMessages,
  readThreadMetadata,
  updateMessageReadStatus
} from '@/lib/messages-utils';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { threadId } = await request.json();

  try {
    const threadMetadata = await readThreadMetadata(threadId);

    if (!threadMetadata || !threadMetadata.participants.includes(userId)) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 403 });
    }

    // Get all messages in the thread
    const messages = await readThreadMessages(threadId);

    // Mark all messages as read for this user
    for (const message of messages) {
      if (message.messageId && (!message.read || !message.read[userId.toString()])) {
        await updateMessageReadStatus(
          message.timestamp,
          threadId,
          message.messageId,
          userId.toString(),
          true
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages-read] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}