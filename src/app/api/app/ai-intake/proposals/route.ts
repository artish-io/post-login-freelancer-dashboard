import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AI_INTAKE_BASE_PATH = path.join(process.cwd(), 'data', 'app', 'ai-intake', 'proposals');

// Ensure the directory exists
function ensureUserDir(userId: string): string {
  const userDir = path.join(AI_INTAKE_BASE_PATH, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

// Save a proposal draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, proposal } = body;

    if (!userId || !proposal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure user directory exists
    const userDir = ensureUserDir(String(userId));
    
    // Create a timestamp-based filename
    const timestamp = new Date().toISOString();
    const filePath = path.join(userDir, `${timestamp}.json`);

    // Save the proposal data
    fs.writeFileSync(filePath, JSON.stringify({
      userId,
      proposal,
      createdAt: timestamp,
    }, null, 2));

    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error('Failed to save proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get the latest proposal draft for a user
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDir = path.join(AI_INTAKE_BASE_PATH, userId);
    
    // Check if user directory exists
    if (!fs.existsSync(userDir)) {
      return NextResponse.json({ proposal: null });
    }

    // Get all JSON files in the directory
    const files = fs.readdirSync(userDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Sort by filename (which is a timestamp) in descending order
        return b.localeCompare(a);
      });

    if (files.length === 0) {
      return NextResponse.json({ proposal: null });
    }

    // Read the latest file
    const latestFile = path.join(userDir, files[0]);
    const content = fs.readFileSync(latestFile, 'utf-8');
    const data = JSON.parse(content);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
