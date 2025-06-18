// src/app/api/dashboard/messages-preview/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint expects a `userId` passed as a query param from the client
// using `useSession()` to fetch the logged-in user's ID.
// This is a dev-friendly workaround while server-side auth (getServerSession) is unreliable.
// In production, migrate to SSR or secure header-based auth.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 });
  }

  const sessionUserId = Number(userIdParam);

  try {
    const [messagesData, usersData, contactsData] = await Promise.all([
      fs.readFile(path.join(process.cwd(), 'data/messages.json'), 'utf-8'),
      fs.readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8'),
      fs.readFile(path.join(process.cwd(), 'data/freelancer-contacts.json'), 'utf-8'),
    ]);

    const messages = JSON.parse(messagesData);
    const users = JSON.parse(usersData);
    const contacts = JSON.parse(contactsData);

    const userContacts =
      contacts.find((c: { userId: number }) => c.userId === sessionUserId)?.contacts || [];

    const previews = userContacts
      .map((contactId: number) => {
        const threadIdA = `${sessionUserId}-${contactId}`;
        const threadIdB = `${contactId}-${sessionUserId}`;

        const thread = messages.find(
          (t: { threadId: string }) => t.threadId === threadIdA || t.threadId === threadIdB
        );

        if (!thread) return null;

        const lastMessage = [...thread.messages].sort(
          (a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        const contact = users.find((u: { id: number }) => u.id === contactId);
        if (!contact) return null;

        return {
          threadId: thread.threadId,
          contactId,
          name: contact.name,
          title: contact.title,
          avatar: contact.avatar,
          lastMessageText: lastMessage.text,
          lastMessageTime: lastMessage.timestamp,
          isUnread: !lastMessage.read?.[sessionUserId],
        };
      })
      .filter(Boolean);

    // 🔍 Debug: Log the preview list to verify unread logic
    console.log('[messages-preview] response for userId', sessionUserId, previews);

    return NextResponse.json(previews);
  } catch (error) {
    console.error('[messages-preview] Failed to load data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}