

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHAT_BASE_PATH = path.join(process.cwd(), 'data', 'app', 'chat-history');

function ensureUserDir(userId: string) {
  try {
    const dir = path.join(CHAT_BASE_PATH, userId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (error) {
    console.error('Failed to ensure user directory:', error);
    throw new Error('Failed to create user directory');
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDir = path.join(CHAT_BASE_PATH, userId);

    // Check if user directory exists
    if (!fs.existsSync(userDir)) {
      return NextResponse.json([]);
    }

    // Read directory contents with error handling
    let files: string[];
    try {
      files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));
    } catch (error) {
      console.error('Failed to read user directory:', error);
      return NextResponse.json({ error: 'Failed to read chat history' }, { status: 500 });
    }

    // Read and parse session files with error handling
    const sessions = files.map(file => {
      try {
        const filePath = path.join(userDir, file);
        if (!fs.existsSync(filePath)) {
          console.warn(`File ${filePath} does not exist, skipping`);
          return null;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const sessionData = JSON.parse(content);

        // Add the sessionId (filename without extension) to the session data
        const sessionId = file.replace('.json', '');
        return {
          ...sessionData,
          sessionId
        };
      } catch (error) {
        console.error(`Failed to read/parse file ${file}:`, error);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('GET chat history failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, prompt, messages } = body;

    if (!userId || !prompt || !messages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure user directory exists with error handling
    let userDir: string;
    try {
      userDir = ensureUserDir(String(userId));
    } catch (error) {
      console.error('Failed to ensure user directory:', error);
      return NextResponse.json({ error: 'Failed to create user directory' }, { status: 500 });
    }

    // Read existing session files with error handling
    let sessionFiles: string[];
    try {
      sessionFiles = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));
    } catch (error) {
      console.error('Failed to read user directory for session count:', error);
      return NextResponse.json({ error: 'Failed to read chat history' }, { status: 500 });
    }

    const sessionId = sessionFiles.length + 1;

    const session = {
      sessionId,
      userId,
      prompt,
      timestamp: new Date().toISOString(),
      messages
    };

    // Write session file with error handling
    const filePath = path.join(userDir, `${sessionId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('Failed to write session file:', error);
      return NextResponse.json({ error: 'Failed to save chat session' }, { status: 500 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('POST chat history failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
