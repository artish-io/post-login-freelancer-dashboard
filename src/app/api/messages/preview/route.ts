import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// Universal messages preview API for both freelancers and commissioners
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

        // Check if there are any unread messages in this thread for this user
        const hasUnreadMessages = thread.messages.some((msg: any) => 
          msg.read?.[userId] === false
        );

        return {
          threadId: thread.threadId,
          contactId,
          name: contact?.name || 'Unknown User',
          title: contact?.title || '',
          avatar: contact?.avatar || '/avatars/default.png',
          lastMessage: lastMsg?.text || '',
          lastTimestamp: lastMsg?.timestamp || '',
          isUnread: hasUnreadMessages,
        };
      })
      .sort((a: any, b: any) => {
        // Sort by unread first, then by last message timestamp
        if (a.isUnread && !b.isUnread) return -1;
        if (!a.isUnread && b.isUnread) return 1;
        return new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime();
      });

    return NextResponse.json(previews);
  } catch (err) {
    console.error('[messages preview] Error loading messages:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
