import { NextRequest, NextResponse } from 'next/server';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { file, entry } = await req.json();
    
    if (!file || !entry) {
      return NextResponse.json({ error: 'Missing file or entry' }, { status: 400 });
    }
    
    // Ensure the directory exists
    const filePath = path.join(process.cwd(), file);
    const dir = path.dirname(filePath);
    
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
    
    // Append the log entry
    await appendFile(filePath, entry + '\n');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to append log:', error);
    return NextResponse.json({ error: 'Failed to append log' }, { status: 500 });
  }
}
