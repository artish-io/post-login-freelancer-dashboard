import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// NOTE TO DEV TEAM:
// This endpoint fetches a specific thread's messages from data/messages.json.
// It expects a userId query param for validation.
// Only the messages array is returned for the thread.

export async function GET(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const { threadId } = params;

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const filePath = path.join(process.cwd(), 'data/messages.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const threads = JSON.parse(fileData);

    const thread = threads.find(
      (t: any) => t.threadId === threadId && t.participants.includes(userId)
    );

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, messages: thread.messages });
  } catch (err) {
    console.error('[messages-thread] Error loading thread:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}