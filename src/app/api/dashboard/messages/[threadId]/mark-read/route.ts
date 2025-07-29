import { NextResponse } from 'next/server';
import {
  readThreadMessages,
  readThreadMetadata,
  updateMessageReadStatus
} from '@/lib/messages-utils';

// PATCH /api/dashboard/messages/[threadId]/mark-read
// Request body: { userId: number }

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { userId } = await req.json();

  if (!userId || !threadId) {
    return NextResponse.json(
      { error: 'Missing userId or threadId' },
      { status: 400 }
    );
  }

  try {
    const threadMetadata = await readThreadMetadata(threadId);

    if (!threadMetadata || !threadMetadata.participants.includes(Number(userId))) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 403 }
      );
    }

    // Get all messages in the thread
    const messages = await readThreadMessages(threadId);

    // Mark all messages in the thread as read for this user
    for (const message of messages) {
      if (message.messageId) {
        await updateMessageReadStatus(
          message.timestamp,
          threadId,
          message.messageId,
          userId.toString(),
          true
        );
      }
    }

    console.log(`[mark-read] user ${userId} marked thread ${threadId} as read`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mark-read] Failed to update thread:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}