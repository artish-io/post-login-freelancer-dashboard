import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// PATCH /api/dashboard/messages/[threadId]/mark-read
// Request body: { userId: number }

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { userId } = await req.json();

  if (!userId || !threadId) {
    return NextResponse.json(
      { error: 'Missing userId or threadId' },
      { status: 400 }
    );
  }

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const threads = JSON.parse(raw);

    const threadIndex = threads.findIndex(
      (t: any) =>
        t.threadId === threadId && t.participants.includes(Number(userId))
    );

    if (threadIndex === -1) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 403 }
      );
    }

    // ✅ Mark all messages in the thread as read for this user
    threads[threadIndex].messages = threads[threadIndex].messages.map(
      (msg: any) => ({
        ...msg,
        read: {
          ...msg.read,
          [userId]: true,
        },
      })
    );

    await fs.writeFile(filePath, JSON.stringify(threads, null, 2));

    console.log(`[mark-read] user ${userId} marked thread ${threadId} as read`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mark-read] Failed to update thread:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}