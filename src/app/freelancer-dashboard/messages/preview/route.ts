// src/app/api/dashboard/messages/preview/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint returns a preview summary of all threads a user participates in,
// including an `isUnread` boolean for each thread (based on message read status).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const messagesPath = path.join(process.cwd(), 'data/messages.json');
    const usersPath = path.join(process.cwd(), 'data/users.json');
    const [messagesData, usersData] = await Promise.all([
      fs.readFile(messagesPath, 'utf-8'),
      fs.readFile(usersPath, 'utf-8'),
    ]);

    const threads = JSON.parse(messagesData);
    const users = JSON.parse(usersData);

    const previews = threads
      .filter((thread: any) => thread.participants.includes(userId))
      .map((thread: any) => {
        const contactId = thread.participants.find((id: number) => id !== userId);
        const contact = users.find((u: any) => u.id === contactId);

        const lastMsg = [...thread.messages].sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        const isUnread = lastMsg?.read?.[userId] === false;

        return {
          threadId: thread.threadId,
          contactId,
          name: contact?.name,
          title: contact?.title,
          avatar: contact?.avatar,
          lastMessage: lastMsg?.text,
          lastTimestamp: lastMsg?.timestamp,
          isUnread,
        };
      });

    return NextResponse.json(previews);
  } catch (err) {
    console.error('[preview route] Error loading messages:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}