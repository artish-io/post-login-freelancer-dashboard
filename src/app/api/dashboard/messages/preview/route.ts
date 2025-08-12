// src/app/api/dashboard/messages/preview/route.ts

import { NextResponse } from 'next/server';
import { getMessagesPreview } from '@/lib/messages-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 });
  }

  const sessionUserId = Number(userIdParam);

  try {
    // Use hierarchical storage instead of direct file access
    const { getAllUsers } = await import('@/lib/storage/unified-storage-service');
    const users = await getAllUsers();

    // Get message previews using the updated hierarchical structure
    const messagePreviews = await getMessagesPreview(sessionUserId);

    const previews = messagePreviews
      .map((preview: any) => {
        const contactId = preview.participants.find((id: number) => id !== sessionUserId);
        const contact = users.find((u: { id: number }) => u.id === contactId);

        if (!contact) return null;

        // Filter out threads with no messages (prevent ghost threads)
        if (!preview.lastMessage) {
          return null;
        }

        // Calculate isUnread based on corrected logic: user is recipient and read status is false
        const isUnread = preview.lastMessage.senderId !== sessionUserId &&
                        preview.unreadCount > 0;

        return {
          threadId: preview.threadId,
          contactId,
          name: contact.name,
          title: contact.title,
          avatar: contact.avatar,
          lastMessageText: preview.lastMessage.text,
          lastMessageTime: preview.lastMessage.timestamp,
          isUnread,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Sort by last message timestamp DESC (most recent first)
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

    // 🔍 Final Output Debug
    console.log('[messages-preview] preview response:', previews);

    return NextResponse.json(previews);
  } catch (error) {
    console.error('[messages-preview] Failed to load data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}