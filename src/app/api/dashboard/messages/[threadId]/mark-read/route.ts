// src/app/api/dashboard/messages/[threadId]/mark-read/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint marks all messages as read for a given user in a thread.
// Called as PATCH /api/dashboard/messages/[threadId]/mark-read with { userId } in body.

export async function PATCH(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const { threadId } = params;
  const { userId } = await req.json();

  if (!userId || !threadId) {
    return NextResponse.json({ error: 'Missing userId or threadId' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const threads = JSON.parse(fileData);

    const thread = threads.find(
      (t: any) => t.threadId === threadId && t.participants.includes(userId)
    );

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 403 });
    }

    thread.messages = thread.messages.map((msg: any) => ({
      ...msg,
      read: {
        ...msg.read,
        [userId]: true,
      },
    }));

    await fs.writeFile(filePath, JSON.stringify(threads, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mark-read] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}