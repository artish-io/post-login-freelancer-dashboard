import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const messagesPath = path.join(process.cwd(), 'data', 'messages.json');
    const messagesData = fs.readFileSync(messagesPath, 'utf8');
    const messages = JSON.parse(messagesData);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
