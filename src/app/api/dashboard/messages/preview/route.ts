// src/app/api/dashboard/messages-preview/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

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
      fs.readFile(path.join(process.cwd(), 'data/contacts.json'), 'utf-8'),
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

        console.log(`[messages-preview] user ${sessionUserId} vs contact ${contactId} → matched thread: ${thread?.threadId ?? 'none'}`);

        if (!thread) return null;

        const lastMessage = [...thread.messages].sort(
          (a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        const contact = users.find((u: { id: number }) => u.id === contactId);
        if (!contact) return null;

        // Handle threads with no messages
        if (!lastMessage) {
          return {
            threadId: thread.threadId,
            contactId,
            name: contact.name,
            title: contact.title,
            avatar: contact.avatar,
            lastMessageText: 'No messages yet',
            lastMessageTime: new Date().toISOString(),
            isUnread: false,
          };
        }

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

    // 🔍 Final Output Debug
    console.log('[messages-preview] preview response:', previews);

    return NextResponse.json(previews);
  } catch (error) {
    console.error('[messages-preview] Failed to load data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}