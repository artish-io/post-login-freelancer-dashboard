import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const ORGANIZATIONS_PATH = path.join(process.cwd(), 'data/organizations.json');

export async function GET() {
  try {
    const data = await readFile(ORGANIZATIONS_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error loading organizations:', error);
    return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 });
  }
}
