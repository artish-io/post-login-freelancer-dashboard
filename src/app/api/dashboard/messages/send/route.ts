// src/app/api/dashboard/messages/send/route.ts

import { NextResponse } from 'next/server';
import {
  saveMessage,
  readThreadMetadata,
  saveThreadMetadata,
  generateMessageId
} from '@/lib/messages-utils';

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
    let threadMetadata = await readThreadMetadata(threadId);

    // If thread doesn't exist, create it now (deferred thread creation)
    if (!threadMetadata) {
      const threadParts = threadId.split('-').map(Number);
      if (threadParts.length !== 2 || !threadParts.every(id => !isNaN(id))) {
        return NextResponse.json({ error: 'Invalid thread ID format' }, { status: 400 });
      }

      const [userId1, userId2] = threadParts.sort((a, b) => a - b);

      // Create new thread metadata
      threadMetadata = {
        threadId,
        participants: [userId1, userId2],
        messages: [], // Messages are stored separately
        metadata: {
          createdAt: new Date().toISOString(),
          initiatedBy: userId,
          status: 'active'
        }
      };

      await saveThreadMetadata(threadMetadata);
      console.log(`[messages-send] Created new thread ${threadId} on first message from user ${userId}`);
    }

    if (!threadMetadata.participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Anti-spam protection: Check if user can send messages
    const canSendMessage = checkAntiSpamRules(threadMetadata, userId);
    if (!canSendMessage.allowed) {
      return NextResponse.json({
        error: canSendMessage.reason,
        code: 'ANTI_SPAM_BLOCKED'
      }, { status: 429 });
    }

    const messageId = generateMessageId();

    // Initialize read status for all participants
    const readStatus: { [userId: string]: boolean } = {};
    threadMetadata.participants.forEach(participantId => {
      readStatus[participantId.toString()] = participantId === userId; // sender has read it, recipients haven't
    });

    const newMessage = {
      messageId,
      senderId: userId,
      timestamp: new Date().toISOString(),
      text,
      isEncrypted: isEncrypted || false,
      read: readStatus,
    };

    // Save the message to hierarchical structure
    await saveMessage(newMessage, threadId);

    // Update thread status based on anti-spam rules
    updateThreadStatus(threadMetadata, userId);

    console.log(`[messages-send] Message sent in thread ${threadId} by user ${userId}`);
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('[messages-send] Error writing message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Anti-spam protection logic
function checkAntiSpamRules(thread: any, senderId: number): { allowed: boolean; reason?: string } {
  // If no metadata exists (old threads), allow sending
  if (!thread.metadata) {
    return { allowed: true };
  }

  const { initiatedBy, status } = thread.metadata;
  const messages = thread.messages || [];

  // If thread is blocked, no one can send
  if (status === 'blocked') {
    return { allowed: false, reason: 'This conversation has been blocked' };
  }

  // If thread is active (both parties have sent messages), allow sending
  if (status === 'active') {
    return { allowed: true };
  }

  // If thread is pending_response
  if (status === 'pending_response') {
    // If sender is the initiator, check if they've already sent a message
    if (senderId === initiatedBy) {
      const initiatorMessages = messages.filter((msg: any) => msg.senderId === initiatedBy);
      if (initiatorMessages.length > 0) {
        return {
          allowed: false,
          reason: 'Please wait for a response before sending another message'
        };
      }
    }
    // If sender is not the initiator, they can always respond
    return { allowed: true };
  }

  return { allowed: true };
}

// Update thread status based on message activity
function updateThreadStatus(thread: any, senderId: number): void {
  // Initialize metadata if it doesn't exist
  if (!thread.metadata) {
    thread.metadata = {
      createdAt: new Date().toISOString(),
      initiatedBy: senderId,
      status: 'pending_response'
    };
  }

  const { initiatedBy } = thread.metadata;
  const messages = thread.messages || [];

  // Check if both parties have sent messages
  const initiatorHasSent = messages.some((msg: any) => msg.senderId === initiatedBy);
  const otherPartyHasSent = messages.some((msg: any) => msg.senderId !== initiatedBy);

  // If both parties have sent messages, mark as active
  if (initiatorHasSent && otherPartyHasSent) {
    thread.metadata.status = 'active';
    console.log(`[anti-spam] Thread ${thread.threadId} marked as active - both parties have participated`);
  } else if (senderId !== initiatedBy) {
    // If the non-initiator is responding, mark as active
    thread.metadata.status = 'active';
    console.log(`[anti-spam] Thread ${thread.threadId} marked as active - recipient responded`);
  }
}