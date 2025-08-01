import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { userId, prompt, userType, timestamp } = await req.json();

    if (!userId || !prompt || !userType || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dirPath = path.join(process.cwd(), 'data', 'app', 'chat-history', userId);
    const filePath = path.join(dirPath, `${timestamp}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const newEntry = {
      userId,
      prompt,
      userType,
      messages: [],
      createdAt: timestamp,
    };

    fs.writeFileSync(filePath, JSON.stringify(newEntry, null, 2), 'utf-8');

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Failed to create chat history file:', error);
    return NextResponse.json({ error: 'Failed to create chat history' }, { status: 500 });
  }
}
