import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const USERS_PATH = path.join(process.cwd(), 'data/users.json');

export async function GET() {
  try {
    const data = await readFile(USERS_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error loading users:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
