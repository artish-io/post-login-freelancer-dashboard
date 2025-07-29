import { NextResponse } from 'next/server';
import { readThreadMessages, readThreadMetadata } from '@/lib/messages-utils';

// NOTE TO DEV TEAM:
// This endpoint fetches a specific thread's messages from the new hierarchical structure.
// It expects a userId query param for validation.
// Only the messages array is returned for the thread.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const { threadId } = await params;

  if (!userIdParam) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const threadMetadata = await readThreadMetadata(threadId);

    if (!threadMetadata || !threadMetadata.participants.includes(userId)) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
    }

    const messages = await readThreadMessages(threadId);

    return NextResponse.json({ success: true, messages });
  } catch (err) {
    console.error('[messages-thread] Error loading thread:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}