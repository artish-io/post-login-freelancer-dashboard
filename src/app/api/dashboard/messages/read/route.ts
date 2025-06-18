// src/app/api/dashboard/messages/read/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { threadId } = await request.json();

  const filePath = path.join(process.cwd(), 'data/messages.json');
  const fileData = fs.readFileSync(filePath, 'utf-8');
  const messages = JSON.parse(fileData);

  const thread = messages.find(
    (t: any) => t.threadId === threadId && t.participants.includes(userId)
  );

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 403 });
  }

  thread.messages = thread.messages.map((msg: any) => {
    const alreadyRead = msg.readBy || [];
    if (!alreadyRead.includes(userId)) {
      return {
        ...msg,
        readBy: [...alreadyRead, userId],
      };
    }
    return msg;
  });

  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));

  return NextResponse.json({ success: true });
}