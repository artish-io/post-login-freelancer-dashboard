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

    // Anti-spam protection: Check if user can send messages
    const canSendMessage = checkAntiSpamRules(thread, userId);
    if (!canSendMessage.allowed) {
      return NextResponse.json({
        error: canSendMessage.reason,
        code: 'ANTI_SPAM_BLOCKED'
      }, { status: 429 });
    }

    const newMessage = {
      senderId: userId,
      timestamp: new Date().toISOString(),
      text,
      isEncrypted: isEncrypted || false,
      read: { [userId]: true }, // sender already "read" it
    };

    thread.messages.push(newMessage);

    // Update thread status based on anti-spam rules
    updateThreadStatus(thread, userId);

    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

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