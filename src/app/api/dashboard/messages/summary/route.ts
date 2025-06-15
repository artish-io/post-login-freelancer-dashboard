// src/app/api/dashboard/messages/summary/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This route returns an array of { threadId, hasUnread } objects for a given user.
// It checks if any message in each thread is unread by the given user.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const userId = Number(userIdParam);

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const threads = JSON.parse(fileData);

    const summaries = threads.map((thread: any) => {
      const hasUnread = thread.messages.some(
        (msg: any) => msg.read?.[userId] === false
      );

      return {
        threadId: thread.threadId,
        hasUnread,
      };
    });

    return NextResponse.json(summaries);
  } catch (err) {
    console.error('[messages-summary] Failed to fetch summary:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}