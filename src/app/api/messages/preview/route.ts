import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getMessagesPreview } from '@/lib/messages-utils';

// Universal messages preview API for both freelancers and commissioners
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const usersPath = path.join(process.cwd(), 'data/users.json');
    const users = JSON.parse(await fs.readFile(usersPath, 'utf-8'));

    const messagePreviews = await getMessagesPreview(userId);

    const previews = messagePreviews.map((preview: any) => {
      const contactId = preview.participants.find((id: number) => id !== userId);
      const contact = users.find((u: any) => u.id === contactId);

      return {
        threadId: preview.threadId,
        contactId,
        name: contact?.name || 'Unknown User',
        title: contact?.title || '',
        avatar: contact?.avatar || '/avatars/default.png',
        lastMessage: preview.lastMessage?.text || '',
        lastTimestamp: preview.lastMessage?.timestamp || '',
        isUnread: preview.unreadCount > 0,
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
