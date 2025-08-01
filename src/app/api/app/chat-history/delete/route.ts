

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHAT_BASE_PATH = path.join(process.cwd(), 'data', 'app', 'chat-history');

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId } = body;

    console.log(`🗑️ Attempting to delete chat session: userId=${userId}, sessionId=${sessionId}`);

    if (!userId || !sessionId) {
      console.error('❌ Missing userId or sessionId in request');
      return NextResponse.json({ error: 'Missing userId or sessionId' }, { status: 400 });
    }

    const filePath = path.join(CHAT_BASE_PATH, String(userId), `${sessionId}.json`);
    console.log(`🔍 Looking for file at: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Session file not found: ${filePath}`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    console.log(`✅ Successfully deleted chat session: ${filePath}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ DELETE chat history failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}